from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import table
from routes import (
    users,
    companies,
    expenses,
    parser,
    ai_overlook,
    accounts,
    journals,
    dashboard,
    ai_insights,
    ai_research,
    coa_templates,
    banking,
    contacts,
    invoices,
    payments,
    bills,
    bill_payments,
    accounting_periods,
    reconciliation,
    reports,
    documents,
)

app = FastAPI(title="AI Financial Companion Backend")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "https://*.vercel.app",  # Allow all Vercel deployments
        "https://endless-accounting.vercel.app",  # Your production URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(journals.router, prefix="/journals", tags=["journals"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(ai_insights.router, prefix="/ai-insights", tags=["ai-insights"])
app.include_router(ai_research.router)
app.include_router(expenses.router)
app.include_router(parser.router)
app.include_router(ai_overlook.router)
# New schema flow: COA onboarding, banking, AR/AP, period close, reports
app.include_router(coa_templates.router)
app.include_router(banking.router)
app.include_router(contacts.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(bills.router)
app.include_router(bill_payments.router)
app.include_router(accounting_periods.router)
app.include_router(reconciliation.router)
app.include_router(reports.router)
app.include_router(documents.router)

@app.get("/")
def read_root():
    return {"message": "AI Financial Companion Backend is running!"}

@app.get("/health")
def health_check():
    try:
        response = table("users").select("*").limit(1).execute()
        return {"message": "Connected to Supabase!", "data": response.data}
    except Exception as e:
        return {"error": str(e)}


@app.get("/status/healthz")
def healthz():
    """Health check endpoint for frontend."""
    import os
    from datetime import datetime

    try:
        # Test database connection
        response = table("users").select("*").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "version": "1.0.0"
    }
