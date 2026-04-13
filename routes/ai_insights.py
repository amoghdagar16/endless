from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from database import supabase
from middleware.auth import require_min_role

router = APIRouter()

class AIInsightCreate(BaseModel):
    company_id: str
    insight_type: str  # prediction, anomaly, recommendation, summary
    severity: Optional[str] = "info"  # info, warning, critical
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[Dict] = None
    actionable: Optional[bool] = False

@router.get("/company/{company_id}")
def get_company_insights(
    company_id: str,
    limit: int = 50,
    auth: Dict[str, str] = Depends(require_min_role("accountant"))
):
    """Get AI insights for a specific company"""
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot access another company's insights")

    response = supabase.table("ai_insights")\
        .select("*")\
        .eq("company_id", company_id)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()

    return response.data or []

@router.get("/{insight_id}")
def get_insight(
    insight_id: str,
    auth: Dict[str, str] = Depends(require_min_role("accountant"))
):
    """Get a specific AI insight"""
    response = supabase.table("ai_insights")\
        .select("*")\
        .eq("id", insight_id)\
        .execute()

    if not response.data or response.data[0].get("company_id") != auth["company_id"]:
        raise HTTPException(status_code=404, detail="Insight not found")

    return response.data[0]

@router.post("/")
def create_insight(
    insight: AIInsightCreate,
    auth: Dict[str, str] = Depends(require_min_role("accountant"))
):
    """Create a new AI insight"""
    if insight.company_id != auth["company_id"]:
        raise HTTPException(status_code=403, detail="Cannot create insight for another company")

    insight_data = {
        "company_id": insight.company_id,
        "insight_type": insight.insight_type,
        "severity": insight.severity,
        "title": insight.title,
        "description": insight.description,
        "data": insight.data,
        "actionable": insight.actionable
    }

    response = supabase.table("ai_insights").insert(insight_data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create insight")

    return response.data[0]

@router.delete("/{insight_id}")
def delete_insight(
    insight_id: str,
    auth: Dict[str, str] = Depends(require_min_role("accountant"))
):
    """Delete an AI insight"""
    # Ensure the insight belongs to the authenticated company.
    existing = supabase.table("ai_insights")\
        .select("id, company_id")\
        .eq("id", insight_id)\
        .execute()
    if not existing.data or existing.data[0].get("company_id") != auth["company_id"]:
        raise HTTPException(status_code=404, detail="Insight not found")

    supabase.table("ai_insights")\
        .delete()\
        .eq("id", insight_id)\
        .execute()

    return {"message": "Insight deleted successfully"}
