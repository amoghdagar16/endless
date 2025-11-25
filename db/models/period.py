from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.types import PeriodStatus


class Period(Base):
    __tablename__ = "periods"
    __table_args__ = (
        UniqueConstraint("company_id", "start", "end", name="uq_periods_company_dates"),
        CheckConstraint("start <= \"end\"", name="ck_periods_date_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    start: Mapped[date] = mapped_column(Date, nullable=False)
    end: Mapped[date] = mapped_column("end", Date, nullable=False)
    status: Mapped[PeriodStatus] = mapped_column(
        Enum(PeriodStatus, name="period_status", create_type=False),
        nullable=False,
        default=PeriodStatus.OPEN,
    )
