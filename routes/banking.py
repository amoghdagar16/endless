"""
Banking: Plaid Link, token exchange, transaction sync, categorize, post to journal.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import date, datetime
from database import supabase
from middleware.auth import get_current_user_company
import os

router = APIRouter(prefix="/bank", tags=["Banking"])

# ── Plaid client setup ─────────────────────────────────────────────

def _plaid_client():
    try:
        from plaid.api import plaid_api
        from plaid.configuration import Configuration
        from plaid.api_client import ApiClient

        env = os.getenv("PLAID_ENV", "sandbox")
        env_map = {
            "sandbox": "https://sandbox.plaid.com",
            "development": "https://development.plaid.com",
            "production": "https://production.plaid.com",
        }
        config = Configuration(
            host=env_map.get(env, "https://sandbox.plaid.com"),
            api_key={
                "clientId": os.getenv("PLAID_CLIENT_ID", ""),
                "secret": os.getenv("PLAID_SECRET", ""),
            },
        )
        return plaid_api.PlaidApi(ApiClient(config))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plaid client init failed: {e}")


# ── Plaid: Link Token ──────────────────────────────────────────────

@router.post("/plaid/link-token")
def create_link_token(auth: Dict[str, str] = Depends(get_current_user_company)):
    from plaid.model.link_token_create_request import LinkTokenCreateRequest
    from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
    from plaid.model.products import Products
    from plaid.model.country_code import CountryCode

    client = _plaid_client()
    user_id = auth["user_id"]
    try:
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=user_id),
            client_name="Fintra Finance OS",
            products=[Products("transactions"), Products("auth")],
            country_codes=[CountryCode("US")],
            language="en",
        )
        response = client.link_token_create(request)
        return {"link_token": response["link_token"]}
    except Exception as e:
        import json
        try:
            body = json.loads(e.body) if hasattr(e, "body") else {}
            msg = body.get("error_message") or body.get("display_message") or str(e)
        except Exception:
            msg = str(e)
        raise HTTPException(status_code=400, detail=msg)


# ── Plaid: Exchange Token + Import Accounts ────────────────────────

class ExchangeTokenBody(BaseModel):
    public_token: str
    institution_name: str
    institution_id: Optional[str] = None
    account_ids: Optional[List[str]] = None  # Plaid account IDs selected by user


@router.post("/plaid/exchange-token")
def exchange_token(body: ExchangeTokenBody, auth: Dict[str, str] = Depends(get_current_user_company)):
    from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
    from plaid.model.accounts_get_request import AccountsGetRequest

    client = _plaid_client()
    company_id = auth["company_id"]
    user_id = auth["user_id"]

    # 1. Exchange public token for access token
    try:
        exchange_resp = client.item_public_token_exchange(
            ItemPublicTokenExchangeRequest(public_token=body.public_token)
        )
        access_token = exchange_resp["access_token"]
        item_id = exchange_resp["item_id"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    # 2. Save connection to DB
    conn_row = supabase.table("bank_connections").insert({
        "company_id": company_id,
        "user_id": user_id,
        "provider": "plaid",
        "provider_item_id": item_id,
        "provider_access_token": access_token,
        "institution_name": body.institution_name,
        "status": "active",
    }).execute().data
    if not conn_row:
        raise HTTPException(status_code=400, detail="Failed to save connection")
    connection_id = conn_row[0]["id"]

    # 3. Pull accounts from Plaid
    try:
        accts_resp = client.accounts_get(AccountsGetRequest(access_token=access_token))
        plaid_accounts = accts_resp["accounts"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch accounts: {e}")

    # 4. Save each Plaid account as bank_account
    created_accounts = []
    for acct in plaid_accounts:
        if body.account_ids and acct["account_id"] not in body.account_ids:
            continue
        balances = acct.get("balances", {})
        row = supabase.table("bank_accounts").insert({
            "company_id": company_id,
            "connection_id": connection_id,
            "provider_account_id": acct["account_id"],
            "name": acct.get("name", "Account"),
            "mask": acct.get("mask"),
            "type": _map_account_type(str(acct.get("type", "depository"))),
            "account_subtype": str(acct.get("subtype", "")),
            "institution_name": body.institution_name,
            "balance_current": float(balances.get("current") or 0),
            "balance_available": float(balances.get("available") or 0) if balances.get("available") is not None else None,
            "is_active": True,
        }).execute().data
        if row:
            created_accounts.append(row[0])

    # 5. Trigger initial transaction sync
    _sync_transactions(connection_id, access_token, company_id)

    return {
        "connection_id": connection_id,
        "accounts": created_accounts,
        "institution_name": body.institution_name,
    }


def _map_account_type(plaid_type: str) -> str:
    mapping = {
        "depository": "checking",
        "credit": "credit_card",
        "loan": "loan",
        "investment": "investment",
        "other": "other",
    }
    return mapping.get(plaid_type, "checking")


# ── Plaid: Sync Transactions ───────────────────────────────────────

def _sync_transactions(connection_id: str, access_token: str, company_id: str):
    from plaid.model.transactions_sync_request import TransactionsSyncRequest

    client = _plaid_client()

    # Get current cursor from DB
    conn = supabase.table("bank_connections").select("sync_cursor").eq("id", connection_id).single().execute()
    cursor = conn.data.get("sync_cursor") if conn.data else None

    # Get bank_accounts for this connection (to map provider_account_id → our id)
    ba_rows = supabase.table("bank_accounts").select("id, provider_account_id").eq("connection_id", connection_id).execute().data or []
    acct_map = {ba["provider_account_id"]: ba["id"] for ba in ba_rows}

    added_count = 0
    has_more = True

    while has_more:
        req_params = {"access_token": access_token}
        if cursor:
            req_params["cursor"] = cursor

        try:
            resp = client.transactions_sync(TransactionsSyncRequest(**req_params))
        except Exception:
            break

        # Process added transactions
        for txn in resp.get("added", []):
            ba_id = acct_map.get(txn.get("account_id"))
            if not ba_id:
                continue
            prov_id = txn.get("transaction_id")
            amount = float(txn.get("amount") or 0)  # Plaid: positive = debit/outflow, negative = credit/inflow
            row_data = {
                "company_id": company_id,
                "bank_account_id": ba_id,
                "provider_transaction_id": prov_id,
                "posted_date": str(txn.get("date") or date.today()),
                "name": txn.get("name", "Transaction"),
                "merchant_name": txn.get("merchant_name"),
                "amount": abs(amount),
                "pending": bool(txn.get("pending", False)),
                "status": "unreviewed",
                "raw": {
                    "plaid_amount": amount,
                    "is_outflow": amount > 0,
                    "category": txn.get("category", []),
                    "payment_channel": txn.get("payment_channel"),
                },
            }
            # Upsert to avoid duplicates
            supabase.table("bank_transactions").upsert(row_data, on_conflict="company_id,provider_transaction_id").execute()
            added_count += 1

        # Process modified
        for txn in resp.get("modified", []):
            prov_id = txn.get("transaction_id")
            amount = float(txn.get("amount") or 0)
            supabase.table("bank_transactions").update({
                "name": txn.get("name", "Transaction"),
                "merchant_name": txn.get("merchant_name"),
                "amount": abs(amount),
                "pending": bool(txn.get("pending", False)),
                "raw": {
                    "plaid_amount": amount,
                    "is_outflow": amount > 0,
                    "category": txn.get("category", []),
                },
            }).eq("provider_transaction_id", prov_id).eq("company_id", company_id).execute()

        # Process removed
        for txn in resp.get("removed", []):
            prov_id = txn.get("transaction_id")
            supabase.table("bank_transactions").delete().eq("provider_transaction_id", prov_id).eq("company_id", company_id).execute()

        cursor = resp.get("next_cursor")
        has_more = bool(resp.get("has_more", False))

    # Save updated cursor
    supabase.table("bank_connections").update({
        "sync_cursor": cursor,
        "last_sync_at": datetime.utcnow().isoformat(),
    }).eq("id", connection_id).execute()

    return added_count


@router.post("/plaid/sync/{connection_id}")
def sync_connection(connection_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    company_id = auth["company_id"]
    conn = supabase.table("bank_connections").select("provider_access_token, status").eq("id", connection_id).eq("company_id", company_id).single().execute()
    if not conn.data:
        raise HTTPException(status_code=404, detail="Connection not found")
    access_token = conn.data.get("provider_access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token for this connection")
    count = _sync_transactions(connection_id, access_token, company_id)

    # Also refresh balances
    _refresh_balances(connection_id, access_token, company_id)

    return {"synced": count}


def _refresh_balances(connection_id: str, access_token: str, company_id: str):
    from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
    client = _plaid_client()
    try:
        resp = client.accounts_balance_get(AccountsBalanceGetRequest(access_token=access_token))
        for acct in resp.get("accounts", []):
            balances = acct.get("balances", {})
            supabase.table("bank_accounts").update({
                "balance_current": float(balances.get("current") or 0),
                "balance_available": float(balances.get("available") or 0) if balances.get("available") is not None else None,
            }).eq("provider_account_id", acct["account_id"]).eq("company_id", company_id).execute()
    except Exception:
        pass


# ── Connections ────────────────────────────────────────────────────

@router.get("/connections")
def list_connections(auth: Dict[str, str] = Depends(get_current_user_company)):
    cid = auth["company_id"]
    rows = supabase.table("bank_connections").select("id, institution_name, status, last_sync_at, created_at").eq("company_id", cid).execute().data or []
    return rows


@router.delete("/connections/{connection_id}")
def disconnect_connection(connection_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    from plaid.model.item_remove_request import ItemRemoveRequest
    company_id = auth["company_id"]

    conn = supabase.table("bank_connections").select("provider_access_token, provider_item_id").eq("id", connection_id).eq("company_id", company_id).single().execute()
    if not conn.data:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Remove from Plaid
    try:
        client = _plaid_client()
        client.item_remove(ItemRemoveRequest(access_token=conn.data["provider_access_token"]))
    except Exception:
        pass  # still remove from DB even if Plaid call fails

    supabase.table("bank_connections").delete().eq("id", connection_id).eq("company_id", company_id).execute()
    return {"ok": True}


# ── Bank Accounts ──────────────────────────────────────────────────

@router.get("/accounts")
def list_bank_accounts(auth: Dict[str, str] = Depends(get_current_user_company)):
    cid = auth["company_id"]
    rows = supabase.table("bank_accounts").select(
        "*, accounts(id, account_code, account_name)"
    ).eq("company_id", cid).eq("is_active", True).execute().data or []

    # Attach pending counts
    for row in rows:
        count_res = supabase.table("bank_transactions").select("id", count="exact").eq("bank_account_id", row["id"]).eq("status", "unreviewed").execute()
        row["pending_count"] = count_res.count or 0
    return rows


@router.patch("/accounts/{account_id}")
def update_bank_account(account_id: str, body: dict, auth: Dict[str, str] = Depends(get_current_user_company)):
    cid = auth["company_id"]
    allowed = {"name", "linked_account_id", "is_active"}
    data = {k: v for k, v in body.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No valid fields")
    row = supabase.table("bank_accounts").update(data).eq("id", account_id).eq("company_id", cid).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return row.data[0]


# ── Bank Transactions ──────────────────────────────────────────────

@router.get("/transactions")
def list_transactions(
    bank_account_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    cid = auth["company_id"]
    q = supabase.table("bank_transactions").select(
        "*, bank_accounts(id, name, mask, type, institution_name)"
    ).eq("company_id", cid)

    if bank_account_id:
        q = q.eq("bank_account_id", bank_account_id)
    if status:
        # pending = unreviewed + pending=true; posted = reviewed/matched; excluded = excluded
        if status == "pending":
            q = q.in_("status", ["unreviewed"])
        elif status == "posted":
            q = q.in_("status", ["reviewed", "matched"])
        elif status == "excluded":
            q = q.eq("status", "excluded")
        else:
            q = q.eq("status", status)
    if search:
        q = q.ilike("name", f"%{search}%")
    if date_from:
        q = q.gte("posted_date", date_from)
    if date_to:
        q = q.lte("posted_date", date_to)

    result = q.order("posted_date", desc=True).range(offset, offset + limit - 1).execute()
    rows = result.data or []

    # Enrich with is_outflow from raw
    for row in rows:
        raw = row.get("raw") or {}
        row["is_outflow"] = raw.get("is_outflow", True)
        row["plaid_category"] = raw.get("category", [])

    return {"transactions": rows, "total": len(rows)}


@router.patch("/transactions/{txn_id}")
def update_transaction(txn_id: str, body: dict, auth: Dict[str, str] = Depends(get_current_user_company)):
    cid = auth["company_id"]
    allowed = {"user_selected_account_id", "memo", "status", "suggested_account_id"}
    data = {k: v for k, v in body.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No valid fields")
    row = supabase.table("bank_transactions").update(data).eq("id", txn_id).eq("company_id", cid).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return row.data[0]


@router.post("/transactions/{txn_id}/exclude")
def exclude_transaction(txn_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    cid = auth["company_id"]
    row = supabase.table("bank_transactions").update({"status": "excluded"}).eq("id", txn_id).eq("company_id", cid).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return row.data[0]


@router.post("/transactions/{txn_id}/undo-exclude")
def undo_exclude(txn_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    cid = auth["company_id"]
    row = supabase.table("bank_transactions").update({"status": "unreviewed"}).eq("id", txn_id).eq("company_id", cid).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return row.data[0]


class PostTransactionBody(BaseModel):
    account_id: str          # GL account to post against (debit or credit)
    bank_gl_id: Optional[str] = None  # override / set bank's GL account
    memo: Optional[str] = None
    entry_date: Optional[str] = None


@router.post("/transactions/{txn_id}/post")
def post_transaction(txn_id: str, body: PostTransactionBody, auth: Dict[str, str] = Depends(get_current_user_company)):
    """Create a journal entry from a bank transaction and mark it as reviewed."""
    import traceback
    cid = auth["company_id"]
    user_id = auth["user_id"]

    try:
        return _do_post_transaction(txn_id, body, cid, user_id)
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print(f"POST TRANSACTION ERROR:\n{tb}")
        raise HTTPException(status_code=400, detail=str(e))


def _do_post_transaction(txn_id: str, body: PostTransactionBody, cid: str, user_id: str):
    # Load transaction
    txn = supabase.table("bank_transactions").select(
        "*, bank_accounts(id, linked_account_id, name, mask)"
    ).eq("id", txn_id).eq("company_id", cid).single().execute()
    if not txn.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    t = txn.data
    ba = t.get("bank_accounts") or {}

    # Determine GL account for the bank side
    bank_gl_id = body.bank_gl_id or ba.get("linked_account_id")
    if not bank_gl_id:
        raise HTTPException(status_code=400, detail="Select a bank GL account to post this transaction.")

    # If a new bank_gl_id was provided, save it to the bank account for future transactions
    if body.bank_gl_id and ba.get("id"):
        supabase.table("bank_accounts").update({"linked_account_id": body.bank_gl_id}).eq("id", ba["id"]).execute()

    amount = float(t["amount"])
    is_outflow = (t.get("raw") or {}).get("is_outflow", True)
    entry_date = body.entry_date or t["posted_date"]
    memo = body.memo or t.get("memo") or t["name"]

    # Build journal lines
    # Outflow (expense): Debit expense account, Credit bank
    # Inflow (revenue): Debit bank, Credit revenue/income account
    if is_outflow:
        lines = [
            {"account_id": body.account_id, "debit": amount, "credit": 0, "memo": memo},
            {"account_id": bank_gl_id, "debit": 0, "credit": amount, "memo": memo},
        ]
    else:
        lines = [
            {"account_id": bank_gl_id, "debit": amount, "credit": 0, "memo": memo},
            {"account_id": body.account_id, "debit": 0, "credit": amount, "memo": memo},
        ]

    # Generate journal number
    count_res = supabase.table("journal_entries").select("id", count="exact").eq("company_id", cid).execute()
    je_number = f"JE-{(count_res.count or 0) + 1:04d}"

    # Create journal entry as draft first (trigger blocks lines on posted JEs)
    je = supabase.table("journal_entries").insert({
        "company_id": cid,
        "journal_number": je_number,
        "entry_date": entry_date,
        "memo": memo,
        "status": "draft",
        "source": "bank",
    }).execute()
    if not je.data:
        raise HTTPException(status_code=400, detail="Failed to create journal entry")
    je_id = je.data[0]["id"]

    # Insert lines while entry is still draft
    for i, line in enumerate(lines, start=1):
        try:
            supabase.table("journal_lines").insert({
                "journal_entry_id": je_id,
                "line_number": i,
                "account_id": line["account_id"],
                "debit": line["debit"],
                "credit": line["credit"],
                "description": line.get("memo", ""),
            }).execute()
        except Exception as le:
            raise HTTPException(status_code=400, detail=f"Failed to insert journal line: {le}")

    # Now post the entry (triggers balance updates)
    supabase.table("journal_entries").update({"status": "posted"}).eq("id", je_id).execute()

    # Mark transaction as reviewed + store match
    supabase.table("bank_transactions").update({
        "status": "reviewed",
        "user_selected_account_id": body.account_id,
    }).eq("id", txn_id).execute()

    # Record match (table may not exist yet if migration 008 hasn't run)
    try:
        supabase.table("bank_transaction_matches").upsert({
            "bank_transaction_id": txn_id,
            "journal_entry_id": je_id,
            "matched_by": user_id,
            "match_type": "created",
        }, on_conflict="bank_transaction_id").execute()
    except Exception:
        pass

    return {"journal_entry_id": je_id, "journal_number": je_number}


# ── GL Accounts list (for categorization dropdown) ─────────────────

@router.get("/gl-accounts")
def get_gl_accounts(auth: Dict[str, str] = Depends(get_current_user_company)):
    """Return all GL accounts suitable for categorizing bank transactions."""
    cid = auth["company_id"]
    rows = supabase.table("accounts").select(
        "id, account_code, account_name, account_type, account_subtype"
    ).eq("company_id", cid).order("account_code").execute().data or []
    return rows
