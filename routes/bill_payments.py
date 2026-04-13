"""
Bill payments: pay bills (Step 8).
Schema: bill_payments, bill_payment_lines.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from database import supabase
from middleware.auth import get_current_user_company, require_min_role
from routes.journal_helpers import create_auto_journal_entry, get_ap_account

router = APIRouter(prefix="/bill-payments", tags=["Bill Payments"])


class BillPaymentCreate(BaseModel):
    vendor_id: Optional[str] = None
    payment_date: str
    amount: float
    payment_account_id: Optional[str] = None
    memo: Optional[str] = None


class BillPaymentLineCreate(BaseModel):
    bill_id: str
    amount_applied: float


@router.get("/")
async def list_bill_payments(auth: Dict[str, str] = Depends(get_current_user_company)):
    """List bill payments."""
    cid = auth["company_id"]
    r = supabase.table("bill_payments").select("*").eq("company_id", cid).order("payment_date", desc=True).execute()
    return r.data or []


@router.post("/")
async def create_bill_payment(
    body: BillPaymentCreate,
    auth: Dict[str, str] = Depends(require_min_role("user")),
):
    """Create a bill payment (draft)."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "vendor_id": body.vendor_id,
        "payment_date": body.payment_date,
        "amount": body.amount,
        "payment_account_id": body.payment_account_id,
        "memo": body.memo,
        "status": "draft",
    }
    r = supabase.table("bill_payments").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create bill payment")
    return r.data[0]


@router.post("/{payment_id}/apply")
async def apply_to_bills(
    payment_id: str,
    body: List[BillPaymentLineCreate],
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Apply bill payment to one or more bills."""
    cid = auth["company_id"]
    pay_r = supabase.table("bill_payments").select("*").eq("id", payment_id).eq("company_id", cid).single().execute()
    if not pay_r.data:
        raise HTTPException(status_code=404, detail="Bill payment not found")
    payment = pay_r.data
    if not payment.get("payment_account_id"):
        raise HTTPException(
            status_code=400,
            detail="Bill payment is missing payment_account_id. Set a payment account before applying.",
        )

    total_applied = 0
    for line in body:
        bill_r = supabase.table("bills").select("*").eq("id", line.bill_id).eq("company_id", cid).single().execute()
        if not bill_r.data:
            raise HTTPException(status_code=404, detail=f"Bill {line.bill_id} not found")
        supabase.table("bill_payment_lines").insert({
            "bill_payment_id": payment_id,
            "bill_id": line.bill_id,
            "amount_applied": line.amount_applied,
        }).execute()
        bill = bill_r.data
        new_paid = (bill.get("amount_paid") or 0) + line.amount_applied
        new_balance = (bill.get("total") or 0) - new_paid
        supabase.table("bills").update({
            "amount_paid": new_paid,
            "balance_due": max(0, new_balance),
            "status": "paid" if new_balance <= 0 else bill.get("status"),
        }).eq("id", line.bill_id).execute()
        total_applied += line.amount_applied

    # Auto-journal: DR Accounts Payable, CR Cash/Bank
    ap_account_id = get_ap_account(cid)
    je = create_auto_journal_entry(
        company_id=cid,
        entry_date=payment.get("payment_date"),
        memo=f"Bill payment applied",
        reference="",
        source="payment",
        lines=[
            {
                "account_id": ap_account_id,
                "debit": total_applied,
                "credit": 0,
                "description": "AP reduced - bill payment",
                "contact_id": payment.get("vendor_id"),
            },
            {
                "account_id": payment["payment_account_id"],
                "debit": 0,
                "credit": total_applied,
                "description": "Cash paid - bill payment",
                "contact_id": payment.get("vendor_id"),
            },
        ],
    )

    # Link journal entry to bill payment
    supabase.table("bill_payments")\
        .update({"linked_journal_entry_id": je["id"]})\
        .eq("id", payment_id)\
        .execute()

    return {"payment_id": payment_id, "applied": len(body), "journal_entry_id": je["id"]}
