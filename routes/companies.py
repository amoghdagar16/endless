from fastapi import APIRouter, HTTPException, Depends, Header
from database import table, supabase
from typing import Dict, Optional
from middleware.auth import get_current_user_company, require_role, verify_token, ensure_user_row_from_token

router = APIRouter(prefix="/companies", tags=["Companies"])

# Only pass these keys to DB (avoids "column does not exist" from frontend payload)
_COMPANY_KEYS = {
    "name", "industry", "email", "phone", "address", "city", "state", "zip_code", "country",
    "currency", "fiscal_year_end", "tax_id", "logo_url", "settings", "onboarding_completed",
    "business_type", "employee_count", "annual_revenue", "founded_year",
    "location_city", "location_state", "location_country", "location_zip",
    "primary_products", "target_market", "competitors", "growth_stage", "onboarding_step", "website",
}


def _company_payload(payload: dict) -> dict:
    return {k: v for k, v in payload.items() if k in _COMPANY_KEYS}


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


# Create a new company (requires auth, auto-links user)
@router.post("/")
async def create_company(company: dict, user_id: str = Depends(verify_token)):
    try:
        # Look up user row (may not exist if signup POST failed)
        user_resp = supabase.table("users").select("company_id").eq("id", user_id).execute()
        user_row = user_resp.data[0] if user_resp.data else None
        existing_company_id = user_row.get("company_id") if user_row else None

        payload = _company_payload(company)
        if not payload.get("name"):
            raise HTTPException(status_code=400, detail="Company name is required")

        if existing_company_id:
            response = table("companies").update(payload).eq("id", existing_company_id).execute()
            if not response.data:
                raise HTTPException(status_code=404, detail="Existing company not found, try again")
        else:
            response = table("companies").insert(payload).execute()
            if not response.data:
                raise HTTPException(status_code=500, detail="Company creation failed")
            new_id = response.data[0]["id"]
            # Auto-link: update or create user row
            if user_row:
                supabase.table("users").update({"company_id": new_id}).eq("id", user_id).execute()
            else:
                # User row missing — create it now so auth context can find it
                supabase.table("users").insert({
                    "id": user_id,
                    "company_id": new_id,
                    "email": "",
                    "full_name": "User",
                    "role": "admin"
                }).execute()

        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
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

        payload = _company_payload(update_data)
        response = table("companies").update(payload).eq("id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found.")

        # Link user to this company if not already linked (first time or was linked to different one during onboarding)
        if not user_company_id or (company_still_in_onboarding and user_company_id != company_id):
            supabase.table("users").update({"company_id": company_id}).eq("id", user_id).execute()

        # Auto-provision Chart of Accounts when onboarding completes
        if update_data.get("onboarding_completed") is True and company_still_in_onboarding:
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


# Get all users belonging to a specific company
@router.get("/{company_id}/users")
def get_company_users(company_id: str):
    """Fetch all users that belong to a given company."""
    try:
        response = table("users").select("*, companies(name, industry)").eq("company_id", company_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {e}")

