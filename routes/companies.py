from fastapi import APIRouter, HTTPException, Depends, Header
from database import table, supabase
from typing import Dict, Optional
from middleware.auth import get_current_user_company, require_role, verify_token, ensure_user_row_from_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["Companies"])


# Get all companies (with users included)
@router.get("/with-users")
def get_companies_with_users():
    """Fetch all companies along with their associated users."""
    try:
        response = table("companies").select("*, users(full_name, email, role, user_type)").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching companies: {e}")


# Get authenticated user's company (works for users with or without companies)
@router.get("/")
async def get_all_companies(
    authorization: Optional[str] = Header(None),
    user_id: str = Depends(verify_token)
):
    try:
        user_response = supabase.table("users").select("company_id").eq("id", user_id).limit(1).execute()

        if not user_response.data:
            ensure_user_row_from_token(authorization)
            user_response = supabase.table("users").select("company_id").eq("id", user_id).limit(1).execute()

        if not user_response.data or not user_response.data[0].get("company_id"):
            return {"status": "success", "data": []}

        company_id = user_response.data[0]["company_id"]
        response = table("companies").select("*").eq("id", company_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get a single company by ID (with users)
@router.get("/{company_id}")
def get_company(company_id: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    try:
        # Verify user owns this company
        if auth["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Cannot access another company")

        response = (
            table("companies")
            .select("*, users(full_name, email, role, user_type)")
            .eq("id", company_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found.")
        return {"status": "success", "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new company
@router.post("/")
def create_company(company: dict):
    try:
        response = table("companies").insert(company).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Update a company
@router.patch("/{company_id}")
async def update_company(
    company_id: str,
    update_data: dict,
    authorization: Optional[str] = Header(None),
    user_id: str = Depends(verify_token)
):
    try:
        user_response = supabase.table("users").select("company_id, id").eq("id", user_id).limit(1).execute()

        if not user_response.data:
            ensure_user_row_from_token(authorization)
            user_response = supabase.table("users").select("company_id, id").eq("id", user_id).limit(1).execute()

        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")

        user_company_id = user_response.data[0].get("company_id")

        # Verify the company exists and get onboarding status
        company_response = supabase.table("companies").select("id, onboarding_completed").eq("id", company_id).limit(1).execute()

        if not company_response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        company_row = company_response.data[0]
        company_still_in_onboarding = company_row.get("onboarding_completed") is False

        # Allow update if:
        # 1. User's company_id matches (already onboarded), OR
        # 2. User has no company yet (onboarding), OR
        # 3. Company is still in onboarding (user may have just created it; link may not be set yet)
        if user_company_id and user_company_id != company_id and not company_still_in_onboarding:
            raise HTTPException(status_code=403, detail="Cannot update another company")

        # Update the company
        response = table("companies").update(update_data).eq("id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found.")

        # Link user to this company if not already linked (first time or was linked to different one during onboarding)
        if not user_company_id or (company_still_in_onboarding and user_company_id != company_id):
            supabase.table("users").update({"company_id": company_id}).eq("id", user_id).execute()

        # Auto-provision Chart of Accounts when:
        # 1. Onboarding completes (onboarding flow), OR
        # 2. Industry is set/changed (profile update) — provision_coa_for_company
        #    is idempotent and skips if accounts already exist, so this is safe.
        industry_updated = "industry" in update_data and update_data.get("industry")
        onboarding_complete = update_data.get("onboarding_completed") is True and company_still_in_onboarding
        if onboarding_complete or industry_updated:
            from routes.coa_templates import provision_coa_for_company
            industry = response.data[0].get("industry", "") if response.data else ""
            provision_coa_for_company(company_id, industry)

        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Delete a company (admin only)
@router.delete("/{company_id}")
def delete_company(company_id: str, auth: Dict[str, str] = Depends(lambda a=Depends(get_current_user_company): require_role("admin", a))):
    try:
        # Additional check: can only delete own company even as admin
        if auth["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Cannot delete another company")

        response = table("companies").delete().eq("id", company_id).execute()
        return {"status": "success", "message": f"Company {company_id} deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Force provision (or re-provision) Chart of Accounts
@router.post("/{company_id}/provision-coa")
async def provision_coa(
    company_id: str,
    user_id: str = Depends(verify_token),
):
    """
    Trigger COA provisioning for a company.
    - If no accounts exist: provisions from the industry template.
    - If accounts already exist: returns 'already provisioned'.
    - If coa_templates table is empty: tells user to run migration 004.
    """
    try:
        # Check templates exist
        templates_check = supabase.table("coa_templates").select("id").limit(1).execute()
        if not templates_check.data:
            raise HTTPException(
                status_code=400,
                detail="COA templates table is empty. Please run migration 004 in Supabase SQL Editor first.",
            )

        # Check if accounts already exist
        existing = supabase.table("accounts").select("id").eq("company_id", company_id).limit(1).execute()
        if existing.data:
            return {"status": "already_provisioned", "message": "Chart of Accounts already exists for this company."}

        # Get company industry
        co = supabase.table("companies").select("industry").eq("id", company_id).single().execute()
        if not co.data:
            raise HTTPException(status_code=404, detail="Company not found")
        industry = co.data.get("industry") or ""

        # Run provisioning
        from routes.coa_templates import provision_coa_for_company
        provision_coa_for_company(company_id, industry)

        # Verify accounts were created
        after = supabase.table("accounts").select("id").eq("company_id", company_id).execute()
        count = len(after.data) if after.data else 0
        if count == 0:
            raise HTTPException(
                status_code=500,
                detail=f"Provisioning ran but no accounts were created. Industry '{industry}' may not match any template name."
            )

        return {"status": "success", "message": f"Provisioned {count} accounts for industry '{industry}'."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("provision-coa error for company %s: %s", company_id, e)
        raise HTTPException(status_code=500, detail=str(e))


# Get all users belonging to a specific company
@router.get("/{company_id}/users")
def get_company_users(company_id: str):
    """Fetch all users that belong to a given company."""
    try:
        response = table("users").select("*, companies(name, industry)").eq("company_id", company_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {e}")

