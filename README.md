# Endless — AI-Powered Accounting Platform

Full-stack accounting with double-entry bookkeeping, Supabase auth, and optional AI (OpenAI). Backend: FastAPI. Frontend: Next.js 14 (App Router) + Tailwind.

---

## Quick Start

### Backend

```bash
cd /path/to/endless
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: SUPABASE_URL, SUPABASE_KEY; optional: SUPABASE_JWT_SECRET, OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

API: **http://127.0.0.1:8000** · Docs: **http://127.0.0.1:8000/docs**

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

App: **http://localhost:3000**

### Database

**For this branch, the canonical schema is `newschema.sql`** — merged schema with COA, banking, AR/AP, reconciliation, period close, and fixed triggers. Apply in Supabase SQL Editor or via `psql`:

```bash
psql $DATABASE_URL -f newschema.sql
```

Then apply migrations in order:

```bash
psql $DATABASE_URL -f migrations/004_seed_coa_templates.sql
psql $DATABASE_URL -f migrations/005_report_functions.sql
```

- **`migrations/004_seed_coa_templates.sql`** — Seeds 12 industry COA templates (SaaS, Retail, Healthcare, etc.) and shared base accounts. Idempotent; safe to re-run.
- **`migrations/005_report_functions.sql`** — Creates PostgreSQL RPC functions used by the Reports API (`rpt_trial_balance`, `rpt_account_balances_as_of`, `rpt_account_balances_between`).

Alternatively: `supabase_schema.sql` plus `migrations/002_*`, `migrations/003_*`. See **MIGRATION_GUIDE.md** for full steps.

---

## Tech Stack

| Layer    | Tech |
|----------|------|
| Backend  | FastAPI, Uvicorn, python-dotenv, Supabase Python SDK, python-jose (JWT), OpenAI (optional) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase JS (auth), Axios, Recharts, Framer Motion, @react-pdf/renderer, Lucide icons |
| Data     | Supabase (PostgreSQL + Auth) |

---

## Project Structure

```
endless/
├── main.py                      # FastAPI app, CORS, route includes
├── database.py                  # Supabase client / table helpers
├── smart_parser.py              # OCR / receipt parsing
├── start.sh                     # Production start script (Railway: reads PORT)
├── requirements.txt             # Dev dependencies
├── requirements.production.txt  # Production dependencies (lighter OCR)
├── .env.example                 # Backend env template — copy to .env
├── newschema.sql                # Canonical merged schema (use this for this branch)
├── supabase_schema.sql          # Legacy / alternate schema
├── migrations/
│   ├── 004_seed_coa_templates.sql   # 12 industry COA templates
│   └── 005_report_functions.sql     # PostgreSQL RPC functions for reports
├── routes/
│   ├── journal_helpers.py       # Shared: auto-journal creation, AR/AP account lookup
│   ├── users.py                 # /users — CRUD, link to company
│   ├── companies.py             # /companies — CRUD, onboarding, auto COA provision
│   ├── accounts.py              # /accounts — Chart of Accounts
│   ├── journals.py              # /journals — Journal entries (double-entry)
│   ├── dashboard.py             # /dashboard — Dashboard aggregates
│   ├── ai_insights.py           # /ai-insights — AI-generated insights
│   ├── ai_research.py           # /ai/research — Market benchmarks (Perplexity)
│   ├── ai_overlook.py           # /ai — Expense validation (OpenAI)
│   ├── expenses.py              # /expenses — Expense entries
│   ├── parser.py                # /parse — Receipt/file OCR parsing
│   ├── coa_templates.py         # /coa-templates — Industry COA templates
│   ├── banking.py               # /bank — Banking / transactions
│   ├── contacts.py              # /contacts — Vendors and customers
│   ├── invoices.py              # /invoices — Invoices with auto-journal on post
│   ├── payments.py              # /payments — Payments with auto-journal on apply
│   ├── bills.py                 # /bills — Bills with auto-journal on post
│   ├── bill_payments.py         # /bill-payments — Bill payments with auto-journal on apply
│   ├── accounting_periods.py    # /accounting-periods — Period management
│   ├── reconciliation.py        # /reconciliation — Bank reconciliation
│   ├── reports.py               # /reports — Trial Balance, P&L, Balance Sheet, Cash Flow
│   └── documents.py             # /documents — Document storage
└── frontend/
    ├── app/                     # Next.js App Router pages
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── login/               # Supabase login
    │   ├── signup/              # Supabase signup
    │   ├── auth/callback/       # Supabase auth callback
    │   ├── onboarding/          # Company setup (industry → auto-provisions COA)
    │   ├── new-dashboard/       # Main dashboard
    │   ├── banking/             # Banking / transactions
    │   ├── new-journals/        # Journal entries with delete support
    │   ├── chart-of-accounts/   # Chart of Accounts
    │   ├── invoices/            # Full invoice create/post/track UI
    │   ├── bills/               # Full bill create/post/track UI
    │   ├── reports/             # Financial reports with print + PDF export
    │   ├── month-end/           # Period close / month-end
    │   ├── ai/                  # Ask AI / market research
    │   ├── profile/             # User + company profile
    │   ├── company/             # Company settings
    │   └── documents/           # Document list
    ├── components/
    │   ├── AppLayout.tsx        # Layout with print-safe chrome hiding
    │   ├── ReportPDF.tsx        # PDF templates for all 4 financial reports
    │   └── ...                  # Sidebar, shared UI
    ├── contexts/                # AuthContext, ThemeContext
    └── lib/                     # API client, Supabase client
```

---

## Environment Variables

**Backend (`.env`)** — copy from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Service role key (backend only — never expose to frontend) |
| `SUPABASE_JWT_SECRET` | No | JWT secret for local token validation (Project Settings → API) |
| `OPENAI_API_KEY` | No | OpenAI for AI insights and expense validation |
| `PERPLEXITY_API_KEY` | No | Perplexity for `/ai/research` market benchmarks |

**Frontend (`.env.local`)** — copy from `frontend/.env.local.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for frontend) |
| `NEXT_PUBLIC_API_BASE` | Yes | Backend base URL (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_DEMO_MODE` | No | Set to `true` to skip auth (demo) |
| `NEXT_PUBLIC_COMPANY_ID` | No | Pre-fill company UUID for local dev |

**Never commit `.env` or `frontend/.env.local`.** Use `.env.example` and `frontend/.env.local.example` as templates.

---

## Frontend Modules (Current UI)

| Route | Purpose |
|-------|---------|
| `/login`, `/signup` | Supabase auth |
| `/onboarding` | Company setup — industry selection triggers automatic COA provisioning |
| `/new-dashboard` | Main dashboard with key metrics |
| `/banking` | Banking / transactions |
| `/new-journals` | Journal entries — create, view, delete; debits must equal credits |
| `/chart-of-accounts` | Chart of Accounts viewer |
| `/invoices` | Create invoices, map revenue accounts per line, post (triggers auto-journal) |
| `/bills` | Create bills, map expense accounts per line, post (triggers auto-journal) |
| `/reports` | Trial Balance, P&L, Balance Sheet, Cash Flow — with PDF export and browser print |
| `/month-end` | Period close / month-end workflow |
| `/ai` | Ask AI / market research (Perplexity) |
| `/profile` | User and company profile settings |
| `/company` | Company settings |
| `/documents` | Document storage list |

---

## API Overview

### Core

| Area | Prefix | Key Endpoints |
|------|--------|---------------|
| Users | `/users` | CRUD, link to company |
| Companies | `/companies` | CRUD, onboarding; auto-provisions COA on `onboarding_completed=true` |
| Accounts | `/accounts` | Chart of Accounts CRUD |
| Journals | `/journals` | Create / list / delete journal entries; balance validated; auto-reverses balances on delete |
| COA Templates | `/coa-templates` | List industry templates; `GET /coa-templates/{id}/accounts` |
| Contacts | `/contacts` | Vendors and customers |

### AR / AP

| Area | Prefix | Key Behavior |
|------|--------|--------------|
| Invoices | `/invoices` | Create, list, update status; **posting auto-creates DR AR / CR Revenue journal entry** |
| Payments | `/payments` | Create, apply to invoice; **applying auto-creates DR Cash / CR AR journal entry** |
| Bills | `/bills` | Create, list, update status; **posting auto-creates DR Expense / CR AP journal entry** |
| Bill Payments | `/bill-payments` | Create, apply to bills; **applying auto-creates DR AP / CR Cash journal entry** |

### Reports

| Endpoint | Description |
|----------|-------------|
| `GET /reports/trial-balance?as_of_date=YYYY-MM-DD` | Per-account debit/credit totals as of date |
| `GET /reports/profit-loss?start_date=…&end_date=…` | P&L with COGS / Operating / Other breakdown |
| `GET /reports/balance-sheet?as_of_date=…` | Balance Sheet: Assets = Liabilities + Equity |
| `GET /reports/cash-flow?start_date=…&end_date=…` | Cash flow from operating activities |

All report endpoints use PostgreSQL RPC functions (`rpt_*`) from migration 005.

### Other

| Area | Prefix | Description |
|------|--------|-------------|
| Dashboard | `/dashboard` | Aggregated dashboard metrics |
| AI Insights | `/ai-insights` | AI-generated financial insights (OpenAI) |
| AI Research | `/ai/research` | Market benchmarks (Perplexity) |
| AI Overlook | `/ai` | Expense validation (OpenAI) |
| Expenses | `/expenses` | Expense entries |
| Parser | `/parse` | Receipt / file OCR parsing |
| Banking | `/bank` | Banking data |
| Accounting Periods | `/accounting-periods` | Period management |
| Reconciliation | `/reconciliation` | Bank reconciliation |
| Documents | `/documents` | Document storage |

Health: `GET /`, `GET /health`, `GET /status/healthz`.

---

## Auto-Journal Entry System

When AR/AP transactions change status, the backend **automatically creates balanced, posted journal entries** and links them back to the source document (`linked_journal_entry_id`).

| Trigger | Debit | Credit |
|---------|-------|--------|
| Invoice posted | Accounts Receivable | Revenue (per line) |
| Payment applied to invoice | Cash / Bank (deposit account) | Accounts Receivable |
| Bill posted | Expense (per line) | Accounts Payable |
| Bill payment applied | Accounts Payable | Cash / Bank (payment account) |

**Requirements:**
- Each invoice line must have a `revenue_account_id` before posting.
- Each bill line must have an `expense_account_id` before posting.
- Payments must have a `deposit_account_id`; bill payments must have a `payment_account_id`.
- The company's COA must have accounts with subtypes `accounts_receivable` and `accounts_payable`.

The shared helper lives in `routes/journal_helpers.py` (`create_auto_journal_entry`, `get_ar_account`, `get_ap_account`).

---

## COA Auto-Provisioning

When a company completes onboarding (`onboarding_completed=true`), the backend automatically:

1. Looks up the COA template matching the company's `industry` field.
2. Falls back to the "Other" template if no exact match is found.
3. Inserts all template accounts into the company's Chart of Accounts.
4. Sets `coa_template_id` on the company record.

12 industry templates are available: SaaS / Software, E-commerce / Retail, Professional Services, Healthcare, Manufacturing, Food & Beverage, Real Estate, Construction, Marketing / Advertising, Education, Consulting, Other.

Template seeding: `migrations/004_seed_coa_templates.sql` (idempotent).

---

## Financial Reports

Reports are powered by PostgreSQL functions called via `supabase.rpc()`:

| RPC Function | Used By |
|---|---|
| `rpt_trial_balance(company_id, as_of_date)` | Trial Balance |
| `rpt_account_balances_as_of(company_id, as_of_date)` | Balance Sheet |
| `rpt_account_balances_between(company_id, start_date, end_date)` | P&L, Cash Flow |

The frontend (`/reports`) renders all four reports in a tabbed view with:
- Collapsible account sections
- Browser print support (sidebar/chrome hidden automatically via `print:hidden` CSS)
- PDF export via `@react-pdf/renderer` (`frontend/components/ReportPDF.tsx`)

---

## Production

- Backend: use `requirements.production.txt` and `start.sh` (reads `PORT` env variable).
- Frontend: `npm run build` then `npm run start`.
- Set `NEXT_PUBLIC_API_BASE` to the deployed backend URL.
- Keep `SUPABASE_KEY` and all API keys server-side only; never expose to the frontend.

See **DEPLOYMENT_GUIDE.md** / **VERCEL_DEPLOYMENT.md** if present.

---

## Documentation

- **MIGRATION_GUIDE.md** — Database migration steps
- **newschema.sql** — Canonical merged schema for this branch (use this)
- **supabase_schema.sql** — Legacy full schema
- **API docs** — http://localhost:8000/docs (when backend is running)

---

## Contributors

Endless Moments LLC — Amogh Dagar, Satya Neriyanuru, Atiman Rohtagi, Ashish Kumar, Dhruv Bhatt.
