from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from database import supabase
from middleware.auth import get_current_user_company

router = APIRouter()

class AccountCreate(BaseModel):
    account_code: str
    account_name: str
    type: str  # asset, liability, equity, revenue, expense
    subtype: Optional[str] = None
    parent_account_id: Optional[str] = None
    balance: Optional[float] = 0.0

class AccountUpdate(BaseModel):
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    type: Optional[str] = None
    subtype: Optional[str] = None
    parent_account_id: Optional[str] = None
    balance: Optional[float] = None

@router.get("/")
def get_all_accounts(auth: Dict[str, str] = Depends(get_current_user_company)):
    """Get all accounts for authenticated user's company"""
    company_id = auth["company_id"]
    response = supabase.table("accounts")\
        .select("*")\
        .eq("company_id", company_id)\
        .order("account_code")\
        .execute()
    return response.data

@router.get("/company/{company_id}")
def get_company_accounts(company_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Get all accounts for a specific company (must own the company)"""
    # Verify user owns this company
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's accounts")

    response = supabase.table("accounts")\
        .select("*")\
        .eq("company_id", company_id)\
        .order("account_code")\
        .execute()
    return response.data

@router.get("/{account_id}")
def get_account(account_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Get a specific account"""
    company_id = auth["company_id"]

    response = supabase.table("accounts")\
        .select("*")\
        .eq("id", account_id)\
        .eq("company_id", company_id)\
        .single()\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Account not found")

    return response.data

@router.post("/")
def create_account(account: AccountCreate, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Create a new account for authenticated user's company"""
    try:
        company_id = auth["company_id"]  # Use authenticated company_id

        account_data = {
            "company_id": company_id,
            "account_code": account.account_code,
            "account_name": account.account_name,
            "account_type": account.type,
            "account_subtype": account.subtype,
            "parent_account_id": account.parent_account_id,
        }

        response = supabase.table("accounts").insert(account_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create account")

        return response.data[0]
    except Exception as e:
        print(f"Error creating account: {e}")
        raise HTTPException(status_code=400, detail=str(e))

def _account_update_to_db(account: AccountUpdate) -> dict:
    """Map Pydantic AccountUpdate fields to DB column names."""
    raw = {k: v for k, v in account.dict().items() if v is not None}
    db_data = {}
    key_map = {
        "type": "account_type",
        "subtype": "account_subtype",
        "balance": "current_balance",
    }
    for k, v in raw.items():
        db_data[key_map.get(k, k)] = v
    return db_data


@router.patch("/{account_id}")
def update_account(account_id: str, account: AccountUpdate, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Update an existing account"""
    company_id = auth["company_id"]

    update_data = _account_update_to_db(account)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = supabase.table("accounts")\
        .update(update_data)\
        .eq("id", account_id)\
        .eq("company_id", company_id)\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Account not found")

    return response.data[0]

@router.get("/{account_id}/register")
def get_account_register(
    account_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get all journal lines for an account (account register / ledger)."""
    company_id = auth["company_id"]

    account_check = supabase.table("accounts").select("*").eq("id", account_id).eq("company_id", company_id).single().execute()
    if not account_check.data:
        raise HTTPException(status_code=404, detail="Account not found")

    q = supabase.table("journal_lines") \
        .select("*, journal_entries(journal_number, entry_date, memo, status)") \
        .eq("account_id", account_id)

    if start_date:
        q = q.gte("journal_entries.entry_date", start_date)
    if end_date:
        q = q.lte("journal_entries.entry_date", end_date)

    lines_resp = q.order("created_at").execute()
    lines = lines_resp.data or []

    running_balance = 0.0
    result = []
    for line in lines:
        entry = line.get("journal_entries") or {}
        debit = float(line.get("debit", 0) or 0)
        credit = float(line.get("credit", 0) or 0)
        running_balance += debit - credit
        result.append({
            "id": line["id"],
            "journal_entry_id": line.get("journal_entry_id"),
            "journal_number": entry.get("journal_number", ""),
            "entry_date": entry.get("entry_date", ""),
            "memo": line.get("description") or entry.get("memo", ""),
            "debit": debit,
            "credit": credit,
            "running_balance": running_balance,
            "status": entry.get("status", ""),
        })

    return {
        "account": account_check.data,
        "lines": result,
        "ending_balance": running_balance,
    }


@router.delete("/{account_id}")
def delete_account(account_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Delete an account"""
    company_id = auth["company_id"]

    # Verify account belongs to user's company
    account_check = supabase.table("accounts")\
        .select("id")\
        .eq("id", account_id)\
        .eq("company_id", company_id)\
        .single()\
        .execute()

    if not account_check.data:
        raise HTTPException(status_code=404, detail="Account not found")

    # Check if account has any transactions
    journal_lines = supabase.table("journal_lines")\
        .select("id")\
        .eq("account_id", account_id)\
        .limit(1)\
        .execute()

    if journal_lines.data:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete account with existing transactions"
        )

    response = supabase.table("accounts")\
        .delete()\
        .eq("id", account_id)\
        .execute()

    return {"message": "Account deleted successfully"}
