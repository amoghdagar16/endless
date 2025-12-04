# Endless - AI-Powered Accounting Platform

**Modern, full-stack accounting system with integrated AI insights and double-entry bookkeeping.**

This repository contains:
- **Backend**: FastAPI + Supabase for financial data management
- **Frontend**: Next.js 14 + Tailwind CSS with modern UX (Notion + QuickBooks style)
- **AI Integration**: OpenAI for insights, predictions, anomaly detection, and natural language queries
- **Smart OCR**: EasyOCR integrated into journal entries for receipt/invoice processing
- **Double-Entry Accounting**: Complete Chart of Accounts, Journal Entries, and automated balance updates

## 🎯 What's New - Complete System Redesign

This is a **ground-up redesign** with professional accounting features:

### Five Core Modules

1. **📊 Dashboard** - Smart financial overview with graphs, KPIs, and AI summaries
2. **📖 Journals** - Core transaction logging with built-in OCR and double-entry validation
3. **🗂️ Chart of Accounts** - CSV upload, tree view, real-time balance updates
4. **🤖 AI Insights** - Predictions, anomalies, recommendations + floating "Ask AI" on every page
5. **👤 Profile** - User and company settings management 

## Quick Start

### Backend Setup (Satya)
```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase and OpenAI credentials
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

### Database Setup
```bash
# Apply new schema to Supabase
psql $DATABASE_URL -f supabase_schema.sql
```

**📖 See [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md) for complete migration instructions.**

---

## ⚙️ Tech Stack

### Backend
- **FastAPI** – Python web framework for APIs
- **Supabase** – PostgreSQL database + authentication 
- **Uvicorn** – ASGI web server for FastAPI
- **python-dotenv** – Manages environment variables
- **Supabase Python SDK** – Database queries and joins
- **EasyOCR** – Deep learning-based OCR for text extraction
- **Pillow** – Image processing library
- **PyPDF** – PDF document handling
- **OpenAI** – AI-powered expense validation and categorization

### Frontend
- **Next.js 14** – React framework with App Router
- **TypeScript** – Type-safe JavaScript
- **Tailwind CSS** – Utility-first CSS framework
- **Axios** – HTTP client for API calls
- **Recharts** – Charting library for visualizations  

---

## 📁 Project Structure

```
endless/
├── supabase_schema.sql          # Complete database schema
├── MIGRATION_GUIDE.md           # Migration instructions
├── main.py                      # FastAPI app entry point
├── database.py                  # Supabase connection
├── smart_parser.py              # OCR text extraction logic
├── requirements.txt             # Python dependencies
└── /routes
    ├── users.py                # User endpoints
    ├── companies.py            # Company endpoints
    ├── journals.py             # Journal entry CRUD (NEW)
    ├── accounts.py             # Chart of Accounts CRUD (NEW)
    ├── parser.py               # Receipt parsing
    ├── ai_overlook.py          # AI validation
    └── ai_insights.py          # AI insights generation (NEW)

/frontend                        # Frontend (Next.js)
├── /app                        # Next.js app router
│   ├── layout.tsx              # Root layout with sidebar + AI
│   ├── new-dashboard/          # Smart dashboard (NEW)
│   ├── new-journals/           # Journal entry system (NEW)
│   ├── chart-of-accounts/      # COA management (NEW)
│   ├── ai-insights/            # AI insights page (NEW)
│   ├── profile/                # User/company settings (NEW)
│   ├── login/                  # Login page (NEW)
│   ├── signup/                 # Signup page (NEW)
│   └── company-setup/          # Onboarding flow (NEW)
├── /components
│   ├── NewSidebar.tsx          # 5-module navigation (NEW)
│   ├── AskAIButton.tsx         # Floating AI chat (NEW)
│   ├── KpiCard.tsx
│   └── Table.tsx
└── /lib
    └── api.ts                  # API client
