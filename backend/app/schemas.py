from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

Unit = Literal["kg", "g", "L", "ml", "pcs"]


class Register(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    household_name: str = Field(min_length=1, max_length=80, default="My kitchen")

    @field_validator("email")
    @classmethod
    def email_valid(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1] or any(c.isspace() for c in v):
            raise ValueError("Enter a valid email.")
        return v


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class Preferences(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    city: str = Field(default="", max_length=80)
    size: int = Field(ge=1, le=30)
    currency: Literal["INR", "USD", "EUR", "GBP"]
    buffer_percent: float = Field(ge=0, le=50)
    demand_multiplier: float = Field(ge=0, le=3)


class ItemInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(max_length=40, default="Other")
    unit: Unit
    location: str = Field(min_length=1, max_length=100, default="Pantry")
    weekly_use: float = Field(ge=0, le=100000, default=0)
    pack_size: float = Field(gt=0, le=100000, default=1)
    price_per_unit: float = Field(ge=0, le=1000000, default=0)
    shelf_days: int = Field(ge=1, le=730, default=30)
    barcode: str = Field(max_length=32, default="")
    source: str = Field(max_length=40, default="manual")
    source_id: str = Field(max_length=100, default="")
    source_url: str = Field(max_length=500, default="")

    @field_validator("name", "location")
    @classmethod
    def nonblank(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("A name and location are required.")
        return v


class BatchInput(BaseModel):
    quantity: float = Field(gt=0, le=1000000)
    unit: Unit
    purchased: date
    expiry: date | None = None
    location: str = Field(min_length=1, max_length=100)
    cost: float = Field(ge=0, le=1000000, default=0)


class UsageInput(BaseModel):
    quantity: float = Field(gt=0, le=1000000)
    unit: Unit
    kind: Literal["consume", "waste"]
    day: date
    note: str = Field(max_length=300, default="")


class CountInput(BaseModel):
    quantity: float = Field(ge=0, le=1000000)
    unit: Unit
    reason: Literal["consume", "waste", "correction"]


class ShopInput(BaseModel):
    quantity: float = Field(ge=0, le=1000000)
    checked: bool = False


class HistoryRow(BaseModel):
    item_id: str
    day: date
    quantity: float = Field(ge=0, le=1000000)
    unit: Unit
    complete_day: bool = False


class HistoryImport(BaseModel):
    rows: list[HistoryRow] = Field(min_length=1, max_length=500)


class ReceiptInput(BaseModel):
    text: str = Field(default="", max_length=12000)
    image_base64: str = Field(default="", max_length=2800000)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"] = "image/jpeg"


class ReceiptLine(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    quantity: float = Field(gt=0, le=100000)
    unit: Unit
    total_price: float = Field(ge=0, le=1000000)


class ReceiptResult(BaseModel):
    lines: list[ReceiptLine] = Field(max_length=50)
    note: str = Field(max_length=1000)


class ReceiptSave(BaseModel):
    reference: str = Field(min_length=8, max_length=200)
    purchased: date
    location: str = Field(min_length=1, max_length=100)
    lines: list[ReceiptLine] = Field(min_length=1, max_length=50)


class ItemCreate(ItemInput):
    opening_stock: BatchInput | None = None


class BatchEdit(BaseModel):
    location: str = Field(min_length=1, max_length=100)
    expiry: date | None = None
