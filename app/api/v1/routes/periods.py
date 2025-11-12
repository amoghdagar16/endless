from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_company_id, get_db
from app.schemas.periods import PeriodCommand as PeriodCommandSchema, PeriodResponse
from app.services.company import ensure_company
from app.services.periods import PeriodCommand, lock_period, soft_close_period


router = APIRouter(prefix="/periods", tags=["periods"])


@router.post("/soft-close", response_model=PeriodResponse)
def soft_close(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    payload: PeriodCommandSchema,
) -> PeriodResponse:
    ensure_company(db, company_id)
    period = soft_close_period(
        db,
        company_id=company_id,
        command=PeriodCommand(start=payload.start, end=payload.end),
    )
    return PeriodResponse(start=period.start, end=period.end, status=period.status.value)


@router.post("/lock", response_model=PeriodResponse)
def lock(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    payload: PeriodCommandSchema,
) -> PeriodResponse:
    ensure_company(db, company_id)
    period = lock_period(
        db,
        company_id=company_id,
        command=PeriodCommand(start=payload.start, end=payload.end),
    )
    return PeriodResponse(start=period.start, end=period.end, status=period.status.value)
