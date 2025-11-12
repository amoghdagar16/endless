# Database Access Guide - Chart of Accounts

This guide shows you multiple ways to view and access the Chart of Accounts data stored in your PostgreSQL database.

## Quick Start

### Using the convenience script (Easiest):

```bash
# Show summary count by type
./view_db.sh count

# View all accounts
./view_db.sh all

# View only asset accounts
./view_db.sh assets

# View only liability accounts
./view_db.sh liabilities

# View only other type accounts
./view_db.sh other

# Search for accounts
./view_db.sh search "Cash"
./view_db.sh search "2000"
```

## Method 1: Shell Script (`view_db.sh`)

The convenience script provides quick access to common queries.

**Commands:**
- `all` - Show all 140 accounts in tabular format
- `assets` - Show only asset accounts (24 accounts)
- `liabilities` - Show only liability accounts (32 accounts)
- `other` - Show only other type accounts (84 accounts)
- `search <term>` - Search by account name or number
- `count` - Show summary statistics

**Example Output:**
```
=== ACCOUNT COUNT BY TYPE ===
+----------------+---------+
| Account Type   |   Count |
+================+=========+
| asset          |      24 |
| liability      |      32 |
| other          |      84 |
+----------------+---------+
Total Accounts: 140
```

## Method 2: Direct Python Script

Run custom queries directly from the backend directory:

```bash
cd backend
source ../.venv/bin/activate

python << 'EOF'
from sqlalchemy import create_engine, text
from app.core.settings import get_settings
from tabulate import tabulate

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT number, name, type, detail_type
        FROM accounts
        WHERE company_id = :company_id
        ORDER BY number
        LIMIT 10
    '''), {'company_id': '00000000-0000-0000-0000-000000000001'})
    
    rows = result.fetchall()
    print(tabulate(rows, headers=['Number', 'Name', 'Type', 'Detail'], tablefmt='grid'))
EOF
```

## Method 3: REST API

Access accounts through your FastAPI endpoints:

### View all accounts (flat list):
```bash
curl -X GET 'http://127.0.0.1:8000/v1/accounts' \
  -H 'X-Company-Id: 00000000-0000-0000-0000-000000000001' | jq
```

### View accounts in hierarchy:
```bash
curl -X GET 'http://127.0.0.1:8000/v1/accounts?hierarchy=true' \
  -H 'X-Company-Id: 00000000-0000-0000-0000-000000000001' | jq
```

### Export to CSV:
```bash
curl -X GET 'http://127.0.0.1:8000/v1/accounts/export' \
  -H 'X-Company-Id: 00000000-0000-0000-0000-000000000001' \
  > exported_coa.csv
```

### Count accounts:
```bash
curl -X GET 'http://127.0.0.1:8000/v1/accounts' \
  -H 'X-Company-Id: 00000000-0000-0000-0000-000000000001' | jq '.accounts | length'
```

## Method 4: PostgreSQL Command Line (if psql is installed)

If you have PostgreSQL client tools installed:

```bash
psql postgresql://app_user:app_password@localhost:5432/ai_accounting

# Then run SQL queries:
SELECT number, name, type FROM accounts ORDER BY number LIMIT 10;
\d accounts  -- Show table structure
\q           -- Quit
```

## Database Schema

The `accounts` table has the following structure:

| Column                | Type         | Description                           |
|-----------------------|--------------|---------------------------------------|
| id                    | UUID         | Primary key                           |
| company_id            | UUID         | Foreign key to companies              |
| number                | VARCHAR(32)  | Account number (e.g., "1000")         |
| name                  | VARCHAR(255) | Account name (e.g., "Assets")         |
| type                  | ENUM         | asset, liability, equity, etc.        |
| detail_type           | VARCHAR(64)  | Sub-type (e.g., "bank", "ar", "ap")   |
| parent_id             | UUID         | Parent account for hierarchy          |
| is_active             | BOOLEAN      | Whether account is active             |
| opening_balance       | NUMERIC      | Opening balance amount                |
| opening_balance_date  | DATE         | Date of opening balance               |

## Common Queries

### Find specific account:
```bash
./view_db.sh search "1000"
```

### View all cash-related accounts:
```bash
./view_db.sh search "Cash"
```

### Get account hierarchy for assets:
```bash
curl -X GET 'http://127.0.0.1:8000/v1/accounts?hierarchy=true' \
  -H 'X-Company-Id: 00000000-0000-0000-0000-000000000001' | \
  jq '.accounts[] | select(.type == "asset")'
```

## Database Connection Details

- **Host:** localhost (or 127.0.0.1)
- **Port:** 5432
- **Database:** ai_accounting
- **User:** app_user
- **Password:** app_password
- **Connection String:** `postgresql://app_user:app_password@localhost:5432/ai_accounting`

## Current Data Status

✅ **Total Accounts:** 140
- Assets: 24
- Liabilities: 32
- Other: 84

✅ **Source:** coa_converted_corrected.csv
✅ **Import Status:** Successfully imported with correct account types and hierarchy
✅ **Data Integrity:** All parent-child relationships preserved

## Troubleshooting

**If view_db.sh doesn't work:**
1. Make sure you're in the project root directory
2. Check that the virtual environment exists: `ls .venv/`
3. Verify database is running and accessible
4. Check backend settings in `backend/app/core/settings.py`

**If API returns errors:**
1. Ensure the backend server is running: check for process on port 8000
2. Verify company_id exists in the database
3. Check server logs for detailed error messages

**If database connection fails:**
1. Verify PostgreSQL is running (check docker or local service)
2. Test connection string with psql
3. Check firewall settings for port 5432
