"""Test journal entry creation"""
import requests
import json

API_BASE = "http://localhost:8000"

# Use first company
companies = requests.get(f"{API_BASE}/companies/").json()
company_id = companies["data"][0]["id"]
print(f"Using company: {companies['data'][0]['name']} ({company_id})")

# Get accounts
accounts_resp = requests.get(f"{API_BASE}/accounts/company/{company_id}").json()
print(f"\nFound {len(accounts_resp)} accounts")

# Get first two accounts
if len(accounts_resp) >= 2:
    acc1 = accounts_resp[0]
    acc2 = accounts_resp[1]
    print(f"Account 1: {acc1['account_code']} - {acc1['account_name']}")
    print(f"Account 2: {acc2['account_code']} - {acc2['account_name']}")

    # Create test journal entry
    print("\nCreating journal entry...")
    journal_data = {
        "company_id": company_id,
        "entry_date": "2024-12-04",
        "memo": "Test entry - initial capital",
        "lines": [
            {
                "account_id": acc1["id"],
                "debit": 10000,
                "credit": 0,
                "description": "Cash deposit"
            },
            {
                "account_id": acc2["id"],
                "debit": 0,
                "credit": 10000,
                "description": "From capital"
            }
        ]
    }

    try:
        response = requests.post(f"{API_BASE}/journals/", json=journal_data)
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"✓ Journal entry created successfully!")
            print(f"Journal Number: {result.get('journal_number')}")
            print(f"Total Debit: {result.get('total_debit')}")
            print(f"Total Credit: {result.get('total_credit')}")
        else:
            print(f"✗ Failed: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
else:
    print("Not enough accounts found")
