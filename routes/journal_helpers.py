"""
Shared helpers for auto-creating journal entries from invoices, bills, and payments.
"""

from fastapi import HTTPException
from database import supabase
from datetime import datetime


def get_account_by_subtype(company_id: str, subtype: str) -> str:
    """Find the first account matching the given subtype for a company."""
    r = supabase.table("accounts")\
        .select("id")\
        .eq("company_id", company_id)\
        .eq("account_subtype", subtype)\
        .limit(1)\
        .execute()
    if not r.data:
        raise HTTPException(
            status_code=400,
            detail=f"No account with subtype '{subtype}' found. Please set up your Chart of Accounts first.",
        )
    return r.data[0]["id"]


def get_ar_account(company_id: str) -> str:
    return get_account_by_subtype(company_id, "accounts_receivable")


def get_ap_account(company_id: str) -> str:
    return get_account_by_subtype(company_id, "accounts_payable")


def create_auto_journal_entry(
    company_id: str,
    entry_date: str,
    memo: str,
    reference: str,
    source: str,
    lines: list,
    created_by: str = None,
) -> dict:
    """
    Create a posted journal entry with lines and update account balances.

    lines: list of dicts with keys: account_id, debit, credit, description, contact_id (optional)
    Returns the created journal entry dict (with id).
    """
    total_debit = sum(l.get("debit", 0) or 0 for l in lines)
    total_credit = sum(l.get("credit", 0) or 0 for l in lines)

    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Journal debits ({total_debit}) must equal credits ({total_credit})",
        )

    # Generate journal number
    year = datetime.strptime(entry_date, "%Y-%m-%d").year
    count_r = supabase.table("journal_entries")\
        .select("id", count="exact")\
        .eq("company_id", company_id)\
        .execute()
    next_number = (count_r.count or 0) + 1
    journal_number = f"JE-{year}-{next_number:04d}"

    journal_data = {
        "company_id": company_id,
        "journal_number": journal_number,
        "entry_date": entry_date,
        "memo": memo,
        "reference_number": reference,
        "source": source,
        "status": "draft",
        "total_debit": total_debit,
        "total_credit": total_credit,
    }

    journal_r = supabase.table("journal_entries").insert(journal_data).execute()
    if not journal_r.data:
        raise HTTPException(status_code=500, detail="Failed to create journal entry")
    journal_entry = journal_r.data[0]

    # Insert lines while still in draft (DB trigger blocks line changes on posted entries)
    for idx, line in enumerate(lines, start=1):
        line_data = {
            "journal_entry_id": journal_entry["id"],
            "account_id": line["account_id"],
            "line_number": idx,
            "debit": line.get("debit", 0) or 0,
            "credit": line.get("credit", 0) or 0,
            "description": line.get("description"),
            "contact_id": line.get("contact_id"),
        }
        supabase.table("journal_lines").insert(line_data).execute()

        # Update account balance
        acct_r = supabase.table("accounts")\
            .select("current_balance, account_type")\
            .eq("id", line["account_id"])\
            .single()\
            .execute()

        if acct_r.data:
            acct = acct_r.data
            current_balance = acct.get("current_balance", 0) or 0
            account_type = acct.get("account_type", "")
            debit = line.get("debit", 0) or 0
            credit = line.get("credit", 0) or 0

            if account_type in ("asset", "expense"):
                new_balance = current_balance + debit - credit
            else:
                new_balance = current_balance + credit - debit

            supabase.table("accounts")\
                .update({"current_balance": new_balance})\
                .eq("id", line["account_id"])\
                .execute()

    # Now mark as posted (after all lines are inserted)
    supabase.table("journal_entries")\
        .update({"status": "posted"})\
        .eq("id", journal_entry["id"])\
        .execute()
    journal_entry["status"] = "posted"

    return journal_entry
