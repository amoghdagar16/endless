"""
AI Research endpoints using Perplexity AI for real-time market intelligence.
Provides industry benchmarks, competitor analysis, and growth recommendations.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from database import supabase
from middleware.auth import require_min_role
from lib.perplexity_client import PerplexityClient
import os

router = APIRouter(prefix="/ai/research", tags=["AI Research"])

@router.post("/industry-benchmarks")
async def get_industry_benchmarks(auth: Dict[str, str] = Depends(require_min_role("accountant"))):
    """
    Get real-time industry benchmarks for the user's company.
    Uses Perplexity AI to fetch current market data and comparisons.
    """
    try:
        company_id = auth["company_id"]

        # Fetch company profile
        company = supabase.table("companies")\
            .select("*")\
            .eq("id", company_id)\
            .single()\
            .execute()

        if not company.data:
            raise HTTPException(status_code=404, detail="Company not found")

        company_data = company.data

        # Ensure required fields exist
        if not company_data.get("industry"):
            raise HTTPException(
                status_code=400,
                detail="Please complete your company profile. Industry is required for benchmarking."
            )

        location = f"{company_data.get('location_city', '')}, {company_data.get('location_state', 'USA')}".strip(", ")
        if not company_data.get("location_state"):
            location = "United States"

        # Initialize Perplexity client
        if not os.getenv("PERPLEXITY_API_KEY"):
            raise HTTPException(
                status_code=503,
                detail="Perplexity AI not configured. Please add PERPLEXITY_API_KEY to .env file."
            )

        perplexity = PerplexityClient()

        # Query industry benchmarks
        benchmarks = await perplexity.get_industry_benchmarks(
            industry=company_data["industry"],
            location=location,
            metrics=[
                "Average revenue",
                "Profit margins",
                "Operating expense ratio",
                "Customer acquisition cost",
                "Revenue growth rate",
                "Employee productivity"
            ]
        )

        return {
            "company_id": company_id,
            "company_name": company_data.get("name"),
            "industry": company_data["industry"],
            "location": location,
            "benchmarks": benchmarks["answer"],
            "citations": benchmarks["citations"],
            "generated_at": "2026-02-01"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching benchmarks: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch industry benchmarks: {str(e)}"
        )


@router.post("/competitor-analysis")
async def analyze_competitors(auth: Dict[str, str] = Depends(require_min_role("accountant"))):
    """
    Compare company to competitors using real-time data from Perplexity AI.
    """
    try:
        company_id = auth["company_id"]

        company = supabase.table("companies")\
            .select("*")\
            .eq("id", company_id)\
            .single()\
            .execute()

        company_data = company.data

        if not company_data.get("industry"):
            raise HTTPException(
                status_code=400,
                detail="Please add your industry in the company profile"
            )

        if not company_data.get("competitors") or len(company_data["competitors"]) == 0:
            raise HTTPException(
                status_code=400,
                detail="Please add competitors in your company profile for comparison"
            )

        location = f"{company_data.get('location_city', '')}, {company_data.get('location_state', 'USA')}".strip(", ")

        perplexity = PerplexityClient()
        analysis = await perplexity.compare_competitors(
            company_name=company_data["name"],
            industry=company_data["industry"],
            competitors=company_data["competitors"],
            location=location
        )

        return {
            "company_id": company_id,
            "company_name": company_data["name"],
            "competitors": company_data["competitors"],
            "analysis": analysis["answer"],
            "citations": analysis["citations"],
            "generated_at": "2026-02-01"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing competitors: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze competitors: {str(e)}"
        )


@router.post("/tax-updates")
async def get_tax_updates(auth: Dict[str, str] = Depends(require_min_role("accountant"))):
    """
    Get latest tax compliance updates for the user's jurisdiction and business type.
    """
    try:
        from datetime import datetime

        company_id = auth["company_id"]
        company = supabase.table("companies")\
            .select("business_type, location_state, name")\
            .eq("id", company_id)\
            .single()\
            .execute()

        company_data = company.data

        if not company_data.get("business_type"):
            raise HTTPException(
                status_code=400,
                detail="Please add your business type in the company profile"
            )

        if not company_data.get("location_state"):
            raise HTTPException(
                status_code=400,
                detail="Please add your business location in the company profile"
            )

        perplexity = PerplexityClient()
        updates = await perplexity.get_tax_compliance_updates(
            business_type=company_data["business_type"],
            location_state=company_data["location_state"],
            year=datetime.now().year
        )

        return {
            "company_id": company_id,
            "company_name": company_data["name"],
            "business_type": company_data["business_type"],
            "location": company_data["location_state"],
            "updates": updates["answer"],
            "citations": updates["citations"],
            "generated_at": "2026-02-01"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching tax updates: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tax updates: {str(e)}"
        )


@router.post("/growth-recommendations")
async def get_growth_recommendations(auth: Dict[str, str] = Depends(require_min_role("accountant"))):
    """
    Get personalized growth recommendations based on company profile.
    Includes case studies and actionable strategies.
    """
    try:
        company_id = auth["company_id"]

        company = supabase.table("companies")\
            .select("*")\
            .eq("id", company_id)\
            .single()\
            .execute()

        company_data = company.data

        # Ensure required fields
        required_fields = ["industry", "annual_revenue", "employee_count", "growth_stage"]
        missing = [f for f in required_fields if not company_data.get(f)]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Please complete your company profile. Missing fields: {', '.join(missing)}"
            )

        location = f"{company_data.get('location_city', '')}, {company_data.get('location_state', 'USA')}".strip(", ")

        perplexity = PerplexityClient()
        recommendations = await perplexity.get_growth_recommendations(
            industry=company_data["industry"],
            revenue=company_data["annual_revenue"],
            employees=company_data["employee_count"],
            growth_stage=company_data["growth_stage"],
            location=location
        )

        return {
            "company_id": company_id,
            "company_name": company_data["name"],
            "growth_stage": company_data["growth_stage"],
            "recommendations": recommendations["answer"],
            "citations": recommendations["citations"],
            "generated_at": "2026-02-01"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating growth recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate growth recommendations: {str(e)}"
        )


@router.get("/capabilities")
async def get_research_capabilities(auth: Dict[str, str] = Depends(require_min_role("accountant"))):
    """
    Get available research capabilities based on company profile completeness.
    """
    company_id = auth["company_id"]

    company = supabase.table("companies")\
        .select("*")\
        .eq("id", company_id)\
        .single()\
        .execute()

    company_data = company.data

    capabilities = {
        "industry_benchmarks": {
            "available": bool(company_data.get("industry")),
            "required_fields": ["industry"],
            "description": "Compare your metrics against industry averages"
        },
        "competitor_analysis": {
            "available": bool(company_data.get("industry") and company_data.get("competitors")),
            "required_fields": ["industry", "competitors"],
            "description": "Analyze your position relative to competitors"
        },
        "tax_updates": {
            "available": bool(company_data.get("business_type") and company_data.get("location_state")),
            "required_fields": ["business_type", "location_state"],
            "description": "Get latest tax compliance requirements"
        },
        "growth_recommendations": {
            "available": bool(
                company_data.get("industry") and
                company_data.get("annual_revenue") and
                company_data.get("employee_count") and
                company_data.get("growth_stage")
            ),
            "required_fields": ["industry", "annual_revenue", "employee_count", "growth_stage"],
            "description": "Personalized growth strategies and case studies"
        }
    }

    return {
        "company_id": company_id,
        "capabilities": capabilities,
        "profile_completeness": sum(1 for c in capabilities.values() if c["available"]) / len(capabilities) * 100
    }
