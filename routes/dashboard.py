from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from datetime import date, datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Any
from middleware.auth import get_current_user_company

router = APIRouter()


def _period_dates(period: str):
    today = date.today()
    y, m = today.year, today.month

    if period == "this_month":
        start = date(y, m, 1)
        end = today
        prior_end = start - timedelta(days=1)
        prior_start = date(prior_end.year, prior_end.month, 1)

    elif period == "last_month":
        end = date(y, m, 1) - timedelta(days=1)
        start = date(end.year, end.month, 1)
        prior_end = start - timedelta(days=1)
        prior_start = date(prior_end.year, prior_end.month, 1)

    elif period == "this_quarter":
        qs = (m - 1) // 3 * 3 + 1
        start = date(y, qs, 1)
        end = today
        prior_end = start - timedelta(days=1)
        pqs = (prior_end.month - 1) // 3 * 3 + 1
        prior_start = date(prior_end.year, pqs, 1)

    else:  # ytd
        start = date(y, 1, 1)
        end = today
        prior_start = date(y - 1, 1, 1)
        # same elapsed days last year
        day_of_year = (today - date(y, 1, 1)).days
        prior_end = date(y - 1, 1, 1) + timedelta(days=day_of_year)

    return start, end, prior_start, prior_end


DEFAULT_WIDGET_SET = [
    {"widget_id": "revenue_vs_expenses", "position": 0, "is_visible": True},
    {"widget_id": "profit_margin_trend", "position": 1, "is_visible": True},
    {"widget_id": "top_expense_categories", "position": 2, "is_visible": True},
    {"widget_id": "receivables_aging", "position": 3, "is_visible": True},
    {"widget_id": "action_items", "position": 4, "is_visible": True},
    {"widget_id": "recent_transactions", "position": 5, "is_visible": True},
]


@router.get("/bank-accounts")
def get_bank_accounts(auth: Dict[str, str] = Depends(get_current_user_company)):
    company_id = auth["company_id"]
    accts = (
        supabase.table("accounts")
        .select("id, account_name, account_code, account_subtype, current_balance")
        .eq("company_id", company_id)
        .eq("account_type", "asset")
        .execute()
        .data or []
    )
    bank_accounts = [
        {
            "account_id": a["id"],
            "account_name": a.get("account_name", ""),
            "account_code": a.get("account_code", ""),
            "balance": float(a.get("current_balance") or 0),
        }
        for a in accts
        if (
            "cash" in (a.get("account_subtype") or "").lower()
            or "bank" in (a.get("account_subtype") or "").lower()
            or "checking" in (a.get("account_name") or "").lower()
            or "savings" in (a.get("account_name") or "").lower()
            or "bank" in (a.get("account_name") or "").lower()
            or "cash" in (a.get("account_name") or "").lower()
        )
    ]
    return {
        "accounts": bank_accounts,
        "total_balance": round(sum(a["balance"] for a in bank_accounts), 2),
    }


@router.get("/widgets")
def get_widget_preferences(auth: Dict[str, str] = Depends(get_current_user_company)):
    company_id = auth["company_id"]
    user_id = auth.get("user_id", "")
    try:
        prefs = (
            supabase.table("dashboard_widgets")
            .select("widget_id, position, is_visible, config")
            .eq("company_id", company_id)
            .eq("user_id", user_id)
            .order("position")
            .execute()
            .data or []
        )
        return prefs if prefs else DEFAULT_WIDGET_SET
    except Exception:
        return DEFAULT_WIDGET_SET


@router.put("/widgets")
def save_widget_preferences(payload: dict, auth: Dict[str, str] = Depends(get_current_user_company)):
    company_id = auth["company_id"]
    user_id = auth.get("user_id", "")
    widgets = payload.get("widgets", [])
    for w in widgets:
        supabase.table("dashboard_widgets").upsert(
            {
                "company_id": company_id,
                "user_id": user_id,
                "widget_id": w["widget_id"],
                "position": w.get("position", 0),
                "is_visible": w.get("is_visible", True),
                "config": w.get("config", {}),
            },
            on_conflict="company_id,user_id,widget_id",
        ).execute()
    return {"ok": True}


