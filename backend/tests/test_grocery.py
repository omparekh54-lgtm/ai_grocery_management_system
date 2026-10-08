import os
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import date, timedelta
from types import SimpleNamespace as Obj
import pytest
from fastapi.testclient import TestClient

TMP = TemporaryDirectory()
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(TMP.name) / "test.db")
from app.main import app, local_today
from app.db import Base, engine
from app.forecast import calculate, estimate_rate, convert, month_bounds


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        r = c.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "local-password-123",
                "name": "Test",
                "household_name": "Test Kitchen",
            },
        )
        assert r.status_code == 200, r.text
        yield c


def item(c, **extra):
    r = c.post(
        "/items",
        json={"name": "Rice", "unit": "kg", "weekly_use": 7, "pack_size": 1, **extra},
    )
    assert r.status_code == 200, r.text
    return r.json()


def batch(c, i, q=2, **extra):
    r = c.post(
        f'/items/{i["id"]}/batches',
        json={
            "quantity": q,
            "unit": "kg",
            "purchased": str(local_today() - timedelta(days=10)),
            "location": "Pantry",
            **extra,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_auth_and_household_isolation(client):
    i = item(client)
    with TestClient(app) as other:
        assert other.get("/items").status_code == 401
        assert (
            other.post(
                "/auth/register",
                json={
                    "email": "other@example.com",
                    "password": "local-password-123",
                    "name": "Other",
                },
            ).status_code
            == 200
        )
        assert other.get("/items").json() == []
        assert (
            other.patch(
                "/items/" + i["id"], json={"name": "Stolen", "unit": "kg"}
            ).status_code
            == 404
        )
    assert client.post("/auth/logout").status_code == 200
    assert client.get("/me").status_code == 401
    assert (
        client.post(
            "/auth/login", json={"email": "test@example.com", "password": "wrong"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "local-password-123"},
        ).status_code
        == 200
    )


def test_units_fefo_expiry_waste(client):
    i = item(client)
    today = local_today()
    batch(client, i, 2, expiry=str(today + timedelta(days=20)))
    b = batch(client, i, 1000, unit="g", expiry=str(today + timedelta(days=2)))
    soon = next(
        x["id"] for x in b["batches"] if x["expiry"] == str(today + timedelta(days=2))
    )
    r = client.post(
        f'/items/{i["id"]}/usage',
        json={"quantity": 500, "unit": "g", "day": str(today), "kind": "consume"},
    )
    assert r.status_code == 200
    assert r.json()["stock"] == 2.5
    assert next(x for x in r.json()["batches"] if x["id"] == soon)["quantity"] == 0.5
    before = r.json()["stock"]
    assert (
        client.post(
            f'/items/{i["id"]}/usage',
            json={"quantity": 1, "unit": "L", "day": str(today), "kind": "consume"},
        ).status_code
        == 400
    )
    assert client.get("/items").json()[0]["stock"] == before
    assert (
        client.post(
            f'/items/{i["id"]}/usage',
            json={"quantity": 100, "unit": "kg", "day": str(today), "kind": "consume"},
        ).status_code
        == 400
    )
    expired = batch(client, i, 1, expiry=str(today - timedelta(days=1)))
    assert expired["expired_stock"] == 1
    assert (
        client.post(
            f'/items/{i["id"]}/usage',
            json={"quantity": 3, "unit": "kg", "day": str(today), "kind": "consume"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            f'/items/{i["id"]}/usage',
            json={"quantity": 1, "unit": "kg", "day": str(today), "kind": "waste"},
        ).status_code
        == 200
    )
    assert client.get("/items").json()[0]["expired_stock"] == 0


def test_atomic_create_and_receipt(client):
    bad = {
        "quantity": 2,
        "unit": "L",
        "purchased": str(local_today()),
        "location": "Fridge",
    }
    assert (
        client.post(
            "/items", json={"name": "Rice", "unit": "kg", "opening_stock": bad}
        ).status_code
        == 400
    )
    assert client.get("/items").json() == []
    i = item(client)
    payload = {
        "reference": "receipt-0001",
        "purchased": str(local_today()),
        "location": "Pantry",
        "lines": [
            {"name": "Apple", "quantity": 2, "unit": "pcs", "total_price": 60},
            {"name": "Rice", "quantity": 1, "unit": "L", "total_price": 30},
        ],
    }
    assert client.post("/receipts/import", json=payload).status_code == 400
    assert len(client.get("/items").json()) == 1
    payload["lines"][1]["unit"] = "kg"
    assert client.post("/receipts/import", json=payload).status_code == 200
    stock = sum(x["stock"] for x in client.get("/items").json())
    assert client.post("/receipts/import", json=payload).status_code == 409
    assert sum(x["stock"] for x in client.get("/items").json()) == stock


def test_history_dedup_and_confirmation(client):
    i = item(client)
    d = str(local_today() - timedelta(days=1))
    rows = [
        {
            "item_id": i["id"],
            "day": d,
            "quantity": 1000,
            "unit": "g",
            "complete_day": True,
        }
    ]
    assert client.post("/history/import", json={"rows": rows}).json()["inserted"] == 1
    assert client.post("/history/import", json={"rows": rows}).json()["skipped"] == 1
    assert client.get("/items").json()[0]["stock"] == 0
    batch(client, i)
    assert (
        client.post(
            "/items/" + i["id"] + "/usage",
            json={"quantity": 1, "unit": "kg", "day": d, "kind": "consume"},
        ).status_code
        == 400
    )
    f = client.get("/forecast").json()["rows"][0]
    assert f["confirmed_days"] == 1 and f["basis"] == "history"
    assert (
        client.post("/tracking/confirm", json={"day": str(local_today())}).status_code
        == 400
    )
    assert client.post("/items/" + i["id"] + "/archive").status_code == 200
    assert client.get("/items").json() == []
    assert len(client.get("/items/archived/list").json()) == 1
    assert client.post("/items/" + i["id"] + "/restore").status_code == 200
    assert len(client.get("/items").json()) == 1


def test_shopping_edits_not_stock(client):
    i = item(client)
    assert client.post("/shopping/generate").status_code == 200
    row = client.get("/shopping").json()[0]
    assert (
        client.patch(
            "/shopping/" + row["id"], json={"quantity": 5, "checked": True}
        ).status_code
        == 200
    )
    assert client.post("/shopping/generate").status_code == 200
    assert client.get("/shopping").json()[0]["quantity"] == 5
    assert client.get("/items").json()[0]["stock"] == 0


def test_forecast_month_stock_buffer_and_waste():
    i = Obj(
        id="a",
        name="Rice",
        unit="kg",
        category="Grains",
        weekly_use=7,
        pack_size=1,
        shelf_days=30,
        price_per_unit=60,
    )
    h = Obj(demand_multiplier=1, buffer_percent=10)
    t = date(2026, 1, 31)
    r = calculate(i, [], [], [], h, t)
    assert r["days"] == 28 and r["recommended_purchase"] == 31
    plenty = Obj(quantity=100, purchased="2026-01-01", expiry=None)
    assert calculate(i, [plenty], [], [], h, t)["recommended_purchase"] == 0
    expiry = Obj(quantity=100, purchased="2026-01-01", expiry="2026-02-01")
    expiring = calculate(i, [expiry], [], [], h, t)
    assert expiring["recommended_purchase"] == 30
    assert expiring["days_left"] == 2
    assert month_bounds(date(2027, 12, 30))[0] == date(2028, 1, 1)
    assert month_bounds(date(2028, 1, 30))[2] == 29
    days = [t - timedelta(days=n) for n in range(1, 29)]
    moves = [Obj(day=str(d), kind="consume", quantity=1) for d in days] + [
        Obj(day=str(d), kind="waste", quantity=100) for d in days
    ]
    rate, model, known, coverage, learned = estimate_rate(i, moves, days, t)
    assert rate == pytest.approx(1) and known == 28 and learned
    # Partial, unconfirmed logs must not enter the learned denominator or totals.
    assert (
        estimate_rate(
            i,
            [Obj(day=str(t - timedelta(days=1)), kind="consume", quantity=100)],
            [],
            t,
        )[0]
        == 1
    )
    intermittent = [
        Obj(day=str(d), kind="consume", quantity=2 if k % 5 == 0 else 0)
        for k, d in enumerate(sorted(days))
    ]
    assert estimate_rate(i, intermittent, days, t)[0] >= 0
    assert convert(1000, "g", "kg") == 1
    with pytest.raises(ValueError):
        convert(1, "kg", "L")


def test_ai_optional_origin_guard_and_batch_atomicity(client):
    assert client.get("/me").json()["ai_available"] == False
    assert client.post("/assist/receipt", json={"text": "Rice 1kg"}).status_code == 503
    assert (
        client.post(
            "/items",
            headers={"origin": "https://evil.example"},
            json={"name": "Rice", "unit": "kg"},
        ).status_code
        == 403
    )
    i = batch(client, item(client))
    b = i["batches"][0]
    assert (
        client.patch(
            "/batches/" + b["id"], json={"location": "Changed", "expiry": "2000-01-01"}
        ).status_code
        == 400
    )
    assert client.get("/items").json()[0]["batches"][0]["location"] == "Pantry"


def test_offline_catalog_and_optional_barcode_cache(client, monkeypatch):
    import httpx
    from app import main

    calls = []

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, **kwargs):
            calls.append(url)
            return httpx.Response(
                200,
                json={
                    "status": 1,
                    "product": {
                        "product_name": "Verified milk",
                        "quantity": "1 L",
                        "brands": "Example",
                    },
                },
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", FakeClient)
    assert any(x["name"] == "Milk" for x in client.get("/catalog?q=milk").json())
    assert client.get("/catalog/barcode/not-a-barcode").status_code == 400
    r = client.get("/catalog/barcode/12345678")
    assert r.status_code == 200 and r.json()["source"] == "Open Food Facts"
    assert client.get("/catalog/barcode/12345678").status_code == 200
    assert len(calls) == 1
    assert client.get("/catalog/usda?q=milk").status_code == 503


def test_confirmed_zero_days_and_invitations(client):
    i = Obj(weekly_use=0)
    today = local_today()
    days = [today - timedelta(days=n) for n in range(1, 8)]
    moves = [Obj(day=str(days[0]), kind="consume", quantity=14)]
    assert estimate_rate(i, moves, days, today)[0] == 2
    assert estimate_rate(i, moves, [days[0]], today)[0] == 14
    code = client.post("/household/invite").json()["code"]
    with TestClient(app) as other:
        assert (
            other.post(
                "/auth/register",
                json={
                    "email": "member@example.com",
                    "password": "local-password-123",
                    "name": "Member",
                },
            ).status_code
            == 200
        )
        assert other.post("/household/join", json={"code": code}).status_code == 200
        assert other.get("/me").json()["owner"] == False
        assert other.post("/household/join", json={"code": code}).status_code == 400
        assert other.post("/household/invite").status_code == 403
        assert (
            other.patch(
                "/household",
                json={
                    "name": "Changed",
                    "city": "",
                    "size": 2,
                    "currency": "INR",
                    "buffer_percent": 10,
                    "demand_multiplier": 1,
                },
            ).status_code
            == 403
        )
