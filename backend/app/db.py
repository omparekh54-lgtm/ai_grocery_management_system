from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (
    create_engine,
    String,
    Float,
    Integer,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Text,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import settings


def uid():
    return str(uuid4())


def now():
    return datetime.now(timezone.utc).isoformat()


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args=(
        {"check_same_thread": False}
        if settings.database_url.startswith("sqlite")
        else {}
    ),
    pool_pre_ping=True,
)
if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def sqlite_setup(dbapi, _):
        dbapi.execute("PRAGMA foreign_keys=ON")
        dbapi.execute("PRAGMA busy_timeout=10000")


SessionLocal = sessionmaker(engine, expire_on_commit=False)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(300))
    demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Household(Base):
    __tablename__ = "households"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(80), default="")
    size: Mapped[int] = mapped_column(Integer, default=1)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    buffer_percent: Mapped[float] = mapped_column(Float, default=10)
    demand_multiplier: Mapped[float] = mapped_column(Float, default=1)
    created: Mapped[str] = mapped_column(String(40), default=now)


class Member(Base):
    __tablename__ = "members"
    household_id: Mapped[str] = mapped_column(
        ForeignKey("households.id"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    owner: Mapped[bool] = mapped_column(Boolean, default=False)


class LoginSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"))
    expires: Mapped[float] = mapped_column(Float)


class Invite(Base):
    __tablename__ = "invites"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"))
    expires: Mapped[float] = mapped_column(Float)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class Item(Base):
    __tablename__ = "items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(40), default="Other")
    unit: Mapped[str] = mapped_column(String(8))
    location: Mapped[str] = mapped_column(String(100), default="Pantry")
    weekly_use: Mapped[float] = mapped_column(Float, default=0)
    pack_size: Mapped[float] = mapped_column(Float, default=1)
    price_per_unit: Mapped[float] = mapped_column(Float, default=0)
    shelf_days: Mapped[int] = mapped_column(Integer, default=30)
    barcode: Mapped[str] = mapped_column(String(32), default="")
    source: Mapped[str] = mapped_column(String(40), default="manual")
    source_id: Mapped[str] = mapped_column(String(100), default="")
    source_url: Mapped[str] = mapped_column(String(500), default="")
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created: Mapped[str] = mapped_column(String(10))


class Batch(Base):
    __tablename__ = "batches"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    initial_quantity: Mapped[float] = mapped_column(Float)
    location: Mapped[str] = mapped_column(String(100))
    purchased: Mapped[str] = mapped_column(String(10))
    expiry: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0)


class Movement(Base):
    __tablename__ = "movements"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"), index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    batch_id: Mapped[str | None] = mapped_column(
        ForeignKey("batches.id"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[float] = mapped_column(Float)
    day: Mapped[str] = mapped_column(String(10), index=True)
    cost: Mapped[float] = mapped_column(Float, default=0)
    note: Mapped[str] = mapped_column(String(300), default="")
    import_hash: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )


class Observation(Base):
    __tablename__ = "observations"
    household_id: Mapped[str] = mapped_column(
        ForeignKey("households.id"), primary_key=True
    )
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)


class Shopping(Base):
    __tablename__ = "shopping"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"), index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"))
    quantity: Mapped[float] = mapped_column(Float)
    checked: Mapped[bool] = mapped_column(Boolean, default=False)
    cycle: Mapped[str] = mapped_column(String(10))
    __table_args__ = (UniqueConstraint("household_id", "item_id", "cycle"),)


class Limit(Base):
    __tablename__ = "usage_limits"
    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)


class Cache(Base):
    __tablename__ = "product_cache"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    data: Mapped[str] = mapped_column(Text)
    expires: Mapped[float] = mapped_column(Float)


class ReceiptImport(Base):
    __tablename__ = "receipt_imports"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"))
    created: Mapped[str] = mapped_column(String(40), default=now)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise
