# Fintra Finance OS

Full-stack AI-powered accounting platform with double-entry bookkeeping, Plaid bank feeds, customizable dashboard widgets, and an AI copilot. Backend: FastAPI. Frontend: Next.js 14 (App Router) + Tailwind CSS.

---

## Quick Start

### Backend

```bash
cd /path/to/endless
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, PLAID_CLIENT_ID, PLAID_SECRET, OPENAI_API_KEY
uvicorn main:app --reload --port 8001
```

API: **http://127.0.0.1:8001** · Docs: **http://127.0.0.1:8001/docs**

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

App: **http://localhost:3000**

### Database

Apply the canonical schema first, then all migrations in order:

```bash
# 1. Base schema (Supabase SQL Editor or psql)
psql $DATABASE_URL -f newschema.sql

# 2. Migrations (run each in order)
psql $DATABASE_URL -f migrations/004_seed_coa_templates.sql
psql $DATABASE_URL -f migrations/005_report_functions.sql
psql $DATABASE_URL -f migrations/006_add_legal_customer_fields.sql
psql $DATABASE_URL -f migrations/007_dashboard_widgets.sql
psql $DATABASE_URL -f migrations/008_plaid_banking.sql
```

---

## Tech Stack

| Layer    | Tech |
|----------|------|
| Backend  | FastAPI, Uvicorn, python-dotenv, Supabase Python SDK, python-jose (JWT), plaid-python v38, OpenAI |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase JS, Axios, Recharts, react-plaid-link, Lucide icons |
| Data     | Supabase (PostgreSQL + Auth + RLS) |
| Banking  | Plaid (Sandbox / Production) — transactions, auth |

---

## Environment Variables

**Backend (`.env`)** — copy from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Service role key (backend only) |
| `SUPABASE_JWT_SECRET` | No | JWT secret for local token validation |
| `OPENAI_API_KEY` | No | OpenAI for AI insights and expense validation |
| `PERPLEXITY_API_KEY` | No | Perplexity for market benchmarks |
| `PLAID_CLIENT_ID` | Yes (banking) | Plaid client ID |
| `PLAID_SECRET` | Yes (banking) | Plaid sandbox or production secret |
| `PLAID_ENV` | Yes (banking) | `sandbox`, `development`, or `production` |

**Frontend (`.env.local`)**:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_API_BASE` | Yes | Backend base URL (e.g. `http://localhost:8001`) |

**Never commit `.env` or `.env.local`.**

---

## Project Structure

