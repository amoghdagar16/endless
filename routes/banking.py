"""
Banking: connections, accounts, transactions (Step 4 connect bank, Step 5 categorize).
Schema: bank_connections, bank_accounts, bank_transactions, bank_transaction_splits,
        bank_rules, bank_transaction_matches.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from database import supabase
from middleware.auth import get_current_user_company

router = APIRouter(prefix="/bank", tags=["Banking"])


# ---------- Connections ----------
@router.get("/connections")
async def list_connections(auth: Dict[str, str] = Depends(get_current_user_company)):
    """List bank connections for the company."""
    cid = auth["company_id"]
    r = supabase.table("bank_connections").select("*").eq("company_id", cid).execute()
    return r.data or []


@router.post("/connections")
async def create_connection(
    body: dict,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Create a bank connection (e.g. after Plaid link). Stub: store institution_name, status."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "institution_name": body.get("institution_name", "Manual"),
        "status": body.get("status", "active"),
        "provider": body.get("provider", "plaid"),
    }
    r = supabase.table("bank_connections").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create connection")
    return r.data[0]


# ---------- Bank Accounts ----------
@router.get("/accounts")
async def list_bank_accounts(auth: Dict[str, str] = Depends(get_current_user_company)):
    """List bank accounts (checking, credit card, etc.) with optional linked GL account."""
    cid = auth["company_id"]
    r = supabase.table("bank_accounts")\
        .select("*, accounts(id, account_code, account_name)")\
        .eq("company_id", cid)\
        .execute()
    return r.data or []


@router.patch("/accounts/{account_id}")
async def update_bank_account(
    account_id: str,
    body: dict,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Update bank account (e.g. link to GL account: linked_account_id)."""
    cid = auth["company_id"]
    allowed = {"name", "linked_account_id", "is_active", "type"}
    data = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No allowed fields to update")
    r = supabase.table("bank_accounts")\
        .update(data)\
        .eq("id", account_id)\
        .eq("company_id", cid)\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return r.data[0]


# ---------- Bank Transactions ----------
@router.get("/transactions")
async def list_transactions(
    bank_account_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """List bank transactions (unreviewed first for categorization flow)."""
    cid = auth["company_id"]
    q = supabase.table("bank_transactions").select("*").eq("company_id", cid)
    if bank_account_id:
        q = q.eq("bank_account_id", bank_account_id)
    if status:
        q = q.eq("status", status)
    r = q.order("posted_date", desc=True).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return r.data or []


class CategorizeTransactionBody(BaseModel):
    user_selected_account_id: Optional[str] = None
    suggested_account_id: Optional[str] = None
    status: Optional[str] = None  # unreviewed | reviewed | matched | excluded
    memo: Optional[str] = None


@router.patch("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    body: CategorizeTransactionBody,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Categorize a bank transaction (select bucket / approve)."""
    cid = auth["company_id"]
    data = body.dict(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    r = supabase.table("bank_transactions")\
        .update(data)\
        .eq("id", transaction_id)\
        .eq("company_id", cid)\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return r.data[0]


class CreateTransactionBody(BaseModel):
    bank_account_id: str
    posted_date: str
    name: str
    amount: float
    merchant_name: Optional[str] = None
    memo: Optional[str] = None


@router.post("/transactions")
async def create_transaction(
    body: CreateTransactionBody,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Create a bank transaction (manual or after import). For Plaid sync you'd use provider_transaction_id."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "bank_account_id": body.bank_account_id,
        "posted_date": body.posted_date,
        "name": body.name,
        "amount": body.amount,
        "merchant_name": body.merchant_name,
        "memo": body.memo,
        "status": "unreviewed",
    }
    r = supabase.table("bank_transactions").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create transaction")
    return r.data[0]
