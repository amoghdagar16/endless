from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_company_id, get_db
from app.schemas.transactions import (
    GetOpeningBalancesResponse,
    OpeningBalanceRequest,
    OpeningBalanceResponse,
    SetOpeningBalancesRequest,
)
from app.services.company import ensure_company
from app.services.opening_balances_service import OpeningBalancesService
from app.services.posting import create_opening_balance_txn


router = APIRouter(prefix="/opening-balances", tags=["opening_balances"])


@router.post("/apply", response_model=OpeningBalanceResponse)
def apply_opening_balances(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    payload: OpeningBalanceRequest,
) -> OpeningBalanceResponse:
    """Legacy endpoint: Apply opening balances from account.opening_balance field."""
    ensure_company(db, company_id)

    summary = create_opening_balance_txn(
        db,
        company_id=company_id,
        as_of_date=payload.as_of,
        replace=payload.replace,
    )

    return OpeningBalanceResponse(
        transaction_id=str(summary.transaction_id),
        total_debits=summary.total_debits,
        total_credits=summary.total_credits,
    )


@router.post("", status_code=201)
def set_opening_balances(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    payload: SetOpeningBalancesRequest,
) -> dict:
    """
    Set opening balances for balance sheet accounts.

    Creates a transaction with source='opening_balance' and posts it immediately.
    Replaces any existing opening balance transaction.
    """
    ensure_company(db, company_id)

    service = OpeningBalancesService(db)

    # Convert balances to dict format
    balances = [
        {
            "account_id": str(balance.account_id),
            "balance": float(balance.balance),
            "memo": balance.memo,
        }
        for balance in payload.balances
    ]

    try:
        transaction = service.set_opening_balances(
            company_id=company_id,
            balances=balances,
            as_of_date=payload.as_of_date,
        )

        # Calculate totals
        total_debit = sum(line.debit for line in transaction.lines)
        total_credit = sum(line.credit for line in transaction.lines)

        return {
            "transactionId": str(transaction.id),
            "asOfDate": transaction.date.isoformat(),
            "totalDebit": float(total_debit),
            "totalCredit": float(total_credit),
            "lineCount": len(transaction.lines),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=GetOpeningBalancesResponse)
def get_opening_balances(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
) -> GetOpeningBalancesResponse:
    """
    Get current opening balances.

    Returns the opening balance transaction and list of account balances.
    """
    ensure_company(db, company_id)

    service = OpeningBalancesService(db)
    result = service.get_opening_balances(company_id)

    return GetOpeningBalancesResponse(**result)
