from fastapi import APIRouter, HTTPException, Depends, Header
from database import table, supabase
from typing import Dict, Optional
from middleware.auth import get_current_user_company, require_role, verify_token, ensure_user_row_from_token
from pydantic import BaseModel
from lib.mailer import send_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["Companies"])


class JoinCompanyRequestBody(BaseModel):
    company_id: Optional[str] = None
    company_name: str
    note: Optional[str] = None


# Lookup company by name (for onboarding "join existing company" flow)
@router.get("/lookup")
async def lookup_company_by_name(
    name: str,
    user_id: str = Depends(verify_token),
):
    try:
        normalized_name = (name or "").strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="Company name is required")

        # Prefer exact match first
        exact = table("companies")\
            .select("id, name, onboarding_completed, created_at")\
            .eq("name", normalized_name)\
            .order("created_at")\
            .limit(1)\
            .execute()
        if exact.data:
            return {"status": "success", "data": exact.data}

        # Fallback: case-insensitive exact-ish match
        ci = table("companies")\
            .select("id, name, onboarding_completed, created_at")\
            .ilike("name", normalized_name)\
            .order("created_at")\
            .limit(1)\
            .execute()
        return {"status": "success", "data": ci.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/request-join")
async def request_to_join_company(
    body: JoinCompanyRequestBody,
    authorization: Optional[str] = Header(None),
    user_id: str = Depends(verify_token),
):
    """
    Request access to an existing company.
    Sends authorization email to all owner/admin members in that company.
    """
    try:
        normalized_name = (body.company_name or "").strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="Company name is required")

        # Ensure requester user row exists.
        requester_resp = supabase.table("users").select("id, email, full_name, company_id").eq("id", user_id).limit(1).execute()
        if not requester_resp.data:
            ensure_user_row_from_token(authorization)
            requester_resp = supabase.table("users").select("id, email, full_name, company_id").eq("id", user_id).limit(1).execute()
        if not requester_resp.data:
            raise HTTPException(status_code=404, detail="Requester user not found")
        requester = requester_resp.data[0]

        if requester.get("company_id"):
            raise HTTPException(status_code=400, detail="You are already assigned to a company")

        company = None
        if body.company_id:
            by_id = table("companies").select("id, name, onboarding_completed").eq("id", body.company_id).limit(1).execute()
            if by_id.data:
                company = by_id.data[0]
        if not company:
            by_name = table("companies")\
                .select("id, name, onboarding_completed")\
                .ilike("name", normalized_name)\
                .order("created_at")\
                .limit(1)\
                .execute()
            if by_name.data:
                company = by_name.data[0]
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        company_id = company["id"]
        company_name = company.get("name") or normalized_name

        approvers_resp = table("users")\
            .select("email, full_name, role")\
            .eq("company_id", company_id)\
            .in_("role", ["owner", "admin"])\
            .execute()
        approvers = approvers_resp.data or []
        approver_emails = [a.get("email", "").strip() for a in approvers if a.get("email")]
        if not approver_emails:
            raise HTTPException(status_code=400, detail="No owner/admin emails found for this company")

        requester_name = requester.get("full_name") or requester.get("email") or "Unknown user"
        requester_email = requester.get("email") or "unknown-email"
        note = (body.note or "").strip()

        subject = f"[Fintra] Join request for {company_name}"
        admin_url = "http://127.0.0.1:3000/admin"
        text_body = (
            f"{requester_name} ({requester_email}) requested access to {company_name}.\n\n"
            f"Requester user id: {user_id}\n"
            f"Company id: {company_id}\n"
            f"Note: {note if note else '(none)'}\n\n"
            f"Review and authorize from the Admin panel:\n{admin_url}\n"
        )
        html_body = f"""
        <p><strong>{requester_name}</strong> ({requester_email}) requested access to <strong>{company_name}</strong>.</p>
        <p>
          <strong>Requester user id:</strong> {user_id}<br/>
          <strong>Company id:</strong> {company_id}<br/>
          <strong>Note:</strong> {note if note else '(none)'}
        </p>
        <p>Review and authorize from the Admin panel:<br/>
        <a href="{admin_url}">{admin_url}</a></p>
        """

        send_email(subject=subject, recipients=approver_emails, text_body=text_body, html_body=html_body)
        return {"status": "success", "message": "Join request sent to company owner/admin"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send join request email: {e}")


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

