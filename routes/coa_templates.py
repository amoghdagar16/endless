"""
COA Templates for COA-first onboarding (Step 2: pick business type, get pre-made buckets).
Schema: coa_templates, coa_template_accounts.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import logging
from database import supabase
from middleware.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coa-templates", tags=["COA Templates"])


@router.get("/")
async def list_templates(_: str = Depends(verify_token)):
    """List available Chart of Accounts templates (SaaS, Services, Retail, etc.)."""
    try:
        r = supabase.table("coa_templates").select("*").order("name").execute()
        return r.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}/accounts")
async def get_template_accounts(
    template_id: str,
    _: str = Depends(verify_token),
):
    """Get accounts for a COA template (to copy into company COA during onboarding)."""
    try:
        r = supabase.table("coa_template_accounts")\
            .select("*")\
            .eq("coa_template_id", template_id)\
            .order("account_code")\
            .execute()
        return r.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def provision_coa_for_company(company_id: str, industry: str) -> None:
    """
    Copy template accounts into the company's chart of accounts.
    Called once when onboarding completes. Idempotent — skips if accounts already exist.
    """
    try:
        # Idempotency: skip if any accounts already exist for this company
        existing = supabase.table("accounts") \
            .select("id") \
            .eq("company_id", company_id) \
            .limit(1) \
            .execute()
        if existing.data:
            logger.info("COA already provisioned for company %s, skipping", company_id)
            return

        # Find template by industry name, fallback to "Other"
        template = supabase.table("coa_templates") \
            .select("id") \
            .eq("name", industry) \
            .limit(1) \
            .execute()

        template_id = None
        if template.data:
            template_id = template.data[0]["id"]
        else:
            fallback = supabase.table("coa_templates") \
                .select("id") \
                .eq("name", "Other") \
                .limit(1) \
                .execute()
            if fallback.data:
                template_id = fallback.data[0]["id"]

        if not template_id:
            logger.warning("No COA template found for industry '%s' and no 'Other' fallback", industry)
            return

        # Fetch template accounts ordered by code
        tmpl_accounts = supabase.table("coa_template_accounts") \
            .select("*") \
            .eq("coa_template_id", template_id) \
            .order("account_code") \
            .execute()

        if not tmpl_accounts.data:
            logger.warning("Template %s has no accounts", template_id)
            return

        # Pass 1: insert root accounts (no parent_account_code)
        roots = [a for a in tmpl_accounts.data if not a.get("parent_account_code")]
        children = [a for a in tmpl_accounts.data if a.get("parent_account_code")]

        code_to_id: dict[str, str] = {}

        if roots:
            root_rows = [
                {
                    "company_id": company_id,
                    "account_code": a["account_code"],
                    "account_name": a["account_name"],
                    "account_type": a["account_type"],
                    "account_subtype": a.get("account_subtype"),
                    "is_system": True,
                }
                for a in roots
            ]
            result = supabase.table("accounts").insert(root_rows).execute()
            for row in result.data:
                code_to_id[row["account_code"]] = row["id"]

        # Pass 2: insert child accounts (have parent_account_code)
        if children:
            child_rows = [
                {
                    "company_id": company_id,
                    "account_code": a["account_code"],
                    "account_name": a["account_name"],
                    "account_type": a["account_type"],
                    "account_subtype": a.get("account_subtype"),
                    "parent_account_id": code_to_id.get(a["parent_account_code"]),
                    "is_system": True,
                }
                for a in children
            ]
            result = supabase.table("accounts").insert(child_rows).execute()
            for row in result.data:
                code_to_id[row["account_code"]] = row["id"]

        # Set coa_template_id on the company
        supabase.table("companies") \
            .update({"coa_template_id": template_id}) \
            .eq("id", company_id) \
            .execute()

        logger.info("Provisioned %d accounts for company %s (template: %s)",
                     len(tmpl_accounts.data), company_id, industry)

    except Exception as e:
        logger.error("Failed to provision COA for company %s: %s", company_id, e)
