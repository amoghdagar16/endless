"""
Contacts: customers and vendors (for Invoices and Bills).
Schema: contacts (contact_type: vendor, customer, both).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from database import supabase
from middleware.auth import get_current_user_company

router = APIRouter(prefix="/contacts", tags=["Contacts"])


class ContactCreate(BaseModel):
    contact_type: str  # vendor | customer | both
    display_name: str
    legal_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


@router.get("/")
async def list_contacts(
    contact_type: Optional[str] = None,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """List contacts (customers and/or vendors)."""
    cid = auth["company_id"]
    q = supabase.table("contacts").select("*").eq("company_id", cid)
    if contact_type:
        q = q.eq("contact_type", contact_type)
    r = q.order("display_name").execute()
    return r.data or []


@router.get("/{contact_id}")
async def get_contact(
    contact_id: str,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Get one contact."""
    cid = auth["company_id"]
    r = supabase.table("contacts").select("*").eq("id", contact_id).eq("company_id", cid).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    return r.data


@router.post("/")
async def create_contact(
    body: ContactCreate,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Create a customer or vendor."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "contact_type": body.contact_type,
        "display_name": body.display_name,
        "legal_name": body.legal_name,
        "email": body.email,
        "phone": body.phone,
        "address": body.address,
    }
    r = supabase.table("contacts").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create contact")
    return r.data[0]