def _fetch_ap_aging(company_id: str, today: date) -> dict:
    bills = (
        supabase.table("bills")
        .select("balance_due, due_date, status")
        .eq("company_id", company_id)
        .execute()
        .data or []
    )
    open_bills = [b for b in bills if b.get("status") not in ("paid", "void")]
    buckets = {"current": 0.0, "days_1_30": 0.0, "days_31_60": 0.0, "days_61_90": 0.0, "days_90_plus": 0.0}
    today_str = today.isoformat()
    for b in open_bills:
        amt = float(b.get("balance_due") or 0)
        due = b.get("due_date")
        if not due or due >= today_str:
            buckets["current"] += amt
        else:
            days = (today - date.fromisoformat(due)).days
            if days <= 30:
                buckets["days_1_30"] += amt
            elif days <= 60:
                buckets["days_31_60"] += amt
            elif days <= 90:
                buckets["days_61_90"] += amt
            else:
                buckets["days_90_plus"] += amt
    return {k: round(v, 2) for k, v in buckets.items()}


def _fetch_ar_by_customer(company_id: str) -> list:
    invoices = (
        supabase.table("invoices")
        .select("customer_name, balance_due, status")
        .eq("company_id", company_id)
        .execute()
        .data or []
    )
    open_invs = [i for i in invoices if i.get("status") not in ("paid", "void")]
    by_customer: dict = defaultdict(float)
    for inv in open_invs:
        name = inv.get("customer_name") or "Unknown"
        by_customer[name] += float(inv.get("balance_due") or 0)
    sorted_cust = sorted(by_customer.items(), key=lambda x: x[1], reverse=True)[:5]
    return [{"customer": name, "amount": round(amt, 2)} for name, amt in sorted_cust]


def _fetch_invoice_status(invoices: list, today: date) -> dict:
    today_str = today.isoformat()
    counts: dict = {"draft": 0, "sent": 0, "overdue": 0, "paid": 0}
    for inv in invoices:
        st = inv.get("status", "draft")
        if st == "paid":
            counts["paid"] += 1
        elif st in ("sent", "approved") and inv.get("due_date") and inv["due_date"] < today_str:
            counts["overdue"] += 1
        elif st in ("sent", "approved"):
            counts["sent"] += 1
        else:
            counts["draft"] += 1
    return counts


def _fetch_bill_status(bills: list) -> list:
    by_status: dict = defaultdict(lambda: {"count": 0, "total": 0.0})
    for b in bills:
        st = b.get("status", "draft")
        by_status[st]["count"] += 1
        by_status[st]["total"] += float(b.get("balance_due") or 0)
    return [{"status": st, "count": v["count"], "total": round(v["total"], 2)} for st, v in by_status.items()]


def _fetch_cash_flow(lines_data: list, acct_map: dict, entry_date_map: dict, today: date) -> list:
    monthly: dict = {}
    for i in range(5, -1, -1):
        tm = today.month - i
        ty = today.year
        while tm <= 0:
            tm += 12
            ty -= 1
        mk = f"{ty}-{tm:02d}"
        monthly[mk] = {"inflows": 0.0, "outflows": 0.0, "short": date(ty, tm, 1).strftime("%b")}
    for line in lines_data:
        ed = entry_date_map.get(line.get("journal_entry_id", ""), "")
        mk = ed[:7] if ed else ""
        if mk not in monthly:
            continue
        acct = acct_map.get(line.get("account_id", ""), {})
        at = acct.get("account_type", "")
        if at == "revenue":
            monthly[mk]["inflows"] += float(line.get("credit") or 0)
        elif at == "expense":
            monthly[mk]["outflows"] += float(line.get("debit") or 0)
    return [
        {"month": mk, "short": v["short"], "inflows": round(v["inflows"], 2),
         "outflows": round(v["outflows"], 2), "net": round(v["inflows"] - v["outflows"], 2)}
        for mk, v in monthly.items()
    ]


