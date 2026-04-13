"""
Reports: Trial Balance, Profit & Loss, Balance Sheet, Cash Flow.
Uses PostgreSQL functions (rpt_*) called via supabase.rpc().
"""

from fastapi import APIRouter, Depends
from typing import Optional, Dict
from datetime import date, timedelta
from database import supabase
from middleware.auth import require_min_role

router = APIRouter(prefix="/reports", tags=["Reports"])

# ---------------------------------------------------------------------------
# Subtype → Display Category mappings
# ---------------------------------------------------------------------------

ASSET_CATEGORIES = {
    "Current Assets": ["cash", "bank", "accounts_receivable", "current_asset", "inventory"],
    "Fixed Assets": ["fixed_asset"],
    "Other Assets": ["other_asset"],
}

LIABILITY_CATEGORIES = {
    "Current Liabilities": ["accounts_payable", "credit_card", "current_liability"],
    "Long-term Liabilities": ["long_term_liability"],
}

EQUITY_CATEGORIES = {
    "Owner's Equity": ["owner_equity", "equity"],
    "Retained Earnings": ["retained_earnings"],
}

REVENUE_CATEGORIES = {
    "Income": ["income"],
    "Other Income": ["other_income"],
}

EXPENSE_CATEGORIES = {
    "Cost of Goods Sold": ["cost_of_goods_sold"],
    "Operating Expenses": ["operating_expense"],
    "Other Expenses": ["other_expense"],
}


def _group_accounts(accounts: list, category_map: dict) -> dict:
    """Group a list of accounts into categories by subtype, returning totals."""
    categories = {}
    for cat_name, subtypes in category_map.items():
        matched = [
            {
                "account_code": a["account_code"],
                "account_name": a["account_name"],
                "net_balance": float(a.get("net_balance") or 0),
            }
            for a in accounts
            if a.get("account_subtype") in subtypes
            and float(a.get("net_balance") or 0) != 0
        ]
        if matched:
            categories[cat_name] = {
                "accounts": sorted(matched, key=lambda x: x["account_code"]),
                "total": round(sum(a["net_balance"] for a in matched), 2),
            }
    total = round(sum(c["total"] for c in categories.values()), 2)
    return {"categories": categories, "total": total}


def _call_rpc(fn_name: str, params: dict) -> list:
    """Call a Supabase RPC function and return data."""
    r = supabase.rpc(fn_name, params).execute()
    return r.data or []


# ---------------------------------------------------------------------------
# 1. Trial Balance
# ---------------------------------------------------------------------------

