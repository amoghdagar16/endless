"""
Bills (AP): enter bill, pay bill (Step 8).
Schema: bills, bill_lines, bill_payments, bill_payment_lines.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from database import supabase
from middleware.auth import get_current_user_company, require_min_role
from routes.journal_helpers import create_auto_journal_entry, get_ap_account

router = APIRouter(prefix="/bills", tags=["Bills"])


class BillLineCreate(BaseModel):
    line_number: int
    description: Optional[str] = None
    amount: float = 0
    expense_account_id: Optional[str] = None


class BillCreate(BaseModel):
    vendor_id: str
    bill_date: str
    due_date: Optional[str] = None
    memo: Optional[str] = None
    lines: List[BillLineCreate]


@router.get("/")
async def list_bills(
    status: Optional[str] = None,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """List bills for the company."""
    cid = auth["company_id"]
    q = supabase.table("bills").select("*, contacts(display_name, email)").eq("company_id", cid)
    if status:
        q = q.eq("status", status)
    r = q.order("bill_date", desc=True).execute()
    return r.data or []


@router.get("/{bill_id}")
async def get_bill(
    bill_id: str,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get one bill with lines."""
    cid = auth["company_id"]
    r = supabase.table("bills")\
        .select("*, bill_lines(*), contacts(display_name, email)")\
        .eq("id", bill_id)\
        .eq("company_id", cid)\
        .single()\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Bill not found")
    return r.data


@router.post("/")
async def create_bill(
    body: BillCreate,
    auth: Dict[str, str] = Depends(require_min_role("user")),
):
    """Create draft bill with lines."""
    cid = auth["company_id"]
    num_r = supabase.table("bills").select("bill_number").eq("company_id", cid).order("created_at", desc=True).limit(1).execute()
    next_num = "BILL-001"
    if num_r.data and num_r.data[0].get("bill_number"):
        try:
            prefix = "BILL-"
            last = num_r.data[0]["bill_number"]
            if last.startswith(prefix):
                n = int(last.replace(prefix, "")) + 1
                next_num = f"{prefix}{n:03d}"
        except Exception:
            pass
    total = sum(line.amount for line in body.lines)
    bill_data = {
        "company_id": cid,
        "vendor_id": body.vendor_id,
        "bill_number": next_num,
        "bill_date": body.bill_date,
        "due_date": body.due_date or body.bill_date,
        "memo": body.memo,
        "subtotal": total,
        "tax_total": 0,
        "total": total,
        "amount_paid": 0,
        "balance_due": total,
        "status": "draft",
    }
    bill_r = supabase.table("bills").insert(bill_data).execute()
    if not bill_r.data:
        raise HTTPException(status_code=400, detail="Failed to create bill")
    bill = bill_r.data[0]
    for line in body.lines:
        supabase.table("bill_lines").insert({
            "bill_id": bill["id"],
            "line_number": line.line_number,
            "description": line.description,
            "amount": line.amount,
            "expense_account_id": line.expense_account_id,
        }).execute()
    r = supabase.table("bills").select("*, bill_lines(*), contacts(display_name, email)").eq("id", bill["id"]).eq("company_id", cid).single().execute()
    return r.data or bill


@router.patch("/{bill_id}")
async def update_bill(
    bill_id: str,
    body: dict,
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Update bill (e.g. status to posted). Auto-creates journal entry when posted."""
    cid = auth["company_id"]
    allowed = {"status", "memo"}
    data = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    r = supabase.table("bills").update(data).eq("id", bill_id).eq("company_id", cid).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill = r.data[0]

    # Auto-journal when status changes to 'posted'
    if data.get("status") == "posted" and not bill.get("linked_journal_entry_id"):
        # Fetch bill with lines
        bill_full = supabase.table("bills")\
            .select("*, bill_lines(*)")\
            .eq("id", bill_id)\
            .eq("company_id", cid)\
            .single()\
            .execute()
        b = bill_full.data
        lines = b.get("bill_lines", [])

        # Validate all lines have expense_account_id
        for line in lines:
            if not line.get("expense_account_id"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Bill line {line.get('line_number', '?')} is missing an expense account. Assign expense accounts before posting.",
                )

        ap_account_id = get_ap_account(cid)
        total = b.get("total", 0) or 0

        # Build journal lines: DR Expense per line, CR Accounts Payable
        journal_lines = []
        for line in lines:
            journal_lines.append({
                "account_id": line["expense_account_id"],
                "debit": line.get("amount", 0) or 0,
                "credit": 0,
                "description": line.get("description") or f"Expense - {b.get('bill_number', '')}",
                "contact_id": b.get("vendor_id"),
            })
        journal_lines.append({
            "account_id": ap_account_id,
            "debit": 0,
            "credit": total,
            "description": f"AP for {b.get('bill_number', '')}",
            "contact_id": b.get("vendor_id"),
        })

        je = create_auto_journal_entry(
            company_id=cid,
            entry_date=b.get("bill_date"),
            memo=f"Bill {b.get('bill_number', '')} posted",
            reference=b.get("bill_number", ""),
            source="bill",
            lines=journal_lines,
        )

        # Link journal entry to bill
        supabase.table("bills")\
            .update({"linked_journal_entry_id": je["id"]})\
            .eq("id", bill_id)\
            .execute()
        bill["linked_journal_entry_id"] = je["id"]

    return bill
