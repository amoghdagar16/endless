from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TransactionLine(Base):
    __tablename__ = "transaction_lines"
    __table_args__ = (
        CheckConstraint(
            "(debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0)",
            name="ck_transaction_lines_debit_credit",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)

    transaction = relationship("Transaction", back_populates="lines")
    account = relationship("Account")