def _fetch_deposits(lines_data: list, acct_map: dict, entry_date_map: dict, today: date) -> list:
    monthly: dict = {}
    for i in range(5, -1, -1):
        tm = today.month - i
        ty = today.year
        while tm <= 0:
            tm += 12
            ty -= 1
        mk = f"{ty}-{tm:02d}"
        monthly[mk] = {"amount": 0.0, "short": date(ty, tm, 1).strftime("%b")}
    for line in lines_data:
        ed = entry_date_map.get(line.get("journal_entry_id", ""), "")
        mk = ed[:7] if ed else ""
        if mk not in monthly:
            continue
        acct = acct_map.get(line.get("account_id", ""), {})
        at = acct.get("account_type", "")
        ast = (acct.get("account_subtype") or "").lower()
        an = (acct.get("account_name") or "").lower()
        is_bank = at == "asset" and ("cash" in ast or "bank" in ast or "checking" in an or "savings" in an)
        if is_bank:
            monthly[mk]["amount"] += float(line.get("credit") or 0)
    return [{"month": mk, "short": v["short"], "amount": round(v["amount"], 2)} for mk, v in monthly.items()]


@router.get("/summary")
def get_dashboard_summary(
    period: str = "this_month",
    widgets: str = "",
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    company_id = auth["company_id"]
    start, end, prior_start, prior_end = _period_dates(period)
    today = date.today()

    # ── Accounts ──────────────────────────────────────────────────
    accts = (
        supabase.table("accounts")
        .select("id, account_type, account_subtype, account_name, current_balance")
        .eq("company_id", company_id)
        .execute()
        .data or []
    )
    acct_map = {a["id"]: a for a in accts}

    cash_balance = sum(
        float(a.get("current_balance") or 0)
        for a in accts
        if a.get("account_type") == "asset" and (
            "cash" in (a.get("account_subtype") or "").lower()
            or "bank" in (a.get("account_subtype") or "").lower()
            or "cash" in (a.get("account_name") or "").lower()
            or "bank" in (a.get("account_name") or "").lower()
        )
    )

    # ── Journal entries: last 13 months (covers YTD + prior YTD) ──
    window_start = date(today.year - 1, 1, 1).isoformat()
    all_entries = (
        supabase.table("journal_entries")
        .select("id, entry_date, journal_number, memo, total_debit, total_credit, status")
        .eq("company_id", company_id)
        .gte("entry_date", window_start)
        .order("entry_date", desc=True)
        .execute()
        .data or []
    )

    posted_ids = [e["id"] for e in all_entries if e.get("status") == "posted"]
    entry_date_map = {e["id"]: e.get("entry_date", "") for e in all_entries}

    lines_data: list = []
    if posted_ids:
        # chunk to avoid URL length limits
        chunk_size = 200
        for i in range(0, len(posted_ids), chunk_size):
            chunk = posted_ids[i: i + chunk_size]
            resp = (
                supabase.table("journal_lines")
                .select("journal_entry_id, account_id, debit, credit")
                .in_("journal_entry_id", chunk)
                .execute()
                .data or []
            )
            lines_data.extend(resp)

    # ── Period revenue/expense aggregator ─────────────────────────
    def _agg(lines, s: date, e: date):
        rev = exp = 0.0
        s_str, e_str = s.isoformat(), e.isoformat()
        for line in lines:
            ed = entry_date_map.get(line.get("journal_entry_id", ""), "")
            if not (s_str <= ed <= e_str):
                continue
            acct = acct_map.get(line.get("account_id", ""), {})
            at = acct.get("account_type", "")
            if at == "revenue":
                rev += float(line.get("credit") or 0)
            elif at == "expense":
                exp += float(line.get("debit") or 0)
        return round(rev, 2), round(exp, 2)

    curr_rev, curr_exp = _agg(lines_data, start, end)
    prior_rev, prior_exp = _agg(lines_data, prior_start, prior_end)

    # ── Monthly data: last 12 calendar months ─────────────────────
    monthly_buckets: dict = defaultdict(lambda: {"revenue": 0.0, "expenses": 0.0})
    for line in lines_data:
        ed = entry_date_map.get(line.get("journal_entry_id", ""), "")
        if not ed:
            continue
        mk = ed[:7]
        acct = acct_map.get(line.get("account_id", ""), {})
        at = acct.get("account_type", "")
        if at == "revenue":
            monthly_buckets[mk]["revenue"] += float(line.get("credit") or 0)
        elif at == "expense":
            monthly_buckets[mk]["expenses"] += float(line.get("debit") or 0)

    monthly_data = []
    for i in range(11, -1, -1):
        tm = today.month - i
        ty = today.year
        while tm <= 0:
            tm += 12
            ty -= 1
        mk = f"{ty}-{tm:02d}"
        lbl = date(ty, tm, 1).strftime("%b %Y")
        b = monthly_buckets.get(mk, {"revenue": 0.0, "expenses": 0.0})
        monthly_data.append({
            "month": mk,
            "label": lbl,
            "short": date(ty, tm, 1).strftime("%b"),
            "revenue": round(b["revenue"], 2),
            "expenses": round(b["expenses"], 2),
            "net": round(b["revenue"] - b["expenses"], 2),
        })

    # ── Expense categories for current period ─────────────────────
    cat_totals: dict = defaultdict(float)
    s_str, e_str = start.isoformat(), end.isoformat()
    for line in lines_data:
        ed = entry_date_map.get(line.get("journal_entry_id", ""), "")
        if not (s_str <= ed <= e_str):
            continue
        acct = acct_map.get(line.get("account_id", ""), {})
        if acct.get("account_type") == "expense":
            cat_totals[acct.get("account_name", "Unknown")] += float(line.get("debit") or 0)

    total_exp_cats = sum(cat_totals.values())
    sorted_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    expense_categories = [
        {
            "account_name": n,
            "amount": round(v, 2),
            "percentage": round(v / total_exp_cats * 100, 1) if total_exp_cats > 0 else 0,
        }
        for n, v in sorted_cats[:8]
    ]
    if len(sorted_cats) > 8:
        other = sum(v for _, v in sorted_cats[8:])
        expense_categories.append({
            "account_name": "Other",
            "amount": round(other, 2),
            "percentage": round(other / total_exp_cats * 100, 1) if total_exp_cats > 0 else 0,
        })

    # ── Invoices: AR outstanding + aging ──────────────────────────
    all_invoices = (
        supabase.table("invoices")
        .select("id, balance_due, due_date, status, total")
        .eq("company_id", company_id)
        .execute()
        .data or []
    )
    open_invoices = [
        i for i in all_invoices
        if i.get("status") not in ("paid", "void")
    ]
    ar_total = sum(float(i.get("balance_due") or 0) for i in open_invoices)

    aging: dict = {"current": 0.0, "days_1_30": 0.0, "days_31_60": 0.0, "days_61_90": 0.0, "days_90_plus": 0.0}
    for inv in open_invoices:
        amt = float(inv.get("balance_due") or 0)
        due = inv.get("due_date")
        if not due:
            aging["current"] += amt
            continue
        days_over = (today - date.fromisoformat(due)).days
        if days_over <= 0:
            aging["current"] += amt
        elif days_over <= 30:
            aging["days_1_30"] += amt
        elif days_over <= 60:
            aging["days_31_60"] += amt
        elif days_over <= 90:
            aging["days_61_90"] += amt
        else:
            aging["days_90_plus"] += amt

    # ── Bills: AP outstanding ──────────────────────────────────────
    all_bills = (
        supabase.table("bills")
        .select("id, balance_due, due_date, status")
        .eq("company_id", company_id)
        .execute()
        .data or []
    )
    open_bills = [b for b in all_bills if b.get("status") not in ("paid", "void")]
    ap_total = sum(float(b.get("balance_due") or 0) for b in open_bills)

    # ── Action items ───────────────────────────────────────────────
    action_items = []
    today_str = today.isoformat()
    in7 = (today + timedelta(days=7)).isoformat()

    overdue_invs = [i for i in open_invoices if i.get("due_date") and i["due_date"] < today_str]
    if overdue_invs:
        action_items.append({
            "type": "overdue_invoices",
            "count": len(overdue_invs),
            "amount": round(sum(float(i.get("balance_due") or 0) for i in overdue_invs), 2),
            "link": "/invoices",
        })

    bills_soon = [b for b in open_bills if b.get("due_date") and today_str <= b["due_date"] <= in7]
    if bills_soon:
        action_items.append({
            "type": "bills_due_soon",
            "count": len(bills_soon),
            "amount": round(sum(float(b.get("balance_due") or 0) for b in bills_soon), 2),
            "link": "/bills",
        })

    draft_entries = [e for e in all_entries if e.get("status") == "draft"]
    if draft_entries:
        action_items.append({
            "type": "draft_entries",
            "count": len(draft_entries),
            "amount": 0,
            "link": "/new-journals",
        })

    if cash_balance < 0:
        action_items.append({
            "type": "negative_cash",
            "count": 1,
            "amount": round(cash_balance, 2),
            "link": "/banking",
        })

    # ── Recent transactions ────────────────────────────────────────
    recent = [
        {
            "id": e["id"],
            "date": e.get("entry_date", ""),
            "entry_number": e.get("journal_number", ""),
            "memo": e.get("memo", ""),
            "amount": float(e.get("total_debit") or 0),
            "status": e.get("status", ""),
        }
        for e in all_entries[:10]
    ]

    # ── Widget-specific data ───────────────────────────────────────
    active_widgets = set(w.strip() for w in widgets.split(",") if w.strip()) if widgets else set()
    widget_data: dict = {}

    if "accounts_payable" in active_widgets:
        widget_data["accounts_payable"] = _fetch_ap_aging(company_id, today)

    if "accounts_receivable" in active_widgets:
        widget_data["accounts_receivable"] = _fetch_ar_by_customer(company_id)

    if "invoices" in active_widgets:
        widget_data["invoices"] = _fetch_invoice_status(all_invoices, today)

    if "bills" in active_widgets:
        widget_data["bills"] = _fetch_bill_status(all_bills)

    if "cash_flow" in active_widgets:
        widget_data["cash_flow"] = _fetch_cash_flow(lines_data, acct_map, entry_date_map, today)

    if "deposits" in active_widgets:
        widget_data["deposits"] = _fetch_deposits(lines_data, acct_map, entry_date_map, today)

    if "sales" in active_widgets:
        widget_data["sales"] = [{"month": m["month"], "short": m["short"], "revenue": m["revenue"]} for m in monthly_data]

    if "profit_and_loss" in active_widgets:
        widget_data["profit_and_loss"] = {
            "revenue": curr_rev,
            "expenses": curr_exp,
            "net": round(curr_rev - curr_exp, 2),
        }

    if "expenses" in active_widgets:
        widget_data["expenses"] = expense_categories

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat(), "label": period},
        "prior_period": {"start": prior_start.isoformat(), "end": prior_end.isoformat()},
        "kpis": {
            "revenue": {"current": curr_rev, "prior": prior_rev},
            "expenses": {"current": curr_exp, "prior": prior_exp},
            "net_profit": {"current": round(curr_rev - curr_exp, 2), "prior": round(prior_rev - prior_exp, 2)},
            "cash_balance": {"current": round(cash_balance, 2)},
            "ar_outstanding": round(ar_total, 2),
            "ap_outstanding": round(ap_total, 2),
        },
        "monthly_data": monthly_data,
        "expense_categories": expense_categories,
        "aging": {k: round(v, 2) for k, v in aging.items()},
        "action_items": action_items,
        "recent_transactions": recent,
        "widget_data": widget_data,
    }


