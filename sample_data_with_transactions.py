"""
Sample Chart of Accounts and Demo Journal Entries
Run this to populate your system with realistic demo data
"""

import requests
import json
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000"

# First, get or create a company
def get_or_create_company():
    # Check if company exists
    companies = requests.get(f"{API_BASE}/companies/").json()

    if companies.get("data") and len(companies["data", "")) > 0:
        company = companies["data", "")[0]
        print(f"Using existing company: {company['name']} ({company['id']})")
        return company["id", "")

    # Create new company
    company_data = {
        "name": "Demo Tech Startup Inc.",
        "industry": "Technology",
        "fiscal_year_end": "2025-12-31",
        "currency": "USD",
        "address": "123 Innovation Drive",
        "city": "San Francisco",
        "state": "CA",
        "country": "United States",
        "postal_code": "94102"
    }

    response = requests.post(f"{API_BASE}/companies/", json=company_data)
    company = response.json()["data", "")[0]
    print(f"Created company: {company['name']} ({company['id']})")
    return company["id", "")


# Complete Chart of Accounts for a tech startup
def create_chart_of_accounts(company_id):
    print("\n📊 Creating Chart of Accounts...")

    accounts = [
        # ASSETS
        {"account_code": "1000", "account_name": "Cash and Cash Equivalents", "type": "asset", "subtype": "current_asset"},
        {"account_code": "1010", "account_name": "Business Checking Account", "type": "asset", "subtype": "current_asset"},
        {"account_code": "1020", "account_name": "PayPal Balance", "type": "asset", "subtype": "current_asset"},
        {"account_code": "1100", "account_name": "Accounts Receivable", "type": "asset", "subtype": "current_asset"},
        {"account_code": "1200", "account_name": "Prepaid Expenses", "type": "asset", "subtype": "current_asset"},
        {"account_code": "1500", "account_name": "Equipment", "type": "asset", "subtype": "fixed_asset"},
        {"account_code": "1510", "account_name": "Computer Equipment", "type": "asset", "subtype": "fixed_asset"},
        {"account_code": "1520", "account_name": "Office Furniture", "type": "asset", "subtype": "fixed_asset"},

        # LIABILITIES
        {"account_code": "2000", "account_name": "Accounts Payable", "type": "liability", "subtype": "current_liability"},
        {"account_code": "2100", "account_name": "Credit Card", "type": "liability", "subtype": "current_liability"},
        {"account_code": "2200", "account_name": "Accrued Expenses", "type": "liability", "subtype": "current_liability"},
        {"account_code": "2500", "account_name": "Long-term Debt", "type": "liability", "subtype": "long_term_liability"},

        # EQUITY
        {"account_code": "3000", "account_name": "Owner's Equity", "type": "equity", "subtype": "owner_equity"},
        {"account_code": "3100", "account_name": "Retained Earnings", "type": "equity", "subtype": "retained_earnings"},

        # REVENUE
        {"account_code": "4000", "account_name": "Product Sales", "type": "revenue", "subtype": "sales_revenue"},
        {"account_code": "4100", "account_name": "Service Revenue", "type": "revenue", "subtype": "service_revenue"},
        {"account_code": "4200", "account_name": "Subscription Revenue", "type": "revenue", "subtype": "recurring_revenue"},

        # EXPENSES
        {"account_code": "5000", "account_name": "Cost of Goods Sold", "type": "expense", "subtype": "cost_of_sales"},
        {"account_code": "6000", "account_name": "Salaries and Wages", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6100", "account_name": "Rent Expense", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6200", "account_name": "Utilities", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6300", "account_name": "Internet and Phone", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6400", "account_name": "Software Subscriptions", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6500", "account_name": "Marketing and Advertising", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6600", "account_name": "Office Supplies", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6700", "account_name": "Meals and Entertainment", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6800", "account_name": "Travel Expenses", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "6900", "account_name": "Professional Fees", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "7000", "account_name": "Insurance", "type": "expense", "subtype": "operating_expense"},
        {"account_code": "7100", "account_name": "Bank Fees", "type": "expense", "subtype": "operating_expense"},
    ]

    created_accounts = {}
    for account in accounts:
        account["company_id", "") = company_id
        try:
            response = requests.post(f"{API_BASE}/accounts/", json=account)
            if response.status_code == 200:
                created = response.json()
                created_accounts[account["account_code", "")] = created["id", "")
                print(f"  ✓ {account['account_code']} - {account['account_name']}")
            else:
                print(f"  ✗ Failed to create {account['account_code']}: {response.status_code} - {response.text[:100]}")
        except Exception as e:
            print(f"  ✗ Failed to create {account['account_code']}: {e}")

    print(f"\n  📝 Successfully created {len(created_accounts)} accounts")
    return created_accounts


