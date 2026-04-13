"""Check account balances after journal entries"""
import requests

API_BASE = "http://localhost:8000"

# Get company
companies = requests.get(f"{API_BASE}/companies/").json()
company_id = companies["data"][0]["id"]

# Get accounts with balances
accounts_resp = requests.get(f"{API_BASE}/accounts/company/{company_id}").json()

print("\nAccounts with balances:")
print("=" * 80)
for acc in sorted(accounts_resp, key=lambda x: x["account_code"]):
    balance = acc.get("current_balance", 0) or 0
    if balance != 0:
        print(f"{acc['account_code']:5s} {acc['account_name']:35s} ${balance:>12,.2f}")

print("\n" + "=" * 80)
print("\nSummary by Account Type:")
print("=" * 80)

totals = {}
for acc in accounts_resp:
    acc_type = acc["account_type"]
    balance = acc.get("current_balance", 0) or 0
    if acc_type not in totals:
        totals[acc_type] = 0
    totals[acc_type] += balance

for acc_type, total in sorted(totals.items()):
    print(f"{acc_type.capitalize():20s} ${total:>12,.2f}")

print("\nAccounting Equation Check:")
print(f"  Assets:       ${totals.get('asset', 0):>12,.2f}")
print(f"  Liabilities:  ${totals.get('liability', 0):>12,.2f}")
print(f"  Equity:       ${totals.get('equity', 0):>12,.2f}")
print(f"  Assets - (Liab + Equity) = ${totals.get('asset', 0) - (totals.get('liability', 0) + totals.get('equity', 0)):>12,.2f}")
