from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ValidationError
from app.db.models.period import Period
from app.db.models.types import PeriodStatus
from app.services.audit import log_action


@dataclass
class PeriodCommand:
    start: date
    end: date


def soft_close_period(
    session: Session,
    *,
    company_id: uuid.UUID,
    command: PeriodCommand,
    actor_id: uuid.UUID | None = None,
) -> Period:
    _validate_dates(command)
    period = _get_or_create_period(session, company_id, command)

    if period.status == PeriodStatus.LOCKED:
        raise ConflictError("Period already locked")

    period.status = PeriodStatus.SOFT_CLOSED
    session.flush()

    log_action(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action="period_soft_closed",
        entity="period",
        entity_id=period.id,
        before=None,
        after={"status": period.status.value},
    )

    session.commit()
    return period


def lock_period(
    session: Session,
    *,
    company_id: uuid.UUID,
    command: PeriodCommand,
    actor_id: uuid.UUID | None = None,
) -> Period:
    _validate_dates(command)
    _ensure_no_overlap(session, company_id, command.start, command.end)
    period = _get_or_create_period(session, company_id, command)
    period.status = PeriodStatus.LOCKED
    session.flush()

    log_action(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action="period_locked",
        entity="period",
        entity_id=period.id,
        before=None,
        after={"status": period.status.value},
    )

    session.commit()
    return period


def _validate_dates(command: PeriodCommand) -> None:
    if command.start > command.end:
        raise ValidationError("start must be on or before end")


def _get_or_create_period(session: Session, company_id: uuid.UUID, command: PeriodCommand) -> Period:
    period = session.execute(
        select(Period)
        .where(Period.company_id == company_id)
        .where(Period.start == command.start)
        .where(Period.end == command.end)
    ).scalar_one_or_none()

    if period:
        return period

    period = Period(
        company_id=company_id,
        start=command.start,
        end=command.end,
        status=PeriodStatus.OPEN,
    )
    session.add(period)
    session.flush()
    return period


def _ensure_no_overlap(session: Session, company_id: uuid.UUID, start: date, end: date) -> None:
    overlap = session.execute(
        select(Period)
        .where(Period.company_id == company_id)
        .where(Period.status == PeriodStatus.LOCKED)
        .where(and_(Period.start <= end, Period.end >= start))
    ).scalar_one_or_none()

    if overlap:
        raise ConflictError("Overlapping locked period exists")