```
endless/
├── main.py                        # FastAPI app, CORS, route registration
├── database.py                    # Supabase client
├── newschema.sql                  # Canonical merged schema — use this
├── migrations/
│   ├── 004_seed_coa_templates.sql     # 12 industry COA templates
│   ├── 005_report_functions.sql       # PostgreSQL RPC functions for reports
│   ├── 006_add_legal_customer_fields.sql  # Legal + customer contact columns
│   ├── 007_dashboard_widgets.sql      # Per-user dashboard widget preferences
│   └── 008_plaid_banking.sql          # sync_cursor + balance columns for banking
├── routes/
│   ├── journal_helpers.py         # Shared auto-journal creation, AR/AP lookup
│   ├── users.py                   # /users
│   ├── companies.py               # /companies — onboarding, COA auto-provision
│   ├── accounts.py                # /accounts — Chart of Accounts
│   ├── journals.py                # /journals — double-entry journal entries
│   ├── dashboard.py               # /dashboard — metrics, widgets, bank accounts
│   ├── banking.py                 # /bank — Plaid link, sync, transactions, post to journal
│   ├── contacts.py                # /contacts — vendors and customers
│   ├── invoices.py                # /invoices — AR invoices with auto-journal
│   ├── bills.py                   # /bills — AP bills with auto-journal
│   ├── payments.py                # /payments — AR payments with auto-journal
│   ├── bill_payments.py           # /bill-payments — AP payments with auto-journal
│   ├── reports.py                 # /reports — Trial Balance, P&L, Balance Sheet, Cash Flow
│   ├── ai_overlook.py             # /ai — AI expense validation (OpenAI)
│   ├── ai_insights.py             # /ai-insights — AI financial insights
│   └── ...
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx               # Landing / redirect
    │   ├── login/ signup/         # Supabase auth
    │   ├── onboarding/            # 3-step wizard → auto-provisions COA
    │   ├── new-dashboard/         # Customizable widget dashboard
    │   ├── banking/               # Plaid bank feed, transactions, post to journal
    │   ├── chart-of-accounts/     # COA viewer + detail pages
    │   ├── contacts/              # Vendors and customers
    │   ├── invoices/ bills/       # AR/AP with post workflow
    │   ├── payments/              # Payment tracking
    │   ├── reports/               # Financial reports + PDF export
    │   ├── month-end/             # Period close workflow
    │   ├── ai/                    # Ask Fintra AI + market research
    │   └── profile/               # Company + user profile (QuickBooks-style inline edit)
    ├── components/
    │   ├── dashboard/
    │   │   ├── widgets.tsx        # 16-widget catalog with all widget components
    │   │   ├── WidgetGrid.tsx     # 2-col grid with scroll-reveal animation
    │   │   ├── AddWidgetModal.tsx # Checkbox modal to customize dashboard
    │   │   └── BankAccountsCard.tsx  # Permanent bank accounts summary card
    │   ├── NewSidebar.tsx
    │   ├── EnhancedAIConsole.tsx  # Fintra Copilot chat panel
    │   └── AskAIButton.tsx        # Floating "Ask Fintra AI" button
    ├── hooks/
    │   ├── useScrollReveal.ts     # IntersectionObserver — fade-in on scroll
    │   └── useCountUp.ts          # Cubic ease-out animated number counter
    ├── lib/
    │   ├── api.ts                 # Axios API client
    │   └── chartColors.ts         # CSS-variable-aware chart color helper
    └── contexts/                  # AuthContext, ThemeContext
```

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/login`, `/signup` | Supabase auth |
| `/onboarding` | 3-step company setup — industry selection auto-provisions COA |
| `/new-dashboard` | Customizable widget dashboard with KPI count-up animations |
| `/banking` | Plaid bank feed — link accounts, review transactions, post to journal |
| `/chart-of-accounts` | Chart of Accounts with account detail drill-down |
| `/contacts` | Vendors and customers |
| `/invoices` | AR invoices — create, post, track |
| `/bills` | AP bills — create, post, track |
| `/payments` | Payment tracking |
| `/reports` | Trial Balance, P&L, Balance Sheet, Cash Flow — with PDF export |
| `/month-end` | Period close / month-end workflow |
| `/ai` | Ask Fintra AI + market research |
| `/profile` | Company profile — QuickBooks-style inline editing |

---

## API Overview

### Core

| Area | Prefix | Notes |
|------|--------|-------|
| Users | `/users` | CRUD, company link |
| Companies | `/companies` | PATCH passes through any field; `onboarding_completed=true` triggers COA provisioning |
| Accounts | `/accounts` | Full COA CRUD |
| Journals | `/journals` | Create/list/delete; balance enforced |
| Contacts | `/contacts` | Vendors + customers |
| COA Templates | `/coa-templates` | 12 industry templates |

### AR / AP (Auto-Journal)

| Area | Prefix | Auto-Journal Trigger |
|------|--------|----------------------|
| Invoices | `/invoices` | Post → DR Accounts Receivable / CR Revenue |
| Payments | `/payments` | Apply → DR Cash / CR Accounts Receivable |
| Bills | `/bills` | Post → DR Expense / CR Accounts Payable |
| Bill Payments | `/bill-payments` | Apply → DR Accounts Payable / CR Cash |

### Banking (Plaid)

| Endpoint | Description |
|----------|-------------|
| `POST /bank/plaid/link-token` | Generate Plaid Link token |
| `POST /bank/plaid/exchange-token` | Exchange public token → access token, import accounts, initial sync |
| `POST /bank/plaid/sync/{connection_id}` | Manual sync + balance refresh |
| `DELETE /bank/connections/{id}` | Remove Plaid item + delete from DB |
| `GET /bank/accounts` | Linked accounts with pending transaction count |
| `GET /bank/transactions` | Filter by status/account/search/date |
| `PATCH /bank/transactions/{id}` | Update category / memo |
| `POST /bank/transactions/{id}/post` | Create journal entry, mark reviewed |
| `POST /bank/transactions/{id}/exclude` | Exclude from review queue |
| `GET /bank/gl-accounts` | GL accounts for category dropdown |

### Dashboard

| Endpoint | Description |
|----------|-------------|
| `GET /dashboard/summary?period=&widgets=` | KPI metrics + per-widget data |
| `GET /dashboard/bank-accounts` | Cash/bank GL accounts with balances |
| `GET /dashboard/widgets` | Load saved widget preferences |
| `PUT /dashboard/widgets` | Save widget preferences |

### Reports

| Endpoint | Description |
|----------|-------------|
| `GET /reports/trial-balance?as_of_date=` | Per-account debit/credit totals |
| `GET /reports/profit-loss?start_date=&end_date=` | P&L with COGS / Operating breakdown |
| `GET /reports/balance-sheet?as_of_date=` | Assets = Liabilities + Equity |
| `GET /reports/cash-flow?start_date=&end_date=` | Cash flow from operations |

---

## Dashboard Widget System

The dashboard supports **16 configurable widgets**. Preferences are stored per-user in the `dashboard_widgets` Supabase table (migration 007).

**Default widgets:** Revenue, Expenses, Net Income, Cash Balance, AR Aging, AP Aging

**All available widgets:** Revenue, Expenses, Net Income, Cash Balance, AR Aging, AP Aging, Invoice Status, Bill Status, Cash Flow, Top Expenses, Revenue by Customer, Recent Journal Entries, Account Balances, Deposits, Burn Rate, Gross Margin

Widgets are added/removed via the **Add Widget** button → checkbox modal → saved to DB.

---

## Plaid Bank Feed

### How it works

1. Click **Link Account** → Plaid Link modal opens
2. Select bank → authenticate with bank credentials
3. Backend exchanges public token for access token, imports accounts
4. Transactions sync via cursor-based `/transactions/sync`
5. Review transactions in **Pending** tab — assign GL category
6. **Post to Journal** → creates balanced double-entry journal entry:
   - Outflow (expense): DR Category Account / CR Bank GL Account
   - Inflow (revenue): DR Bank GL Account / CR Category Account
7. Transaction moves to **Posted** tab

### Sandbox credentials (testing)

- Username: `user_good`
- Password: `pass_good`

### Important notes for Plaid SDK v38

- Do NOT pass `Products("balance")` — it is auto-initialized and will throw `INVALID_PRODUCT`
- Use URL strings for environment, NOT `plaid.Environment.*` enum (removed in v38):
  ```python
  host="https://sandbox.plaid.com"   # correct
  host=plaid.Environment.Sandbox     # broken in v38
  ```

---

## Auto-Journal Entry System

Journal entries are created automatically when AR/AP documents change status. The shared helper is `routes/journal_helpers.py`.

| Trigger | Debit | Credit |
|---------|-------|--------|
| Invoice posted | Accounts Receivable | Revenue (per line) |
| Payment applied | Cash / Deposit Account | Accounts Receivable |
| Bill posted | Expense (per line) | Accounts Payable |
| Bill payment applied | Accounts Payable | Cash / Payment Account |
| Bank transaction posted | Category Account or Bank | Bank Account or Category |

**Important:** Journal entries are created as `draft`, lines are inserted, then status is updated to `posted`. This is required because the DB trigger `prevent_edit_posted_journal_lines` blocks inserts/updates on lines belonging to posted entries.

---

## COA Auto-Provisioning

When a company completes onboarding with `onboarding_completed=true`, the backend:

1. Matches `industry` to one of 12 COA templates
2. Falls back to "Other" template if no match
3. Inserts all template accounts into the company's Chart of Accounts
4. Sets `coa_template_id` on the company record

**12 templates:** SaaS / Software, E-commerce / Retail, Professional Services, Healthcare, Manufacturing, Food & Beverage, Real Estate, Construction, Marketing / Advertising, Education, Consulting, Other.

---

## Onboarding Wizard

3-step wizard at `/onboarding`:

| Step | Fields |
|------|--------|
| 1 — Company Info | Name*, Email*, Phone, Industry, Website, Address |
| 2 — Legal Info | Legal Business Name*, Tax ID (EIN), Business Type, Legal Address |
| 3 — Customer Contact | Customer Email, Customer Address |

Finishing saves `onboarding_completed: true` → triggers COA provisioning → redirects to `/new-dashboard`.

---

## Design System

All styling uses **CSS variables** — never hardcoded Tailwind colors:

| Variable | Usage |
|----------|-------|
| `var(--bg-primary)` | Main background |
| `var(--bg-card)` | Card background |
| `var(--bg-secondary)` | Secondary / input background |
| `var(--border-color)` | Borders |
| `var(--text-primary/secondary/muted)` | Text hierarchy |
| `var(--neon-cyan)` | Primary accent |
| `var(--neon-fuchsia)` | Secondary accent |
| `var(--neon-emerald)` | Positive / success accent |

---

## Production

- Backend: `requirements.production.txt` + `start.sh` (reads `PORT` env var for Railway/Render)
- Frontend: `npm run build && npm run start`
- Set `NEXT_PUBLIC_API_BASE` to deployed backend URL
- Never expose `SUPABASE_KEY` or `PLAID_SECRET` to the frontend

---

## Contributors

Endless Moments LLC — Amogh Dagar, Satya Neriyanuru, Atiman Rohtagi, Ashish Kumar, Dhruv Bhatt.
