from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict
from middleware.auth import get_current_user_company

router = APIRouter()

@router.get("/stats/{company_id}")
def get_dashboard_stats(company_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Get dashboard statistics for a company"""
    # Verify user owns this company
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")

    # Get all accounts with their current balances
    accounts_response = supabase.table("accounts")\
        .select("*")\
        .eq("company_id", company_id)\
        .execute()

    accounts = accounts_response.data or []

    # Calculate totals by account type
    totals = {
        "asset": 0,
        "liability": 0,
        "equity": 0,
        "revenue": 0,
        "expense": 0
    }

    for account in accounts:
        acc_type = account.get("account_type", "")
        balance = account.get("current_balance", 0) or 0
        if acc_type in totals:
            totals[acc_type] += balance

    # Calculate net position (assets - liabilities)
    net_position = totals["asset"] - totals["liability"]

    # Get transaction count
    journal_entries_response = supabase.table("journal_entries")\
        .select("id", count="exact")\
        .eq("company_id", company_id)\
        .execute()

    transaction_count = journal_entries_response.count or 0

    # For now, we don't have a top vendor concept since we use journal entries
    # Could be enhanced later by tracking contacts/vendors in journal lines
    top_vendor = "N/A"

    # Calculate health score (simple metric based on assets vs liabilities ratio)
    if totals["liability"] > 0:
        health_score = min(100, int((totals["asset"] / totals["liability"]) * 50))
    else:
        health_score = 100 if totals["asset"] > 0 else 0

    return {
        "total_income": totals["revenue"],
        "total_expenses": totals["expense"],
        "net_position": net_position,
        "total_assets": totals["asset"],
        "total_liabilities": totals["liability"],
        "total_equity": totals["equity"],
        "transaction_count": transaction_count,
        "top_vendor": top_vendor,
        "health_score": health_score
    }

@router.get("/monthly-trend/{company_id}")
def get_monthly_trend(
    company_id: str,
    months: int = 6,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get monthly income and expense trend"""
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")

    # Get journal entries from the last N months
    start_date = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-%d")

    journal_entries_response = supabase.table("journal_entries")\
        .select("id, entry_date, journal_lines(debit, credit, account_id)")\
        .eq("company_id", company_id)\
        .gte("entry_date", start_date)\
        .execute()

    # Get all accounts for this company
    accounts_response = supabase.table("accounts")\
        .select("id, account_type")\
        .eq("company_id", company_id)\
        .execute()

    # Create account lookup map
    account_types = {acc["id"]: acc["account_type"] for acc in (accounts_response.data or [])}

    # Aggregate by month
    monthly_data = defaultdict(lambda: {"income": 0, "expenses": 0})

    for entry in (journal_entries_response.data or []):
        entry_date = datetime.strptime(entry["entry_date"], "%Y-%m-%d")
        month_key = entry_date.strftime("%b")

        for line in entry.get("journal_lines", []):
            account_id = line.get("account_id")
            account_type = account_types.get(account_id, "")
            credit = line.get("credit", 0) or 0
            debit = line.get("debit", 0) or 0

            if account_type == "revenue":
                monthly_data[month_key]["income"] += credit
            elif account_type == "expense":
                monthly_data[month_key]["expenses"] += debit

    # Convert to list format
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_month = datetime.now().month

    trend = []
    for i in range(months):
        month_idx = (current_month - months + i) % 12
        month_name = month_names[month_idx]
        trend.append({
            "month": month_name,
            "income": monthly_data[month_name]["income"],
            "expenses": monthly_data[month_name]["expenses"]
        })

    return trend

@router.get("/category-breakdown/{company_id}")
def get_category_breakdown(
    company_id: str,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get expense breakdown by category/account"""
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")

    # Get all expense accounts with balances
    accounts_response = supabase.table("accounts")\
        .select("account_name, current_balance")\
        .eq("company_id", company_id)\
        .eq("account_type", "expense")\
        .gt("current_balance", 0)\
        .execute()

    accounts = accounts_response.data or []

    # Calculate total expenses
    total_expenses = sum(acc.get("current_balance", 0) or 0 for acc in accounts)

    # Calculate percentage for each
    breakdown = []
    for account in accounts[:5]:  # Top 5
        balance = account.get("current_balance", 0) or 0
        percentage = (balance / total_expenses * 100) if total_expenses > 0 else 0
        breakdown.append({
            "name": account.get("account_name", "Unknown"),
            "value": round(percentage, 1)
        })

    # Add "Other" if there are more than 5 accounts
    if len(accounts) > 5:
        other_total = sum(acc.get("current_balance", 0) or 0 for acc in accounts[5:])
        other_percentage = (other_total / total_expenses * 100) if total_expenses > 0 else 0
        breakdown.append({
            "name": "Other",
            "value": round(other_percentage, 1)
        })

    return breakdown

@router.get("/recent-transactions/{company_id}")
def get_recent_transactions(
    company_id: str,
    limit: int = 10,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get recent journal entries"""
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")

    response = supabase.table("journal_entries")\
        .select("id, journal_number, entry_date, memo, total_debit, total_credit, status")\
        .eq("company_id", company_id)\
        .order("entry_date", desc=True)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()

    return response.data or []
