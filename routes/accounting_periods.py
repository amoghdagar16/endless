"""
Accounting periods and period close (Step 9: lock the month).
Schema: accounting_periods.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
from database import supabase
from middleware.auth import get_current_user_company

router = APIRouter(prefix="/accounting-periods", tags=["Accounting Periods"])


class PeriodCreate(BaseModel):
    period_start: str
    period_end: str
    lock_date: Optional[str] = None


@router.get("/")
async def list_periods(auth: Dict[str, str] = Depends(get_current_user_company)):
    """List accounting periods for the company."""
    cid = auth["company_id"]
    r = supabase.table("accounting_periods").select("*").eq("company_id", cid).order("period_start", desc=True).execute()
    return r.data or []


@router.post("/")
async def create_period(
    body: PeriodCreate,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Create an accounting period."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "period_start": body.period_start,
        "period_end": body.period_end,
        "lock_date": body.lock_date or body.period_end,
        "is_closed": False,
    }
    r = supabase.table("accounting_periods").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create period")
    return r.data[0]


@router.patch("/{period_id}/close")
async def close_period(
    period_id: str,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Close/lock the period (no more edits to entries on or before lock_date)."""
    cid = auth["company_id"]
    r = supabase.table("accounting_periods").update({
        "is_closed": True,
        "closed_at": datetime.now(timezone.utc).isoformat(),
        "closed_by": auth.get("user_id"),
    }).eq("id", period_id).eq("company_id", cid).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Period not found")
    return r.data[0]
