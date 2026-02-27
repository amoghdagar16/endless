"""
Bank reconciliation (Step 9: compare app balance to statement, check off, finish).
Schema: reconciliation_sessions, reconciliation_items.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from database import supabase
from middleware.auth import get_current_user_company

router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])


class SessionCreate(BaseModel):
    bank_account_id: str
    statement_start: str
    statement_end: str
    statement_ending_balance: float


class ClearItemBody(BaseModel):
    bank_transaction_id: str
    cleared: bool = True


@router.get("/sessions")
async def list_sessions(
    bank_account_id: Optional[str] = None,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """List reconciliation sessions."""
    cid = auth["company_id"]
    q = supabase.table("reconciliation_sessions").select("*").eq("company_id", cid)
    if bank_account_id:
        q = q.eq("bank_account_id", bank_account_id)
    r = q.order("statement_end", desc=True).execute()
    return r.data or []


@router.post("/sessions")
async def create_session(
    body: SessionCreate,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Start a reconciliation session (statement dates and ending balance)."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "bank_account_id": body.bank_account_id,
        "statement_start": body.statement_start,
        "statement_end": body.statement_end,
        "statement_ending_balance": body.statement_ending_balance,
        "status": "in_progress",
    }
    r = supabase.table("reconciliation_sessions").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create session")
    return r.data[0]


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get session with cleared items."""
    cid = auth["company_id"]
    r = supabase.table("reconciliation_sessions")\
        .select("*, reconciliation_items(*)")\
        .eq("id", session_id)\
        .eq("company_id", cid)\
        .single()\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return r.data


@router.post("/sessions/{session_id}/items")
async def add_cleared_item(
    session_id: str,
    body: ClearItemBody,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Mark a bank transaction as cleared in this session."""
    cid = auth["company_id"]
    sess = supabase.table("reconciliation_sessions").select("id").eq("id", session_id).eq("company_id", cid).single().execute()
    if not sess.data:
        raise HTTPException(status_code=404, detail="Session not found")
    data = {
        "reconciliation_session_id": session_id,
        "bank_transaction_id": body.bank_transaction_id,
        "cleared": body.cleared,
    }
    r = supabase.table("reconciliation_items").upsert(data, on_conflict="reconciliation_session_id,bank_transaction_id").execute()
    return r.data[0] if r.data else data


@router.patch("/sessions/{session_id}/complete")
async def complete_session(
    session_id: str,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Mark reconciliation session as completed."""
    cid = auth["company_id"]
    r = supabase.table("reconciliation_sessions").update({
        "status": "completed",
    }).eq("id", session_id).eq("company_id", cid).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return r.data[0]
