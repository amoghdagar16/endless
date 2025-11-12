```markdown
# AI Accounting System version_A

A full-stack double-entry accounting application built with FastAPI and Next.js, designed for small to medium businesses with AI-assisted bookkeeping capabilities.

## Overview

This accounting system provides core bookkeeping functionality including chart of accounts management, journal entries, opening balances, and financial reporting. The application follows proper double-entry accounting principles and includes features like hierarchical account structures, transaction validation, and real-time balance calculations.

## Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL with SQLAlchemy 2.0 ORM
- Pydantic v2 for validation
- Alembic for migrations

**Frontend:**
- Next.js 14 with TypeScript
- Tailwind CSS with dark mode support
- React hooks for state management

## Features Implemented

### ✅ Phase 1: Chart of Accounts
- Complete CRUD operations for accounts
- CSV/Excel import and export functionality
- Hierarchical account structure with parent-child relationships
- Account types: Asset, Liability, Equity, Income, Expense
- Opening balances support with date tracking
- Account validation (duplicate prevention, parent-child type matching)
- Flat and hierarchical view modes
- Search and filter capabilities
- Template download for easy data entry

### ✅ Phase 2: Journal Entries & Transactions
- Create and edit journal entries with multiple line items
- Double-entry validation (debits must equal credits)
- Transaction status tracking (draft/posted)
- Date-based transaction recording
- Multi-line transactions with account selection
- Real-time balance validation
- Posted transactions are immutable

### ✅ Phase 3: Opening Balances
- Dedicated UI for setting initial account balances
- Real-time balance calculation and validation
- Enforces accounting equation: Assets = Liabilities + Equity
- Balance summary display (Assets, Liabilities, Equity)
- Visual balance indicators
- As-of-date tracking
- Balance sheet accounts only validation

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL database

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables in `.env`:
```
DATABASE_URL=postgresql://accounting_user:password@localhost:5432/accounting_dev
```

5. Run database migrations:
```bash
alembic upgrade head
```

6. Start the backend server:
```bash
bash start_server.sh
```

The API will be available at `http://localhost:8000` with interactive documentation at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Key Features

### Chart of Accounts Management
- Import existing charts of accounts from CSV or Excel
- Export current chart for backup or sharing
- Create accounts manually with opening balances
- Organize accounts in hierarchical structures
- Validate parent-child relationships
- Delete individual or all accounts

### Transaction Management
- Create journal entries with balanced debits and credits
- Edit draft transactions before posting
- Post transactions to make them final and immutable
- View transaction history with filtering
- Track transaction sources (journal entry, opening balance)
- Maintain audit trail of all changes

### Opening Balances
- Set initial balances for balance sheet accounts
- Real-time validation of accounting equation
- Visual feedback on balance status
- Summary view of assets, liabilities, and equity
- Date tracking for opening balance entries

## Sample Data

The repository includes two sample CSV files:

- **coa_corrected_final.csv**: 79 accounts with balanced opening balances (Assets: $683,600, Liabilities: $293,600, Equity: $390,000)
- **coa_template.csv**: 236 comprehensive accounts covering all major categories

## Current Limitations

- Single company operation (multi-company support planned)
- No user authentication system
- Financial reports in development
- Period closing not yet implemented
- Bank reconciliation planned for future release

## API Endpoints

The system provides RESTful APIs for:
- Chart of Accounts (CRUD, import/export)
- Transactions (CRUD, posting)
- Opening Balances (get/set with validation)
- Health checks

Complete API documentation available at `/docs` when running the backend server.

## Development Status

**Completed Phases:**
- Phase 1: Chart of Accounts ✅
- Phase 2: Journal Entries ✅
- Phase 3: Opening Balances ✅

**Upcoming Phases:**
- Phase 4: Financial Reports (Trial Balance, Balance Sheet, Income Statement)
- Phase 5: Period Management
- Phase 6: OCR Integration for document processing
[Your License Here]

---

For detailed technical documentation, please refer to the completion reports in the `documentation` folder.
```
