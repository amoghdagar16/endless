# AI Accounting System - Quick Reference Guide

**Version:** v21.1 | **Date:** Nov 5, 2025 | **Status:** COA Import Fully Functional

---

## 🎯 What We Have

A **FastAPI-based double-entry accounting system** with PostgreSQL backend.

### ✅ Working Features
- Chart of Accounts (COA) import/export (CSV/XLSX)
- Account hierarchy management
- Transaction posting with debit/credit validation
- Period management (open/soft-close/lock)
- Opening balances
- Financial reports (Trial Balance, Balance Sheet, P&L)
- Multi-company support
- Audit logging

---

## 🗂️ Database Schema (6 Tables)

```
companies (1 record)
  └─ accounts (140 records) ← Parent/child hierarchy
       └─ transaction_lines
            └─ transactions
       └─ periods
       └─ audit_log
```

### Key Tables

**accounts** (140 records)
- Types: asset, liability, equity, income, expense, other
- Hierarchical via parent_id
- Opening balances for balance sheet accounts
- **Current data:** 24 assets, 32 liabilities, 84 other

**transactions** + **transaction_lines**
- Double-entry bookkeeping
- Each line: debit XOR credit
- Must balance: Σdebits = Σcredits

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI (Python 3.12) |
| **ORM** | SQLAlchemy 2.0 + psycopg3 |
| **Database** | PostgreSQL 16 |
| **Server** | Uvicorn (ASGI) |
| **Validation** | Pydantic v2 |
| **Migrations** | Alembic |

**Connection:** `postgresql+psycopg://app_user:app_password@localhost:5432/ai_accounting`

---

## 📡 API Endpoints

**Base:** `http://127.0.0.1:8000`  
**Header Required:** `X-Company-Id: 00000000-0000-0000-0000-000000000001`

### Accounts
```
POST   /v1/accounts/import?dry_run={bool}  # Import COA (CSV/XLSX)
GET    /v1/accounts?hierarchy={bool}       # List accounts
GET    /v1/accounts/export                 # Export CSV
```

### Periods
```
POST   /v1/periods/soft-close  # Soft close period
POST   /v1/periods/lock        # Lock period
```

### Transactions
```
POST   /v1/opening-balances    # Post opening balances
```

### Reports
```
GET    /v1/reports/trial-balance
GET    /v1/reports/balance-sheet
GET    /v1/reports/profit-loss
```

---

## 📁 File Structure (Critical Files)

```
backend/app/
├── main.py                           # FastAPI app (58 lines)
├── core/
│   ├── settings.py                   # Config & env vars
│   ├── exceptions.py                 # Custom exceptions
│   └── db.py                         # DB session
├── db/models/
│   ├── account.py                    # ⚠️ CRITICAL: Contains enum fix
│   ├── transaction.py
│   ├── transaction_line.py
│   ├── period.py
│   ├── company.py
│   └── types.py                      # Enum definitions
├── services/
│   ├── coa_import.py                 # ⚠️ CRITICAL: 422 lines, COA logic
│   ├── posting.py                    # Transaction posting (178 lines)
│   ├── periods.py                    # Period management (118 lines)
│   ├── reports.py                    # Financial reports (159 lines)
│   └── audit.py                      # Audit logging
└── api/v1/routes/
    ├── accounts.py                   # ⚠️ CRITICAL: COA endpoints (122 lines)
    ├── periods.py
    ├── opening_balances.py
    └── reports.py
```

---

## 🐛 Recent Critical Fixes (Nov 5, 2025)

### Fix #1: Account Type Enum Bug
**Problem:** `invalid input value for enum account_type: "ASSET"`

**Cause:** SQLAlchemy using enum names (ASSET) instead of values (asset)

**Solution:** Added `values_callable` to enum column:
```python
# backend/app/db/models/account.py
type: Mapped[AccountType] = mapped_column(
    Enum(AccountType, name="account_type", create_type=False,
         values_callable=lambda x: [e.value for e in x]),  # ← FIX
    nullable=False
)
```

### Fix #2: Account API Response Format
**Problem:** Pydantic validation error on account listing

**Solution:** Changed from Pydantic schema to plain dict with camelCase:
```python
# backend/app/api/v1/routes/accounts.py
return {
    "accounts": [
        {
            "companyId": str(acct.company_id),  # camelCase
            "parentId": str(acct.parent_id),
            ...
        }
    ]
}
```

---

## 🔄 COA Import Flow

```
1. Client uploads CSV/XLSX
   ↓
2. parse_coa_bytes() → Parse file, normalize types
   ↓
3. validate_accounts() → Check types, parents, balances
   ↓
4. apply_import() → Order by dependencies, insert to DB
   ↓
5. audit_log records action
   ↓
6. Return success (inserted count)
```