```

### What each file does

| File | Purpose |
|------|----------|
| `main.py` | Runs the FastAPI server and connects all routes |
| `database.py` | Handles connection to Supabase |
| `smart_parser.py` | OCR text extraction and field parsing logic |
| `requirements.txt` | Lists all Python dependencies |
| `.env` | Stores the Supabase URL and service key |
| `/routes/users.py` | Handles user creation, editing, and linking to companies |
| `/routes/companies.py` | Handles company creation, editing, and linking users |
| `/routes/expenses.py` | Handles manual expense entry with journal entries and listing |
| `/routes/parser.py` | Handles receipt parsing (images, PDFs, CSV) |

---

## 🚀 Setup & Run

### 1️⃣ Clone the repo
```bash
git clone https://github.com/azythromycin/Endless-Moments-AI-Financial-Companion.git
cd into the repo
```

### 2️⃣ Install dependencies
```bash
pip install -r requirements.txt
```

**Install EasyOCR (for receipt parsing):**
```bash
# EasyOCR dependencies
pip install easyocr pillow pdf2image

# Ubuntu/Debian - Install Poppler for PDF processing
sudo apt-get install poppler-utils

# macOS - Install Poppler
brew install poppler
```

### 3️⃣ Add your environment variables
Create a `.env` file in the root:
```bash
# Supabase Configuration
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your_service_role_key
```

> ⚠️ Use the **service_role key** from Supabase — it allows full backend access (don't expose it publicly).

### 4️⃣ Start the server
```bash
uvicorn main:app --reload
```

Your app will run at:  
👉 **http://127.0.0.1:8000**

Swagger docs:  
👉 **http://127.0.0.1:8000/docs**

---

## 🔗 API Overview

### 🧱 Users (`/users`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/users/` | Get all users |
| GET | `/users/{user_id}` | Get one user |
| POST | `/users/` | Create a new user |
| PATCH | `/users/{user_id}` | Update user details |
| DELETE | `/users/{user_id}` | Delete a user |
| POST | `/users/company/{company_id}` | Create a user linked to a company |

---

### 🏢 Companies (`/companies`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/companies/` | Get all companies |
| GET | `/companies/with-users` | Get all companies with their users |
| GET | `/companies/{company_id}` | Get one company (with users) |
| GET | `/companies/{company_id}/users` | Get users in a company |
| POST | `/companies/` | Create a new company |
| PATCH | `/companies/{company_id}` | Update company details |
| DELETE | `/companies/{company_id}` | Delete a company |

---

### 💰 Expenses (`/expenses`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/expenses/` | Get all expenses (bills with vendor info) |
| GET | `/expenses/company/{company_id}` | Get expenses for a specific company |
| POST | `/expenses/manual_entry` | Create a manual expense with automatic vendor linking, bill creation, and journal entry |

**Example Request:**
```json
{
  "company_id": "uuid",
  "user_id": "uuid",
  "vendor_name": "Office Supplies Inc",
  "amount": 150.00,
  "category": "Office Supplies",
  "payment_method": "credit_card",
  "memo": "Paper and pens",
  "date": "2025-10-21"
}
```

---

### 📄 Receipt Parser (`/parse`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/parse/` | Parse receipt image, PDF, or CSV and extract structured data |

**Extracted Fields:**
- Vendor name
- Transaction date
- Total amount
- Description

**Example Usage:**
```bash
curl -X POST http://localhost:8000/parse/ -F "file=@receipt.png"
```

---

### 🤖 AI Overlook (`/ai`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/ai/overlook_expense` | AI-powered expense validation and suggestions |
| GET | `/status/healthz` | System health check including OpenAI status |

**Example Request:**
```json
{
  "company_id": "uuid",
  "vendor_name": "Office Depot",
  "amount": 125.50,
  "date": "2025-11-04",
  "category": "Office Supplies",
  "memo": "Printer paper"
}
```

**Example Response:**
```json
{
  "valid": true,
  "issues": [],
  "suggestions": {
    "normalized_vendor": "Office Depot",
    "category": "Office Supplies",
    "memo": "Office Depot expense"
  },
  "json_patch": { /* same as suggestions */ }
}
```

> **Note:** Requires `OPENAI_API_KEY` in `.env`. Falls back to rule-based suggestions if not configured.

---

## 🧩 Example

### Create a new user linked to a company
**POST** → `http://127.0.0.1:8000/users/company/d3d5e6c5-e1c2-4abc-9cce-5cbdcd0db575`
```json
{
  "full_name": "Jane Doe",
  "email": "jane@ai-finance.com",
  "role": "accountant",
  "user_type": "company"
}
```

