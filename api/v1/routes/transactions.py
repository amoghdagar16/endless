"""
Transaction API routes for journal entries.
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_company_id, get_db
from app.schemas.transactions import (
    ConvertToJournalRequest,
    SimpleTransactionCreate,
    SimpleTransactionResponse,
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
)
from app.services.company import ensure_company
from app.services.transaction_service import TransactionService


router = APIRouter(prefix="/transactions", tags=["transactions"])


def _transaction_to_response(transaction) -> dict:
    """Convert Transaction model to response dict."""
    # Calculate totals
    total_debit = sum(line.debit for line in transaction.lines)
    total_credit = sum(line.credit for line in transaction.lines)
    
    # Convert lines
    lines = []
    for line in transaction.lines:
        lines.append({
            "id": str(line.id),
            "accountId": str(line.account_id),
            "accountNumber": line.account.number if line.account else "",
            "accountName": line.account.name if line.account else "",
            "debit": float(line.debit),
            "credit": float(line.credit),
            "memo": line.memo,
        })
    
    return {
        "id": str(transaction.id),
        "companyId": str(transaction.company_id),
        "date": transaction.date.isoformat(),
        "description": transaction.memo,  # memo maps to description in API
        "reference": transaction.doc_no,  # doc_no maps to reference in API
        "source": transaction.source,
        "status": transaction.status,
        "totalDebit": float(total_debit),
        "totalCredit": float(total_credit),
        "vendorName": transaction.vendor_name,  # From simple transactions
        "amount": float(transaction.amount) if transaction.amount else None,  # Original simple amount
        "lines": lines,
    }


@router.post("", status_code=201)
def create_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_data: TransactionCreate,
) -> dict:
    """Create a new transaction (journal entry)."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    # Convert lines to dict format
    lines = [
        {
            "account_id": str(line.account_id),
            "debit": float(line.debit),
            "credit": float(line.credit),
            "memo": line.memo,
        }
        for line in transaction_data.lines
    ]
    
    try:
        transaction = service.create_transaction(
            company_id=company_id,
            date=transaction_data.date,
            description=transaction_data.description,
            lines=lines,
            reference=transaction_data.reference,
            source=transaction_data.source,
        )
        
        return _transaction_to_response(transaction)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def list_transactions(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None, alias="dateFrom"),
    date_to: Optional[date] = Query(None, alias="dateTo"),
    account_id: Optional[uuid.UUID] = Query(None, alias="accountId"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100, alias="perPage"),
) -> dict:
    """List transactions with optional filters."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    result = service.list_transactions(
        company_id=company_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
        page=page,
        per_page=per_page,
    )
    
    return {
        "transactions": [_transaction_to_response(t) for t in result["transactions"]],
        "total": result["total"],
        "page": result["page"],
        "perPage": result["per_page"],
    }


# Simple Transaction Endpoints (User-friendly entry)
# NOTE: These must come BEFORE /{transaction_id} routes to avoid path conflicts

def _simple_transaction_to_response(transaction) -> dict:
    """Convert simple Transaction model to response dict."""
    # Check if transaction has lines (has been converted to journal)
    # Access lines attribute safely and check if it's actually populated
    try:
        has_lines = len(transaction.lines) > 0
    except:
        has_lines = False
    needs_review = not has_lines
    
    return {
        "id": str(transaction.id),
        "vendorName": transaction.vendor_name or "",
        "date": transaction.date.isoformat(),
        "amount": float(transaction.amount) if transaction.amount else 0,
        "description": transaction.memo or "",
        "reference": transaction.doc_no,
        "status": transaction.status,
        "source": transaction.source,
        "needsReview": needs_review,
        "createdAt": None,  # Add created_at if you add this field to the model
    }


@router.post("/simple", status_code=201)
def create_simple_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_data: SimpleTransactionCreate,
) -> dict:
    """Create a simple transaction entry (user-friendly)."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    try:
        transaction = service.create_simple_transaction(
            company_id=company_id,
            vendor_name=transaction_data.vendor_name,
            date=transaction_data.date,
            amount=transaction_data.amount,
            description=transaction_data.description,
            reference=transaction_data.reference,
        )
        
        return _simple_transaction_to_response(transaction)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simple")
