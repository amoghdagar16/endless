"""Simple demo data populator that creates realistic journal entries"""

import json
from datetime import datetime, timedelta
from urllib import request, error

API_BASE = "http://localhost:8000"


def api_get(path):
    """Minimal GET helper that avoids the `requests` dependency."""
    with request.urlopen(f"{API_BASE}{path}") as resp:
        return json.loads(resp.read().decode())


def api_post(path, payload):
    data = json.dumps(payload).encode()
    req = request.Request(
        f"{API_BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


try:
    companies = api_get("/companies/")
except error.URLError as exc:
    raise SystemExit(f"Could not reach backend at {API_BASE}: {exc}") from exc

company_id = companies["data"][0]["id"]
print(f"Using company: {companies['data'][0]['name']}")

accounts_resp = api_get(f"/accounts/company/{company_id}")
accounts = {acc["account_code"]: acc["id"] for acc in accounts_resp}

print(f"\n✅ Found {len(accounts)} existing accounts")
print(f"Account codes: {', '.join(sorted(accounts.keys()))}\n")

# Create simple demo journal entries using ONLY the accounts that exist
today = datetime.now()

entries = []

# Only create entries if we have the necessary accounts
if "1010" in accounts and "3000" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=90)).strftime("%Y-%m-%d"),
        "memo": "Initial capital investment",
        "lines": [
            {"account_id": accounts["1010"], "debit": 50000, "credit": 0, "description": "Cash"},
            {"account_id": accounts["3000"], "debit": 0, "credit": 50000, "description": "Owner equity"},
        ]
    })

if "1510" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=80)).strftime("%Y-%m-%d"),
        "memo": "Purchase computer equipment",
        "lines": [
            {"account_id": accounts["1510"], "debit": 3500, "credit": 0, "description": "Equipment"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 3500, "description": "Cash payment"},
        ]
    })

if "6100" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=70)).strftime("%Y-%m-%d"),
        "memo": "Office rent payment",
        "lines": [
            {"account_id": accounts["6100"], "debit": 2000, "credit": 0, "description": "Rent expense"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 2000, "description": "Cash payment"},
        ]
    })

if "6200" in accounts and "6300" in accounts and "2100" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=65)).strftime("%Y-%m-%d"),
        "memo": "Monthly utilities and internet",
        "lines": [
            {"account_id": accounts["6200"], "debit": 150, "credit": 0, "description": "Utilities"},
            {"account_id": accounts["6300"], "debit": 120, "credit": 0, "description": "Internet"},
            {"account_id": accounts["2100"], "debit": 0, "credit": 270, "description": "Credit card"},
        ]
    })

if "6500" in accounts and "2100" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=60)).strftime("%Y-%m-%d"),
        "memo": "Marketing campaign",
        "lines": [
            {"account_id": accounts["6500"], "debit": 1200, "credit": 0, "description": "Advertising"},
            {"account_id": accounts["2100"], "debit": 0, "credit": 1200, "description": "Credit card"},
        ]
    })

if "6000" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=50)).strftime("%Y-%m-%d"),
        "memo": "Freelancer payment",
        "lines": [
            {"account_id": accounts["6000"], "debit": 2500, "credit": 0, "description": "Contract labor"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 2500, "description": "Cash payment"},
        ]
    })

if "6600" in accounts and "2100" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=45)).strftime("%Y-%m-%d"),
        "memo": "Office supplies purchase",
        "lines": [
            {"account_id": accounts["6600"], "debit": 350, "credit": 0, "description": "Supplies"},
            {"account_id": accounts["2100"], "debit": 0, "credit": 350, "description": "Credit card"},
        ]
    })

if "6700" in accounts and "2100" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=35)).strftime("%Y-%m-%d"),
        "memo": "Client business lunch",
        "lines": [
            {"account_id": accounts["6700"], "debit": 125, "credit": 0, "description": "Business meal"},
            {"account_id": accounts["2100"], "debit": 0, "credit": 125, "description": "Credit card"},
        ]
    })

if "6800" in accounts and "2100" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
        "memo": "Conference travel",
        "lines": [
            {"account_id": accounts["6800"], "debit": 1800, "credit": 0, "description": "Travel"},
            {"account_id": accounts["2100"], "debit": 0, "credit": 1800, "description": "Credit card"},
        ]
    })

if "6900" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=20)).strftime("%Y-%m-%d"),
        "memo": "Professional fees",
        "lines": [
            {"account_id": accounts["6900"], "debit": 800, "credit": 0, "description": "Accounting fees"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 800, "description": "Cash payment"},
        ]
    })

if "7000" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=15)).strftime("%Y-%m-%d"),
        "memo": "Insurance payment",
        "lines": [
            {"account_id": accounts["7000"], "debit": 600, "credit": 0, "description": "Insurance"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 600, "description": "Cash payment"},
        ]
    })

if "2100" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
        "memo": "Credit card payment",
        "lines": [
            {"account_id": accounts["2100"], "debit": 5000, "credit": 0, "description": "Pay down card"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 5000, "description": "Cash payment"},
        ]
    })

if "7100" in accounts and "1010" in accounts:
    entries.append({
        "entry_date": today.strftime("%Y-%m-%d"),
        "memo": "Monthly bank fees",
        "lines": [
            {"account_id": accounts["7100"], "debit": 25, "credit": 0, "description": "Bank fees"},
            {"account_id": accounts["1010"], "debit": 0, "credit": 25, "description": "Cash payment"},
        ]
    })

print(f"📝 Creating {len(entries)} journal entries...\n")

for idx, entry in enumerate(entries, 1):
    entry["company_id"] = company_id
    try:
        api_post("/journals/", entry)
        print(f"  ✓ Entry {idx}: {entry['memo']}")
    except error.HTTPError as exc:
        body = exc.read().decode()
        print(f"  ✗ Entry {idx} failed ({exc.code}): {body}")
    except Exception as exc:
        print(f"  ✗ Entry {idx} failed: {exc}")

print("\n✅ Done! Check http://localhost:3000/new-dashboard")
print("💬 Try the AI at http://localhost:3000/ai")
