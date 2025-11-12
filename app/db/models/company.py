from __future__ import annotations

import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    fiscal_year_start_month: Mapped[int] = mapped_column(nullable=False, default=1)
    accounting_method: Mapped[str] = mapped_column(String(32), nullable=False, default="accrual")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