@router.get("/trial-balance")
async def trial_balance(
    as_of_date: Optional[str] = None,
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Trial Balance: per-account debit/credit/net totals."""
    cid = auth["company_id"]
    as_of = as_of_date or str(date.today())

    rows = _call_rpc("rpt_trial_balance", {
        "p_company_id": cid,
        "p_as_of_date": as_of,
    })

    accounts = []
    total_debits = 0.0
    total_credits = 0.0
    for r in rows:
        dt = float(r.get("debit_total") or 0)
        ct = float(r.get("credit_total") or 0)
        nb = float(r.get("net_balance") or 0)
        if dt == 0 and ct == 0:
            continue
        total_debits += dt
        total_credits += ct
        accounts.append({
            "account_code": r["account_code"],
            "account_name": r["account_name"],
            "account_type": r["account_type"],
            "debit_total": round(dt, 2),
            "credit_total": round(ct, 2),
            "net_balance": round(nb, 2),
        })

    return {
        "company_id": cid,
        "as_of_date": as_of,
        "accounts": accounts,
        "total_debits": round(total_debits, 2),
        "total_credits": round(total_credits, 2),
    }


# ---------------------------------------------------------------------------
# 2. Profit & Loss
# ---------------------------------------------------------------------------

@router.get("/profit-loss")
async def profit_loss(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Profit & Loss: Revenue - Expenses with hierarchical breakdown."""
    cid = auth["company_id"]
    end = end_date or str(date.today())
    start = start_date or str(date.today().replace(month=1, day=1))

    rows = _call_rpc("rpt_account_balances_between", {
        "p_company_id": cid,
        "p_start_date": start,
        "p_end_date": end,
    })

    revenue_accounts = [r for r in rows if r.get("account_type") == "revenue"]
    expense_accounts = [r for r in rows if r.get("account_type") == "expense"]

    revenue = _group_accounts(revenue_accounts, REVENUE_CATEGORIES)
    cogs = _group_accounts(
        expense_accounts,
        {"Cost of Goods Sold": ["cost_of_goods_sold"]},
    )
    operating_expenses = _group_accounts(
        expense_accounts,
        {"Operating Expenses": ["operating_expense"]},
    )
    other_expenses = _group_accounts(
        expense_accounts,
        {"Other Expenses": ["other_expense"]},
    )

    gross_profit = round(revenue["total"] - cogs["total"], 2)
    total_expenses = round(
        cogs["total"] + operating_expenses["total"] + other_expenses["total"], 2
    )
    net_income = round(revenue["total"] - total_expenses, 2)

    return {
        "company_id": cid,
        "start_date": start,
        "end_date": end,
        "sections": {
            "revenue": revenue,
            "cost_of_goods_sold": cogs,
            "gross_profit": gross_profit,
            "operating_expenses": operating_expenses,
            "other_expenses": other_expenses,
            "total_expenses": total_expenses,
            "net_income": net_income,
        },
    }


# ---------------------------------------------------------------------------
# 3. Balance Sheet
# ---------------------------------------------------------------------------

@router.get("/balance-sheet")
async def balance_sheet(
    as_of_date: Optional[str] = None,
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Balance Sheet: Assets = Liabilities + Equity, with Net Income."""
    cid = auth["company_id"]
    as_of = as_of_date or str(date.today())

    rows = _call_rpc("rpt_account_balances_as_of", {
        "p_company_id": cid,
        "p_as_of_date": as_of,
    })

    asset_rows = [r for r in rows if r.get("account_type") == "asset"]
    liability_rows = [r for r in rows if r.get("account_type") == "liability"]
    equity_rows = [r for r in rows if r.get("account_type") == "equity"]
    revenue_rows = [r for r in rows if r.get("account_type") == "revenue"]
    expense_rows = [r for r in rows if r.get("account_type") == "expense"]

    assets = _group_accounts(asset_rows, ASSET_CATEGORIES)
    liabilities = _group_accounts(liability_rows, LIABILITY_CATEGORIES)
    equity = _group_accounts(equity_rows, EQUITY_CATEGORIES)

    # Compute net income and inject as synthetic equity line
    rev_total = sum(float(r.get("net_balance") or 0) for r in revenue_rows)
    exp_total = sum(float(r.get("net_balance") or 0) for r in expense_rows)
    net_income = round(rev_total - exp_total, 2)

    if net_income != 0:
        ni_entry = {
            "accounts": [
                {
                    "account_code": "",
                    "account_name": "Net Income",
                    "net_balance": net_income,
                }
            ],
            "total": net_income,
        }
        equity["categories"]["Net Income"] = ni_entry
        equity["total"] = round(equity["total"] + net_income, 2)

    liabilities_and_equity_total = round(liabilities["total"] + equity["total"], 2)

    return {
        "company_id": cid,
        "as_of_date": as_of,
        "sections": {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
            "liabilities_and_equity_total": liabilities_and_equity_total,
        },
    }


# ---------------------------------------------------------------------------
# 4. Cash Flow (Indirect Method)
# ---------------------------------------------------------------------------

@router.get("/cash-flow")
async def cash_flow(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    auth: Dict[str, str] = Depends(require_min_role("accountant")),
):
    """Cash Flow Statement: Operating, Investing, Financing (indirect method)."""
    cid = auth["company_id"]
    end = end_date or str(date.today())
    start = start_date or str(date.today().replace(month=1, day=1))

    # Balances at start-1 (beginning) and end
    start_minus_1 = str(date.fromisoformat(start) - timedelta(days=1))

    balances_begin = _call_rpc("rpt_account_balances_as_of", {
        "p_company_id": cid,
        "p_as_of_date": start_minus_1,
    })
    balances_end = _call_rpc("rpt_account_balances_as_of", {
        "p_company_id": cid,
        "p_as_of_date": end,
    })

    # Build lookup by account_id
    begin_map = {r["account_id"]: float(r.get("net_balance") or 0) for r in balances_begin}
    end_map = {r["account_id"]: float(r.get("net_balance") or 0) for r in balances_end}

    # Build account info from end balances (superset)
    account_info = {}
    for r in balances_end:
        account_info[r["account_id"]] = r
    for r in balances_begin:
        if r["account_id"] not in account_info:
            account_info[r["account_id"]] = r

    # Net income for the period
    period_rows = _call_rpc("rpt_account_balances_between", {
        "p_company_id": cid,
        "p_start_date": start,
        "p_end_date": end,
    })
    rev_total = sum(float(r.get("net_balance") or 0) for r in period_rows if r.get("account_type") == "revenue")
    exp_total = sum(float(r.get("net_balance") or 0) for r in period_rows if r.get("account_type") == "expense")
    net_income = round(rev_total - exp_total, 2)

    # Compute changes by subtype
    all_ids = set(list(begin_map.keys()) + list(end_map.keys()))

    operating_items = []
    investing_items = []
    financing_items = []

    # Working capital subtypes (operating adjustments)
    working_capital_subtypes = [
        "accounts_receivable", "inventory", "current_asset", "other_asset",
        "accounts_payable", "credit_card", "current_liability",
    ]
    investing_subtypes = ["fixed_asset"]
    financing_subtypes = ["owner_equity", "equity", "retained_earnings", "long_term_liability"]

    for aid in all_ids:
        info = account_info.get(aid, {})
        subtype = info.get("account_subtype")
        acct_type = info.get("account_type")
        if acct_type in ("revenue", "expense"):
            continue  # handled via net income
        if subtype in ("cash", "bank"):
            continue  # cash is what we're computing

        begin_bal = begin_map.get(aid, 0)
        end_bal = end_map.get(aid, 0)
        change = round(end_bal - begin_bal, 2)
        if change == 0:
            continue

        item = {
            "account_code": info.get("account_code", ""),
            "account_name": info.get("account_name", ""),
            "amount": change,
        }

        # For operating: asset increases use cash (negative), liability increases provide cash (positive)
        # The sign convention: assets increasing = cash outflow, liabilities increasing = cash inflow
        if subtype in working_capital_subtypes:
            if acct_type == "asset":
                item["amount"] = round(-change, 2)  # asset increase = cash decrease
            operating_items.append(item)
        elif subtype in investing_subtypes:
            item["amount"] = round(-change, 2)  # asset increase = cash outflow
            investing_items.append(item)
        elif subtype in financing_subtypes:
            financing_items.append(item)

    operating_adjustments = round(sum(i["amount"] for i in operating_items), 2)
    operating_total = round(net_income + operating_adjustments, 2)
    investing_total = round(sum(i["amount"] for i in investing_items), 2)
    financing_total = round(sum(i["amount"] for i in financing_items), 2)
    net_change = round(operating_total + investing_total + financing_total, 2)

    # Beginning and ending cash
    cash_subtypes = ["cash", "bank"]
    beginning_cash = round(
        sum(begin_map.get(aid, 0) for aid, info in account_info.items()
            if info.get("account_subtype") in cash_subtypes),
        2,
    )
    ending_cash = round(beginning_cash + net_change, 2)

    return {
        "company_id": cid,
        "start_date": start,
        "end_date": end,
        "sections": {
            "operating": {
                "net_income": net_income,
                "adjustments": operating_items,
                "adjustments_total": operating_adjustments,
                "total": operating_total,
            },
            "investing": {
                "items": investing_items,
                "total": investing_total,
            },
            "financing": {
                "items": financing_items,
                "total": financing_total,
            },
            "net_change_in_cash": net_change,
            "beginning_cash": beginning_cash,
            "ending_cash": ending_cash,
        },
    }
