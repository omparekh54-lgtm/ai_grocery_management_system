from datetime import date, timedelta
from math import ceil, isfinite
import statistics

UNITS = {
    "kg": ("mass", 1000),
    "g": ("mass", 1),
    "L": ("volume", 1000),
    "ml": ("volume", 1),
    "pcs": ("count", 1),
}


def convert(quantity, source, target):
    if (
        source not in UNITS
        or target not in UNITS
        or UNITS[source][0] != UNITS[target][0]
    ):
        raise ValueError(
            "Choose a compatible unit. Weight, volume and pieces cannot be mixed."
        )
    value = float(quantity) * UNITS[source][1] / UNITS[target][1]
    if not isfinite(value):
        raise ValueError("Quantity must be a finite number.")
    return round(value, 6)


def month_bounds(today):
    start = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return start, end, (end - start).days


def estimate_rate(item, movements, observed_days, today):
    start = today - timedelta(days=56)
    days = sorted({d for d in observed_days if start <= d < today})
    by_day = {d: 0.0 for d in days}
    for m in movements:
        d = date.fromisoformat(m.day)
        if m.kind in ["consume", "history"] and d in by_day:
            by_day[d] += m.quantity
    if not days:
        return item.weekly_use / 7, "Your weekly estimate", 0, 0, False
    values = [by_day[d] for d in days]
    # Only complete days enter the model. Unconfirmed days never become zeros.
    mean = sum(values) / len(values)
    if len(days) < 7:
        fallback = item.weekly_use / 7
        rate = (
            (mean * len(days) + fallback * (7 - len(days))) / 7
            if fallback > 0
            else mean
        )
        return (
            rate,
            "Limited confirmed history",
            len(days),
            round(len(days) / 56 * 100),
            True,
        )
    recent = values[-28:]
    rate = sum(recent) / len(recent)
    model = "Confirmed-day average"
    contiguous = (
        all((b - a).days == 1 for a, b in zip(days[-28:], days[-27:]))
        if len(days) >= 28
        else all((b - a).days == 1 for a, b in zip(days, days[1:]))
    )
    if len(recent) >= 21 and contiguous:
        # Compare on a held-out final week rather than assuming an advanced model is better.
        import numpy as np
        from statsforecast.models import SimpleExponentialSmoothingOptimized, CrostonSBA

        train = np.array(recent[:-7], dtype=float)
        test = np.array(recent[-7:], dtype=float)
        candidates = [("Confirmed-day average", None)]
        if sum(x == 0 for x in train) / len(train) > 0.35:
            candidates.append(("Croston intermittent-demand model", CrostonSBA()))
        else:
            candidates.append(
                ("Exponential smoothing", SimpleExponentialSmoothingOptimized())
            )
        best_error = float("inf")
        for label, candidate in candidates:
            try:
                pred = (
                    np.repeat(train.mean(), 7)
                    if candidate is None
                    else candidate.forecast(y=train, h=7)["mean"]
                )
                err = float(np.mean(np.abs(test - pred)))
                if isfinite(err) and err < best_error:
                    full = np.array(recent, dtype=float)
                    value = (
                        float(full.mean())
                        if candidate is None
                        else float(np.mean(candidate.forecast(y=full, h=31)["mean"]))
                    )
                    if isfinite(value):
                        rate = max(0, value)
                        model = label
                        best_error = err
            except (ValueError, ZeroDivisionError, RuntimeError):
                continue
    return rate, model, len(days), round(len(days) / 56 * 100), True


def calculate(item, batches, movements, observed_days, household, today=None):
    today = today or date.today()
    start, end, n = month_bounds(today)
    rate, model, known, coverage, learned = estimate_rate(
        item, movements, observed_days, today
    )
    rate = max(0, rate * household.demand_multiplier)
    # Simulate FEFO stock use until next month; expired stock cannot offset demand.
    remaining = [
        {"q": b.quantity, "expiry": date.fromisoformat(b.expiry) if b.expiry else None}
        for b in sorted(batches, key=lambda b: (b.expiry or "9999-12-31", b.purchased))
        if b.quantity > 0
    ]
    coverage_days = 0.0
    if rate > 0:
        for b in remaining:
            lifetime = (
                float("inf")
                if b["expiry"] is None
                else max(0, (b["expiry"] - today).days + 1 - coverage_days)
            )
            coverage_days += min(b["q"] / rate, lifetime)

    def use(day, need):
        for b in remaining:
            if b["expiry"] is not None and b["expiry"] < day:
                b["q"] = 0
            take = min(b["q"], need)
            b["q"] -= take
            need -= take
        return max(0, need)

    d = today
    while d < start:
        use(d, rate)
        d += timedelta(days=1)
    opening = sum(
        b["q"] for b in remaining if b["expiry"] is None or b["expiry"] >= start
    )
    total = round(rate * n, 3)
    unmet = 0.0
    d = start
    while d < end:
        unmet += use(d, rate)
        d += timedelta(days=1)
    buffer = round(total * household.buffer_percent / 100, 3)
    ending = sum(b["q"] for b in remaining if b["expiry"] is None or b["expiry"] >= end)
    raw = max(0, unmet + buffer - ending) if total > 0 else 0
    purchase = (
        round(ceil(round(raw / item.pack_size, 9)) * item.pack_size, 6)
        if raw > 0
        else 0
    )
    purchase_period = max(1, min(item.shelf_days, n))
    visits = ceil(n / purchase_period) if purchase > 0 else 0
    per_visit = (
        ceil(
            (rate * purchase_period * (1 + household.buffer_percent / 100))
            / item.pack_size
        )
        * item.pack_size
        if rate > 0
        else 0
    )
    days_left = round(coverage_days, 1) if rate > 0 else None
    runout = (
        (today + timedelta(days=max(0, int(days_left or 0)))).isoformat()
        if days_left is not None
        else None
    )
    explanation = (
        f"{model}: {round(rate,3)} {item.unit}/day × {n} days. Expected opening stock: {round(opening,3)} {item.unit}. "
        f"Includes {household.buffer_percent:g}% buffer; rounded to {item.pack_size:g} {item.unit} packs. Expiry dates are considered day by day."
    )
    if not known:
        explanation += (
            " Log usage and confirm complete days to learn from your household."
        )
    return {
        "item_id": item.id,
        "name": item.name,
        "unit": item.unit,
        "category": item.category,
        "month": start.strftime("%B %Y"),
        "cycle": start.isoformat(),
        "days": n,
        "daily_rate": round(rate, 4),
        "predicted_consumption": total,
        "opening_stock": round(opening, 3),
        "stock_offset": round(max(0, total - unmet), 3),
        "buffer": buffer,
        "recommended_purchase": purchase,
        "estimated_cost": round(purchase * item.price_per_unit, 2),
        "cost_known": item.price_per_unit > 0,
        "model": model,
        "confirmed_days": known,
        "coverage": coverage,
        "basis": "history" if learned else "estimate",
        "days_left": days_left,
        "runout_date": runout,
        "purchase_interval_days": purchase_period,
        "planned_visits": visits,
        "suggested_per_visit": round(per_visit, 3),
        "explanation": explanation,
    }
