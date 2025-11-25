from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_company_id, get_db
from app.schemas.reports import (
    ProfitAndLossResponse,
    ProfitAndLossRow,
    TrialBalanceResponse,
    TrialBalanceRow,
)
from app.services.company import ensure_company
from app.services import reports


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/trial-balance", response_model=TrialBalanceResponse)
def trial_balance(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    as_of: date = Query(..., description="Report as-of date"),
) -> TrialBalanceResponse:
    ensure_company(db, company_id)
    tb = reports.trial_balance(db, company_id=company_id, as_of=as_of)
    rows = [
        TrialBalanceRow(
            account_number=row.account_number,
            name=row.name,
            type=row.type,
            debits=row.debits,
            credits=row.credits,
            net=row.net,
        )
        for row in tb.rows
    ]
    totals = {"debits": tb.total_debits, "credits": tb.total_credits}
    return TrialBalanceResponse(asOf=as_of, rows=rows, totals=totals)


@router.get("/balance-sheet", response_model=TrialBalanceResponse)
def balance_sheet(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    as_of: date = Query(..., description="Report as-of date"),
) -> TrialBalanceResponse:
    ensure_company(db, company_id)
    bs = reports.balance_sheet(db, company_id=company_id, as_of=as_of)
    rows = [
        TrialBalanceRow(
            account_number=row.account_number,
            name=row.name,
            type=row.type,
            debits=row.debits,
            credits=row.credits,
            net=row.net,
        )
        for row in bs.rows
    ]
    totals = {"debits": bs.total_debits, "credits": bs.total_credits}
    return TrialBalanceResponse(asOf=as_of, rows=rows, totals=totals)


@router.get("/pnl", response_model=ProfitAndLossResponse)
def profit_and_loss(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    start: date = Query(...),
    end: date = Query(...),
) -> ProfitAndLossResponse:
    ensure_company(db, company_id)
    pnl = reports.profit_and_loss(db, company_id=company_id, start=start, end=end)
    rows = [
        ProfitAndLossRow(
            account_number=row.account_number,
            name=row.name,
            type=row.type,
            amount=row.amount,
        )
        for row in pnl.rows
    ]
    return ProfitAndLossResponse(start=start, end=end, rows=rows, netIncome=pnl.net_income)
