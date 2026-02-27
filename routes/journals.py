from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from database import supabase
from datetime import datetime
from middleware.auth import get_current_user_company
from routes.journal_helpers import create_auto_journal_entry

router = APIRouter()

class JournalLineCreate(BaseModel):
    account_id: str
    debit: Optional[float] = 0.0
    credit: Optional[float] = 0.0
    description: Optional[str] = None
    contact_id: Optional[str] = None
    tags: Optional[List[str]] = None

class JournalEntryCreate(BaseModel):
    entry_date: str
    memo: Optional[str] = None
    reference: Optional[str] = None  # maps to reference_number in DB
    source: Optional[str] = "manual"  # manual|ocr|import|system|bank|invoice|bill|payment|adjustment
    lines: List[JournalLineCreate]

class JournalEntryUpdate(BaseModel):
    entry_date: Optional[str] = None
    memo: Optional[str] = None
    reference: Optional[str] = None
    status: Optional[str] = None

@router.get("/")
def get_all_journal_entries(auth: Dict[str, str] = Depends(get_current_user_company)):
    """Get journal entries for authenticated user's company"""
    company_id = auth["company_id"]
    response = supabase.table("journal_entries")\
        .select("*, journal_lines(*, accounts(account_code, account_name))")\
        .eq("company_id", company_id)\
        .order("entry_date", desc=True)\
        .execute()
    return response.data

@router.get("/company/{company_id}")
def get_company_journal_entries(
    company_id: str,
    limit: int = 50,
    offset: int = 0,
    auth: Dict[str, str] = Depends(get_current_user_company)
):
    """Get journal entries for a specific company (must own the company)"""
    # Verify user owns this company
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's journals")

    response = supabase.table("journal_entries")\
        .select("*, journal_lines(*, accounts(account_code, account_name))")\
        .eq("company_id", company_id)\
        .order("entry_date", desc=True)\
        .order("created_at", desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    return response.data

@router.get("/{journal_id}")
def get_journal_entry(journal_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Get a specific journal entry with its lines"""
    company_id = auth["company_id"]

    response = supabase.table("journal_entries")\
        .select("*, journal_lines(*, accounts(account_code, account_name))")\
        .eq("id", journal_id)\
        .eq("company_id", company_id)\
        .single()\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    return response.data

@router.post("/")
def create_journal_entry(entry: JournalEntryCreate, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Create a new journal entry with lines"""
    try:
        company_id = auth["company_id"]

        source = (entry.source or "manual").lower()
        if source not in ("manual", "ocr", "import", "system", "bank", "invoice", "bill", "payment", "adjustment"):
            source = "manual"

        lines = [
            {
                "account_id": line.account_id,
                "debit": line.debit or 0.0,
                "credit": line.credit or 0.0,
                "description": line.description,
                "contact_id": line.contact_id,
            }
            for line in entry.lines
        ]

        journal_entry = create_auto_journal_entry(
            company_id=company_id,
            entry_date=entry.entry_date,
            memo=entry.memo,
            reference=entry.reference,
            source=source,
            lines=lines,
        )

        # Fetch the complete entry with lines (same shape as GET /journals/{id})
        full = supabase.table("journal_entries")\
            .select("*, journal_lines(*, accounts(account_code, account_name))")\
            .eq("id", journal_entry["id"])\
            .eq("company_id", company_id)\
            .single()\
            .execute()
        return full.data if full.data else journal_entry
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating journal entry: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating journal entry: {str(e)}")

@router.patch("/{journal_id}")
def update_journal_entry(
    journal_id: str,
    entry: JournalEntryUpdate,
    auth: Dict[str, str] = Depends(get_current_user_company)
):
    """Update a journal entry (header only, not lines)"""
    company_id = auth["company_id"]

    update_data = {k: v for k, v in entry.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = supabase.table("journal_entries")\
        .update(update_data)\
        .eq("id", journal_id)\
        .eq("company_id", company_id)\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    return response.data[0]

@router.delete("/{journal_id}")
def delete_journal_entry(journal_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Delete a journal entry and its lines (reverse account balances)"""
    # Get the journal entry with lines (this already verifies company ownership)
    entry = get_journal_entry(journal_id, auth)

    # Reverse the account balances
    for line in entry.get("journal_lines", []):
        account_response = supabase.table("accounts")\
            .select("current_balance, account_type")\
            .eq("id", line["account_id"])\
            .single()\
            .execute()

        if account_response.data:
            account = account_response.data
            current_balance = account.get("current_balance", 0) or 0
            account_type = account.get("account_type", "")

            # Reverse the transaction
            if account_type in ["asset", "expense"]:
                new_balance = current_balance - (line["debit"] or 0) + (line["credit"] or 0)
            else:
                new_balance = current_balance - (line["credit"] or 0) + (line["debit"] or 0)

            supabase.table("accounts")\
                .update({"current_balance": new_balance})\
                .eq("id", line["account_id"])\
                .execute()

    # Set status to draft first (DB trigger blocks line changes on posted entries)
    supabase.table("journal_entries")\
        .update({"status": "draft"})\
        .eq("id", journal_id)\
        .execute()

    # Delete journal lines
    supabase.table("journal_lines")\
        .delete()\
        .eq("journal_entry_id", journal_id)\
        .execute()

    # Delete journal entry
    supabase.table("journal_entries")\
        .delete()\
        .eq("id", journal_id)\
        .execute()

    return {"message": "Journal entry deleted successfully"}
