# AI Financial Companion (MiniBooks)

**Full-stack QuickBooks/NetSuite-style financial management platform with AI oversight.**

This repository contains:
- **Backend**: FastAPI + Supabase for financial data management
- **Frontend**: Next.js + Tailwind CSS for the user interface
- **AI Integration**: OpenAI for expense validation, categorization, and insights
- **Smart Parser**: EasyOCR for receipt parsing from images/PDFs

## Quick Start

### Backend Setup
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
# Edit .env.local with your API base URL and company ID
npm run dev
```

See detailed setup instructions below.

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
/                           # Backend (FastAPI)
├── main.py                 # FastAPI app entry point
├── database.py             # Supabase connection
├── smart_parser.py         # OCR text extraction logic
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
└── /routes
    ├── users.py           # User endpoints
    ├── companies.py       # Company endpoints
    ├── expenses.py        # Expense tracking
    ├── parser.py          # Receipt parsing
    └── ai_overlook.py     # AI validation & suggestions

/frontend                   # Frontend (Next.js)
├── /app                   # Next.js app router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard
│   ├── /expenses          # Expense management
│   ├── /journals          # Journal entries
│   ├── /documents         # Receipt parser
│   └── /ai                # AI console
├── /components            # Reusable UI components
├── /lib                   # Utilities (API client)
└── package.json           # Frontend dependencies
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

The Next.js frontend (`/frontend`) provides:

- **Dashboard**: KPIs, monthly spending insights, system health monitoring
- **Expenses**: Create expenses with AI-powered suggestions and validation
- **Parser**: Upload receipts (PNG/JPG/PDF/CSV) and auto-extract fields
- **Journals**: View double-entry journal records (auto-created from expenses)
- **AI Console**: Natural language queries about financial data

**Frontend runs on:** http://localhost:3000
**See:** `/frontend/README.md` for detailed setup instructions

---

## 👨‍💻 Author
Endless Moments LLC
Amogh Dagar 
Satya Neriyanuru 
Atiman Rohtagi 
Ashish Kumar
Dhruv Bhatt
---

🧱 _Built with FastAPI + Supabase + Next.js + OpenAI for a future-ready AI accounting platform._
