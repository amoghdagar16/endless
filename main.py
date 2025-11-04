from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import table
from routes import users, companies, expenses, parser, ai_overlook

app = FastAPI(title="AI Financial Companion Backend")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(expenses.router)
app.include_router(parser.router)
app.include_router(ai_overlook.router)

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
