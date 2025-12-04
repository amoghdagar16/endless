# MiniBooks Frontend

QuickBooks/NetSuite-style financial management interface with AI oversight.

## Features

- **Dashboard**: Financial insights, KPIs, and system health monitoring
- **Expenses**: Record expenses with AI-powered suggestions and validation
- **Journals**: View journal entries (double-entry accounting)
- **Parser**: Upload receipts (PNG/JPG/PDF/CSV) and extract data automatically
- **AI Console**: Query your financial data with natural language

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios for API calls
- Recharts for visualizations

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_COMPANY_ID=<your-company-uuid>
```

> Get your company UUID from the backend by creating a company or querying `/companies/`

### 3. Start Development Server

```bash
npm run dev
```

Frontend runs at: http://localhost:3000

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with sidebar/topbar
│   ├── page.tsx             # Dashboard
│   ├── expenses/page.tsx    # Expense management
│   ├── journals/page.tsx    # Journal entries
│   ├── documents/page.tsx   # Receipt parser
│   └── ai/page.tsx          # AI console
├── components/
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── Topbar.tsx           # Top header bar
│   ├── KpiCard.tsx          # KPI display card
│   └── Table.tsx            # Reusable data table
└── lib/
    └── api.ts               # API client configuration
```

## API Endpoints Used

- `GET /status/healthz` - System health check
- `GET /expenses/company/{company_id}` - List expenses
- `POST /expenses/manual_entry` - Create expense
- `POST /ai/overlook_expense` - AI validation & suggestions
- `POST /parse/` - Parse receipt files

## Workflow

### Recording an Expense

1. **Option A: Manual Entry**
   - Navigate to Expenses
   - Fill in vendor, amount, date, category, memo
   - Click "Run AI" to get suggestions
   - Click "Apply Suggestions" to use them
   - Click "Save Expense" to record

2. **Option B: Via Parser**
   - Navigate to Parser
   - Upload receipt (PNG/JPG/PDF/CSV)
   - Click "Upload & Parse"
   - Review extracted fields
   - Click "Draft Expense with These Fields"
   - Redirected to Expenses with prefilled form
   - Optionally run AI for further refinement
   - Save expense

### Viewing Data

- **Dashboard**: See monthly totals, top categories, top vendors, system health
- **Expenses**: View last 20 expenses in a table
- **Journals**: View journal entries (coming soon - currently auto-created)
- **AI Console**: Ask questions about your financial data

## Notes

- Expenses automatically create vendors, bills, and journal entries via the backend
- Journal entries follow double-entry accounting (debit/credit)
- AI suggestions use OpenAI (configured in backend .env)
- Multi-tenant: All requests include company_id
- No authentication yet - uses placeholder user_id

## Development

- TypeScript strict mode enabled
- Tailwind CSS for styling
- Client-side rendering with React hooks
- All API calls via centralized `lib/api.ts`

## Troubleshooting

**Cannot connect to API:**
- Ensure backend is running on port 8000
- Check NEXT_PUBLIC_API_BASE in .env.local
- Verify CORS is enabled in backend

**Company ID errors:**
- Set NEXT_PUBLIC_COMPANY_ID to a valid company UUID
- Create a company via backend `/companies/` endpoint first

**Parser not working:**
- Ensure backend has EasyOCR installed
- Check file format (PNG, JPG, PDF, CSV only)
- File upload has 10MB limit (configurable in backend)
