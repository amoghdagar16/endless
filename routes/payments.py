"""
Customer payments: record payment, apply to invoice (Step 7).
Schema: payments, payment_applications.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from database import supabase
from middleware.auth import get_current_user_company, require_min_role
from routes.journal_helpers import create_auto_journal_entry, get_ar_account

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentCreate(BaseModel):
    customer_id: Optional[str] = None
    payment_date: str
    amount: float
    deposit_account_id: Optional[str] = None
    memo: Optional[str] = None


class ApplyPaymentBody(BaseModel):
    invoice_id: str
    amount_applied: float


@router.get("/")
async def list_payments(auth: Dict[str, str] = Depends(get_current_user_company)):
    """List customer payments."""
    cid = auth["company_id"]
    r = supabase.table("payments").select("*, contacts(display_name)").eq("company_id", cid).order("payment_date", desc=True).execute()
    return r.data or []


@router.post("/")
async def create_payment(
    body: PaymentCreate,
    auth: Dict[str, str] = Depends(require_min_role("user")),
):
    """Record a customer payment (draft)."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "customer_id": body.customer_id,
        "payment_date": body.payment_date,
        "amount": body.amount,
        "deposit_account_id": body.deposit_account_id,
        "memo": body.memo,
        "status": "draft",
    }
    r = supabase.table("payments").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create payment")
    return r.data[0]


@router.post("/{payment_id}/apply")
async def apply_to_invoice(
    payment_id: str,
    body: ApplyPaymentBody,
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Apply payment to an invoice (reduces balance_due, increases amount_paid)."""
    cid = auth["company_id"]
    pay_r = supabase.table("payments").select("*").eq("id", payment_id).eq("company_id", cid).single().execute()
    if not pay_r.data:
        raise HTTPException(status_code=404, detail="Payment not found")
    inv_r = supabase.table("invoices").select("*").eq("id", body.invoice_id).eq("company_id", cid).single().execute()
    if not inv_r.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = inv_r.data
    if body.amount_applied > (inv.get("balance_due") or 0):
        raise HTTPException(status_code=400, detail="Amount applied exceeds balance due")
    supabase.table("payment_applications").insert({
        "payment_id": payment_id,
        "invoice_id": body.invoice_id,
        "amount_applied": body.amount_applied,
    }).execute()
    new_paid = (inv.get("amount_paid") or 0) + body.amount_applied
    new_balance = (inv.get("total") or 0) - new_paid
    supabase.table("invoices").update({
        "amount_paid": new_paid,
        "balance_due": max(0, new_balance),
        "status": "paid" if new_balance <= 0 else inv.get("status"),
    }).eq("id", body.invoice_id).execute()

    # Auto-journal: DR Cash/Bank, CR Accounts Receivable
    payment = pay_r.data
    if not payment.get("deposit_account_id"):
        raise HTTPException(
            status_code=400,
            detail="Payment is missing deposit_account_id. Set a deposit account before applying.",
        )
    ar_account_id = get_ar_account(cid)
    je = create_auto_journal_entry(
        company_id=cid,
        entry_date=payment.get("payment_date"),
        memo=f"Payment applied to invoice {inv.get('invoice_number', body.invoice_id)}",
        reference=inv.get("invoice_number", ""),
        source="payment",
        lines=[
            {
                "account_id": payment["deposit_account_id"],
                "debit": body.amount_applied,
                "credit": 0,
                "description": f"Payment received - {inv.get('invoice_number', '')}",
                "contact_id": payment.get("customer_id"),
            },
            {
                "account_id": ar_account_id,
                "debit": 0,
                "credit": body.amount_applied,
                "description": f"AR reduced - {inv.get('invoice_number', '')}",
                "contact_id": payment.get("customer_id"),
            },
        ],
    )

    # Link journal entry to payment
    supabase.table("payments")\
        .update({"linked_journal_entry_id": je["id"]})\
        .eq("id", payment_id)\
        .execute()

    return {"payment_id": payment_id, "invoice_id": body.invoice_id, "amount_applied": body.amount_applied, "journal_entry_id": je["id"]}