### Get a company with all its users
**GET** → `http://127.0.0.1:8000/companies/d3d5e6c5-e1c2-4abc-9cce-5cbdcd0db575`

---

## 💡 Notes

- Backend uses the **Service Role key** — only for secure backend environments.
- Database joins use **Supabase's PostgREST** syntax like `select("*, users(full_name, email)")`.
- **Receipt parser** uses EasyOCR to extract text from images and PDFs with smart field parsing.
- **Expense tracking** automatically creates vendors, bills, and journal entries for proper double-entry accounting.
- **AI oversight** uses OpenAI for expense validation, categorization, and normalization.
- **Frontend** provides QuickBooks/NetSuite-style interface with real-time AI suggestions.
- API is modular and ready to scale — receipt parsing and expense automation are fully integrated!

---

## 🎨 Frontend Features

### New System (Redesign)

#### 📊 Dashboard (`/new-dashboard`)
- Financial health score
- Income vs Expenses trend graphs
- Expense breakdown pie chart
- Recent transactions
- AI-generated monthly summary

#### 📖 Journals (`/new-journals`)
- Standardized double-entry journal form
- Built-in OCR: Upload receipt → auto-populate journal
- Debit/Credit auto-validation
- Account selection from Chart of Accounts
- Tag vendors, categories, accounts
- Post → auto-update account balances

#### 🗂️ Chart of Accounts (`/chart-of-accounts`)
- Upload CSV for bulk import
- Tree view with expandable accounts
- Filter by type (Asset, Liability, Equity, Revenue, Expense)
- Real-time balance updates from posted journals
- Export to CSV

#### 🤖 AI Insights (`/ai-insights`)
- **Predictions**: Cash flow, expense trends
- **Anomalies**: Unusual transactions
- **Recommendations**: Cost optimization
- **Summaries**: Monthly financial health
- Context-aware insights

#### 🎯 Floating "Ask AI" Button
- Appears on EVERY page
- Natural language queries
- Context-aware (knows which page you're on)
- Explains accounting concepts
- Quick question shortcuts

#### 🔐 Authentication Flow
1. **Login/Signup** → Clean auth pages
2. **Company Setup** → Industry selection, COA import
3. **Dashboard** → Start using the platform

**Frontend runs on:** http://localhost:3000

---

## 🗄️ Database Schema

The new schema includes:

- ✅ **accounts** - Chart of Accounts with hierarchy
- ✅ **journal_entries** - Transaction headers
- ✅ **journal_lines** - Debit/credit lines
- ✅ **documents** - OCR-processed files
- ✅ **contacts** - Vendors and customers
- ✅ **ai_conversations** - Chat history
- ✅ **ai_insights** - Generated insights
- ✅ **audit_logs** - Activity tracking
- ✅ Row Level Security (RLS)
- ✅ Automatic triggers for balance updates

**See:** [`supabase_schema.sql`](supabase_schema.sql) for complete schema

---

## 🚀 Key Features

### 1. Double-Entry Accounting
- Every transaction must balance (Debit = Credit)
- Auto-validation before posting
- Account balances update automatically via database triggers

### 2. OCR Integration
- Upload receipts directly in journal entry form
- AI extracts: vendor, amount, date, tax, description
- Suggests balanced journal entry
- User reviews and posts

### 3. Dynamic Chart of Accounts
- CSV upload for bulk import
- Hierarchical account structure
- Real-time balance updates
- Export functionality

### 4. AI Everywhere
- Floating "Ask AI" button on every page
- Contextual insights
- Anomaly detection
- Expense predictions
- Concept explanations

### 5. Modern UX
- Notion-inspired clean design
- QuickBooks-style workflows
- Responsive charts (Recharts)
- Smart loading states
- Contextual empty states

---

## 📚 Documentation

- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Complete migration instructions
- **[supabase_schema.sql](supabase_schema.sql)** - Database schema
- **API Docs** - http://localhost:8000/docs (Swagger)

---

## 👨‍💻 Contributors

**Endless Moments LLC**
- Amogh Dagar
- Satya Neriyanuru
- Atiman Rohtagi
- Ashish Kumar
- Dhruv Bhatt

---

🧱 _Built with FastAPI + Supabase + Next.js 14 + OpenAI for modern, AI-powered accounting._
