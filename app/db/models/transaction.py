from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text, cast
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UserDefinedType

from app.db.base import Base
from app.db.models.types import TransactionSource


# Custom type to handle PostgreSQL enum casting
class TxnSourceType(UserDefinedType):
    cache_ok = True
    
    def get_col_spec(self):
        return "txn_source"
    
    def bind_processor(self, dialect):
        def process(value):
            if value is not None:
                # If it's already a string, return it
                if isinstance(value, str):
                    return value
                # If it's an enum, get its value
                return value.value if hasattr(value, 'value') else str(value)
            return value
        return process


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_company_date", "company_id", "date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(TxnSourceType, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    doc_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)
    exchange_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 6), nullable=True)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    lines = relationship("TransactionLine", back_populates="transaction", cascade="all, delete-orphan")
