from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.types import AccountType


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("company_id", "number", name="uq_accounts_company_number"),
        Index("ix_accounts_company_type", "company_id", "type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    number: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="account_type", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    detail_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    opening_balance: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    opening_balance_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    parent: Mapped["Account"] = relationship("Account", remote_side="Account.id", backref="children")