# Create realistic demo journal entries
def create_demo_journal_entries(company_id, accounts):
    print("\n📝 Creating Demo Journal Entries...")

    # Check if we have all required accounts
    required = ["1010", "3000", "1510", "1200", "2100", "4100", "6100", "6200", "6300", "6500", "")
    missing = [code for code in required if code not in accounts]
    if missing:
        print(f"  ⚠️  Missing required accounts: {', '.join(missing)}")
        print("  ⏭️  Skipping journal entries that require these accounts...")
        # Only use accounts that exist
        print(f"  ℹ️  Available accounts: {', '.join(sorted(accounts.keys()))}")

    today = datetime.now()

    journal_entries = [
        # 1. Initial capital investment
        {
            "entry_date": (today - timedelta(days=90)).strftime("%Y-%m-%d"),
            "memo": "Initial capital investment by owner",
            "lines": [
                {"account_id": accounts.get("1010", ""), "debit": 50000, "credit": 0, "description": "Cash deposit"},
                {"account_id": accounts.get("3000", ""), "debit": 0, "credit": 50000, "description": "Owner's equity"},
            ]
        },

        # 2. Purchase computer equipment
        {
            "entry_date": (today - timedelta(days=85)).strftime("%Y-%m-%d"),
            "memo": "Purchase of MacBook Pro and monitors",
            "lines": [
                {"account_id": accounts.get("1510", ""), "debit": 3500, "credit": 0, "description": "Computer equipment"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 3500, "description": "Payment"},
            ]
        },

        # 3. Prepaid annual software subscriptions
        {
            "entry_date": (today - timedelta(days=80)).strftime("%Y-%m-%d"),
            "memo": "Annual software subscriptions (GitHub, Figma, AWS)",
            "lines": [
                {"account_id": accounts.get("1200", ""), "debit": 2400, "credit": 0, "description": "Prepaid subscriptions"},
                {"account_id": accounts.get("2100", ""), "debit": 0, "credit": 2400, "description": "Credit card payment"},
            ]
        },

        # 4. First client project revenue
        {
            "entry_date": (today - timedelta(days=75)).strftime("%Y-%m-%d"),
            "memo": "Consulting project for Acme Corp",
            "lines": [
                {"account_id": accounts.get("1010", ""), "debit": 8500, "credit": 0, "description": "Payment received"},
                {"account_id": accounts.get("4100", ""), "debit": 0, "credit": 8500, "description": "Service revenue"},
            ]
        },

        # 5. Monthly rent payment
        {
            "entry_date": (today - timedelta(days=70)).strftime("%Y-%m-%d"),
            "memo": "Office rent for November",
            "lines": [
                {"account_id": accounts.get("6100", ""), "debit": 2000, "credit": 0, "description": "Rent expense"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 2000, "description": "Payment"},
            ]
        },

        # 6. Utilities and internet
        {
            "entry_date": (today - timedelta(days=65)).strftime("%Y-%m-%d"),
            "memo": "Monthly utilities and internet",
            "lines": [
                {"account_id": accounts.get("6200", ""), "debit": 150, "credit": 0, "description": "Electricity and water"},
                {"account_id": accounts.get("6300", ""), "debit": 120, "credit": 0, "description": "Internet and phone"},
                {"account_id": accounts.get("2100", ""), "debit": 0, "credit": 270, "description": "Credit card"},
            ]
        },

        # 7. Marketing campaign
        {
            "entry_date": (today - timedelta(days=60)).strftime("%Y-%m-%d"),
            "memo": "Google Ads and social media marketing",
            "lines": [
                {"account_id": accounts.get("6500", ""), "debit": 1200, "credit": 0, "description": "Digital advertising"},
                {"account_id": accounts.get("2100", ""), "debit": 0, "credit": 1200, "description": "Credit card"},
            ]
        },

        # 8. Product sale
        {
            "entry_date": (today - timedelta(days=55)).strftime("%Y-%m-%d"),
            "memo": "Sale of software licenses",
            "lines": [
                {"account_id": accounts.get("1020", ""), "debit": 1500, "credit": 0, "description": "PayPal payment"},
                {"account_id": accounts.get("4000", ""), "debit": 0, "credit": 1500, "description": "Product sales"},
            ]
        },

        # 9. Freelancer payment
        {
            "entry_date": (today - timedelta(days=50)).strftime("%Y-%m-%d"),
            "memo": "Payment to freelance designer",
            "lines": [
                {"account_id": accounts.get("6000", ""), "debit": 2500, "credit": 0, "description": "Contract labor"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 2500, "description": "Payment"},
            ]
        },

        # 10. Office supplies
        {
            "entry_date": (today - timedelta(days=45)).strftime("%Y-%m-%d"),
            "memo": "Office supplies from Staples",
            "lines": [
                {"account_id": accounts.get("6600", ""), "debit": 350, "credit": 0, "description": "Supplies"},
                {"account_id": accounts.get("2100", ""), "debit": 0, "credit": 350, "description": "Credit card"},
            ]
        },

        # 11. Subscription revenue
        {
            "entry_date": (today - timedelta(days=40)).strftime("%Y-%m-%d"),
            "memo": "Monthly SaaS subscription payments",
            "lines": [
                {"account_id": accounts.get("1010", ""), "debit": 4200, "credit": 0, "description": "Recurring revenue"},
                {"account_id": accounts.get("4200", ""), "debit": 0, "credit": 4200, "description": "Subscription revenue"},
            ]
        },

        # 12. Client lunch meeting
        {
            "entry_date": (today - timedelta(days=35)).strftime("%Y-%m-%d"),
            "memo": "Business lunch with potential client",
            "lines": [
                {"account_id": accounts.get("6700", ""), "debit": 125, "credit": 0, "description": "Business meal"},
                {"account_id": accounts.get("2100", ""), "debit": 0, "credit": 125, "description": "Credit card"},
            ]
        },

        # 13. Travel for conference
        {
            "entry_date": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
            "memo": "Travel to tech conference",
            "lines": [
                {"account_id": accounts.get("6800", ""), "debit": 1800, "credit": 0, "description": "Flights and hotel"},
                {"account_id": accounts.get("2100", ""), "debit": 0, "credit": 1800, "description": "Credit card"},
            ]
        },

        # 14. Large client project
        {
            "entry_date": (today - timedelta(days=25)).strftime("%Y-%m-%d"),
            "memo": "Major web development project completed",
            "lines": [
                {"account_id": accounts.get("1100", ""), "debit": 15000, "credit": 0, "description": "Accounts receivable"},
                {"account_id": accounts.get("4100", ""), "debit": 0, "credit": 15000, "description": "Service revenue"},
            ]
        },

        # 15. Professional fees (accountant)
        {
            "entry_date": (today - timedelta(days=20)).strftime("%Y-%m-%d"),
            "memo": "Quarterly accounting services",
            "lines": [
                {"account_id": accounts.get("6900", ""), "debit": 800, "credit": 0, "description": "Accounting fees"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 800, "description": "Payment"},
            ]
        },

        # 16. Insurance payment
        {
            "entry_date": (today - timedelta(days=15)).strftime("%Y-%m-%d"),
            "memo": "Business liability insurance",
            "lines": [
                {"account_id": accounts.get("7000", ""), "debit": 600, "credit": 0, "description": "Insurance premium"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 600, "description": "Payment"},
            ]
        },

        # 17. Partial payment from client
        {
            "entry_date": (today - timedelta(days=10)).strftime("%Y-%m-%d"),
            "memo": "Partial payment on invoice",
            "lines": [
                {"account_id": accounts.get("1010", ""), "debit": 7500, "credit": 0, "description": "Payment received"},
                {"account_id": accounts.get("1100", ""), "debit": 0, "credit": 7500, "description": "Reduce AR"},
            ]
        },

        # 18. Credit card payment
        {
            "entry_date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "memo": "Credit card payment",
            "lines": [
                {"account_id": accounts.get("2100", ""), "debit": 5000, "credit": 0, "description": "Pay down credit card"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 5000, "description": "Payment"},
            ]
        },

        # 19. More subscription revenue
        {
            "entry_date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            "memo": "Monthly SaaS subscriptions",
            "lines": [
                {"account_id": accounts.get("1010", ""), "debit": 4500, "credit": 0, "description": "Recurring revenue"},
                {"account_id": accounts.get("4200", ""), "debit": 0, "credit": 4500, "description": "Subscription revenue"},
            ]
        },

        # 20. Bank fees
        {
            "entry_date": today.strftime("%Y-%m-%d"),
            "memo": "Monthly bank service fees",
            "lines": [
                {"account_id": accounts.get("7100", ""), "debit": 25, "credit": 0, "description": "Bank fees"},
                {"account_id": accounts.get("1010", ""), "debit": 0, "credit": 25, "description": "Payment"},
            ]
        },
    ]

    for idx, entry in enumerate(journal_entries, 1):
        entry["company_id", "") = company_id

        # Skip entries that reference missing accounts
        required_accounts = [line["account_id", "") for line in entry["lines", "")]
        if any(acc_id is None or acc_id == "" for acc_id in required_accounts):
            print(f"  ⏭️  Entry {idx} skipped (missing account IDs)")
            continue

        try:
            response = requests.post(f"{API_BASE}/journals/", json=entry)
            if response.status_code == 200:
                print(f"  ✓ Entry {idx}: {entry['memo']}")
            else:
                print(f"  ✗ Entry {idx} failed: {response.status_code} - {entry['memo']}")
        except Exception as e:
            print(f"  ✗ Entry {idx} failed: {e}")


def main():
    print("=" * 60)
    print("  SAMPLE DATA GENERATOR FOR ACCOUNTING SYSTEM")
    print("=" * 60)

    try:
        # Step 1: Get or create company
        company_id = get_or_create_company()

        # Step 2: Create chart of accounts
        accounts = create_chart_of_accounts(company_id)

        if not accounts:
            print("\n❌ Failed to create accounts. Cannot continue.")
            return

        # Step 3: Create demo journal entries
        create_demo_journal_entries(company_id, accounts)

        print("\n" + "=" * 60)
        print("✅ DEMO DATA CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\n📊 View your data:")
        print(f"   Dashboard: http://localhost:3000/new-dashboard")
        print(f"   Journals:  http://localhost:3000/new-journals")
        print(f"   AI Chat:   http://localhost:3000/ai")
        print(f"   COA:       http://localhost:3000/chart-of-accounts")
        print("\n💡 Try asking the AI:")
        print("   - What is my current cash balance?")
        print("   - Show me my revenue breakdown")
        print("   - Which expense categories are the highest?")
        print("   - What's my net income?")
        print()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