def list_simple_transactions(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    status: Optional[str] = Query(None),
    needs_review: Optional[bool] = Query(None, alias="needsReview"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100, alias="perPage"),
) -> dict:
    """List simple transactions with optional filters."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    result = service.list_simple_transactions(
        company_id=company_id,
        status=status,
        needs_review=needs_review,
        page=page,
        per_page=per_page,
    )
    
    return {
        "transactions": [_simple_transaction_to_response(t) for t in result["transactions"]],
        "total": result["total"],
        "page": result["page"],
        "perPage": result["per_page"],
    }


@router.get("/simple/{transaction_id}")
def get_simple_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_id: uuid.UUID,
) -> dict:
    """Get a simple transaction by ID."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    transaction = service.get_transaction(transaction_id)
    
    # Verify transaction belongs to company
    if transaction.company_id != company_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Verify it's a simple entry
    if transaction.source != "simple_entry":
        raise HTTPException(status_code=400, detail="Not a simple transaction")
    
    return _simple_transaction_to_response(transaction)


@router.get("/{transaction_id}")
def get_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_id: uuid.UUID,
) -> dict:
    """Get a transaction by ID."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    transaction = service.get_transaction(transaction_id)
    
    # Verify transaction belongs to company
    if transaction.company_id != company_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return _transaction_to_response(transaction)


@router.put("/{transaction_id}")
def update_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_id: uuid.UUID,
    transaction_data: dict,
) -> dict:
    """Update a draft transaction."""
    ensure_company(db, company_id)

    service = TransactionService(db)

    # First check transaction exists and belongs to company
    existing = service.get_transaction(transaction_id)
    if existing.company_id != company_id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Extract and convert fields from dict
    date_val = None
    if "date" in transaction_data and transaction_data["date"]:
        # Parse date string to date object
        from datetime import datetime as dt
        date_str = transaction_data["date"]
        date_val = dt.strptime(date_str, "%Y-%m-%d").date() if isinstance(date_str, str) else date_str

    description_val = transaction_data.get("description")
    reference_val = transaction_data.get("reference")

    # Convert lines if provided
    lines = None
    if "lines" in transaction_data and transaction_data["lines"] is not None:
        lines = [
            {
                "account_id": line.get("accountId"),
                "debit": float(line.get("debit", 0)),
                "credit": float(line.get("credit", 0)),
                "memo": line.get("memo"),
            }
            for line in transaction_data["lines"]
        ]

    try:
        transaction = service.update_transaction(
            transaction_id=transaction_id,
            date=date_val,
            description=description_val,
            reference=reference_val,
            lines=lines,
        )

        return _transaction_to_response(transaction)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_id: uuid.UUID,
):
    """Delete a draft transaction."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    # First check transaction exists and belongs to company
    existing = service.get_transaction(transaction_id)
    if existing.company_id != company_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    service.delete_transaction(transaction_id)
    return  # 204 No Content - no body


@router.post("/{transaction_id}/post")
def post_transaction(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_id: uuid.UUID,
) -> dict:
    """Post a transaction (mark as final)."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    # First check transaction exists and belongs to company
    existing = service.get_transaction(transaction_id)
    if existing.company_id != company_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    try:
        transaction = service.post_transaction(transaction_id)
        return _transaction_to_response(transaction)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{transaction_id}/convert", status_code=200)
def convert_to_journal(
    *,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_company_id),
    transaction_id: uuid.UUID,
    convert_data: ConvertToJournalRequest,
) -> dict:
    """Convert a simple transaction to a journal entry with account assignments."""
    ensure_company(db, company_id)
    
    service = TransactionService(db)
    
    # First check transaction exists and belongs to company
    existing = service.get_transaction(transaction_id)
    if existing.company_id != company_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Convert lines to dict format
    lines = [
        {
            "account_id": str(line.account_id),
            "debit": float(line.debit),
            "credit": float(line.credit),
            "memo": line.memo,
        }
        for line in convert_data.lines
    ]
    
    try:
        transaction = service.convert_simple_to_journal(
            transaction_id=transaction_id,
            lines=lines,
        )
        
        return _transaction_to_response(transaction)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