**CSV Format:**
```csv
number,name,type,detail_type,parent_number,is_active,opening_balance,opening_balance_date
1000,Assets,asset,group,,True,,
1010,Cash,asset,bank,1000,True,5000.00,2024-01-01
```

---

## 💾 Database Access Tools

**Quick View:**
```bash
./view_db.sh count          # Summary stats
./view_db.sh all            # All 140 accounts
./view_db.sh assets         # Assets only
./view_db.sh search "Cash"  # Search
```

**Via API:**
```bash
curl -X GET "http://127.0.0.1:8000/v1/accounts" \
  -H "X-Company-Id: 00000000-0000-0000-0000-000000000001" | jq
```

---

## 🎲 Business Rules

### Account Rules
1. Account types: asset, liability, equity, income, expense, other
2. Parent must exist before child
3. No circular references
4. Opening balances only for: asset, liability, equity
5. Unique account numbers per company

### Transaction Rules
1. Each line: debit XOR credit (never both, never neither)
2. Transaction must balance: SUM(debits) = SUM(credits)
3. Cannot post to locked periods
4. Opening balance transactions use special source

### Period Rules
1. Lifecycle: OPEN → SOFT_CLOSED → LOCKED
2. Can reopen from soft-closed
3. Cannot modify transactions in locked periods

---

## 📊 Current Data Status

```
✅ Company: 1 (id: 00000000-0000-0000-0000-000000000001)
✅ Accounts: 140
   ├─ Assets: 24
   ├─ Liabilities: 32
   └─ Other: 84

✅ Source: coa_converted_corrected.csv
✅ All parent-child relationships intact
✅ All account types properly stored (lowercase)
```

---

## 🚦 Implementation Status

| Feature | Status |
|---------|--------|
| Database Schema | ✅ Complete |
| COA Import/Export | ✅ Working |
| Account Management | ✅ Working |
| Opening Balances | ✅ Working |
| Period Management | ✅ Working |
| Financial Reports | ✅ Working |
| Audit Logging | ✅ Working |
| Multi-company | ✅ Working |
| Authentication | ⚠️ Not Started |
| User Management | ⚠️ Not Started |
| Invoice/Bills | ⚠️ Not Started |
| Multi-currency | ⚠️ Not Started |

---

## 🔧 Development Commands

```bash
# Start server
cd backend
uvicorn app.main:app --reload --port 8000

# View API docs
open http://127.0.0.1:8000/docs

# Test COA import
curl -X POST "http://127.0.0.1:8000/v1/accounts/import?dry_run=false" \
  -H "X-Company-Id: 00000000-0000-0000-0000-000000000001" \
  -F "file=@coa_converted_corrected.csv"

# View database
./view_db.sh count
```

---

## 📝 Key Enums

```python
class AccountType(str, enum.Enum):
    ASSET = "asset"          # ← Value stored in DB
    LIABILITY = "liability"
    EQUITY = "equity"
    INCOME = "income"
    EXPENSE = "expense"
    OTHER = "other"

class TransactionSource(str, enum.Enum):
    JOURNAL = "journal"
    OPENING_BALANCE = "opening_balance"

class PeriodStatus(str, enum.Enum):
    OPEN = "open"
    SOFT_CLOSED = "soft_closed"
    LOCKED = "locked"
```

---

## 🎯 Next Steps / TODO

### Immediate
- [ ] Add authentication (JWT)
- [ ] Implement pagination
- [ ] Add more transaction types

### Medium Term
- [ ] Contact/vendor management
- [ ] Invoice workflows
- [ ] Payment processing
- [ ] Bank reconciliation

### Long Term
- [ ] Multi-currency support
- [ ] Tax engine
- [ ] Budget management
- [ ] Advanced reporting

---

## 📚 Related Documentation

- **Full Technical Docs:** `TECHNICAL_DOCUMENTATION.md` (detailed, 500+ lines)
- **Database Access:** `DATABASE_ACCESS_GUIDE.md` (how to query DB)
- **API Docs:** http://127.0.0.1:8000/docs (Swagger UI)

---

## 💡 Tips for Claude

When analyzing this codebase:

1. **Critical files to understand:**
   - `backend/app/db/models/account.py` (Account model with enum fix)
   - `backend/app/services/coa_import.py` (COA import logic)
   - `backend/app/api/v1/routes/accounts.py` (API endpoints)

2. **Known working features:**
   - COA import is fully functional (140 accounts imported)
   - All account types stored as lowercase values
   - Parent-child relationships work correctly

3. **Key architectural patterns:**
   - Services layer contains business logic
   - Routes layer handles HTTP
   - Models layer is SQLAlchemy ORM
   - Schemas layer is Pydantic validation

4. **Don't suggest:**
   - Changing enum values (they're lowercase and working)
   - Rewriting the COA import (it's tested and working)
   - Adding authentication (known TODO)

---

**Last Updated:** November 5, 2025  
**Version:** 1.0  
**Quick Ref For:** Providing context to AI assistants