# ── Legacy endpoints (keep for backward compat) ───────────────────

@router.get("/stats/{company_id}")
def get_dashboard_stats(company_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")
    accts = supabase.table("accounts").select("*").eq("company_id", company_id).execute().data or []
    totals = {"asset": 0, "liability": 0, "equity": 0, "revenue": 0, "expense": 0}
    for a in accts:
        t = a.get("account_type", "")
        if t in totals:
            totals[t] += float(a.get("current_balance") or 0)
    net_position = totals["asset"] - totals["liability"]
    tc = supabase.table("journal_entries").select("id", count="exact").eq("company_id", company_id).execute().count or 0
    hs = min(100, int((totals["asset"] / totals["liability"]) * 50)) if totals["liability"] > 0 else (100 if totals["asset"] > 0 else 0)
    return {"total_income": totals["revenue"], "total_expenses": totals["expense"], "net_position": net_position,
            "total_assets": totals["asset"], "total_liabilities": totals["liability"], "total_equity": totals["equity"],
            "transaction_count": tc, "top_vendor": "N/A", "health_score": hs}


@router.get("/monthly-trend/{company_id}")
def get_monthly_trend(company_id: str, months: int = 6, auth: Dict[str, str] = Depends(get_current_user_company)):
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")
    start_date = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-%d")
    entries = supabase.table("journal_entries").select("id, entry_date, journal_lines(debit, credit, account_id)").eq("company_id", company_id).gte("entry_date", start_date).execute().data or []
    accts = {a["id"]: a["account_type"] for a in (supabase.table("accounts").select("id, account_type").eq("company_id", company_id).execute().data or [])}
    monthly = defaultdict(lambda: {"income": 0, "expenses": 0})
    for e in entries:
        mk = datetime.strptime(e["entry_date"], "%Y-%m-%d").strftime("%b")
        for line in e.get("journal_lines", []):
            at = accts.get(line.get("account_id"), "")
            if at == "revenue":
                monthly[mk]["income"] += float(line.get("credit") or 0)
            elif at == "expense":
                monthly[mk]["expenses"] += float(line.get("debit") or 0)
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    cm = datetime.now().month
    return [{"month": month_names[(cm - months + i) % 12], "income": monthly[month_names[(cm - months + i) % 12]]["income"], "expenses": monthly[month_names[(cm - months + i) % 12]]["expenses"]} for i in range(months)]


@router.get("/category-breakdown/{company_id}")
def get_category_breakdown(company_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")
    accts = supabase.table("accounts").select("account_name, current_balance").eq("company_id", company_id).eq("account_type", "expense").gt("current_balance", 0).execute().data or []
    total = sum(float(a.get("current_balance") or 0) for a in accts)
    return [{"name": a.get("account_name"), "value": round(float(a.get("current_balance") or 0) / total * 100, 1) if total > 0 else 0} for a in accts[:6]]


@router.get("/recent-transactions/{company_id}")
def get_recent_transactions(company_id: str, limit: int = 10, auth: Dict[str, str] = Depends(get_current_user_company)):
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's dashboard")
    return supabase.table("journal_entries").select("id, journal_number, entry_date, memo, total_debit, total_credit, status").eq("company_id", company_id).order("entry_date", desc=True).order("created_at", desc=True).limit(limit).execute().data or []
