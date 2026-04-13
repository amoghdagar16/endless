"""
Documents: upload receipts, link to journal (Step 6).
Schema: documents (document_type, ocr_status, extracted_*).
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict
from database import supabase
from middleware.auth import get_current_user_company

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/")
async def list_documents(
    company_id: Optional[str] = None,
    document_type: Optional[str] = None,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """List documents for the company."""
    cid = auth["company_id"]
    if company_id and company_id != cid:
        raise HTTPException(status_code=403, detail="Cannot list another company's documents")
    q = supabase.table("documents").select("*").eq("company_id", cid)
    if document_type:
        q = q.eq("document_type", document_type)
    r = q.order("created_at", desc=True).execute()
    return r.data or []


@router.post("/")
async def create_document(
    body: dict,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Create a document record (e.g. after file upload to storage). Links to journal_entry_id if provided."""
    cid = auth["company_id"]
    data = {
        "company_id": cid,
        "document_type": body.get("document_type", "receipt"),
        "file_name": body.get("file_name", ""),
        "file_url": body.get("file_url", ""),
        "journal_entry_id": body.get("journal_entry_id"),
        "ocr_status": body.get("ocr_status", "pending"),
        "extracted_vendor": body.get("extracted_vendor"),
        "extracted_amount": body.get("extracted_amount"),
        "extracted_date": body.get("extracted_date"),
        "extracted_category": body.get("extracted_category"),
        "extracted_fields": body.get("extracted_fields"),
        "uploaded_by": auth.get("user_id"),
    }
    r = supabase.table("documents").insert(data).execute()
    if not r.data:
        raise HTTPException(status_code=400, detail="Failed to create document")
    return r.data[0]


@router.patch("/{document_id}")
async def update_document(
    document_id: str,
    body: dict,
    auth: Dict[str, str] = Depends(get_current_user_company),
):
    """Update document (e.g. link to journal_entry_id after posting)."""
    cid = auth["company_id"]
    allowed = {"journal_entry_id", "ocr_status", "extracted_vendor", "extracted_amount", "extracted_date", "extracted_fields"}
    data = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    r = supabase.table("documents").update(data).eq("id", document_id).eq("company_id", cid).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return r.data[0]
