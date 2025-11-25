"""Document OCR API routes."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.deps import get_company_id, get_db
from app.db.models.document import Document
from app.schemas.documents import DocumentFieldUpdate, DocumentResponse, DocumentUploadResponse
from app.services.ocr_service import get_ocr_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

# Allowed file types
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Upload directory
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent.parent / "uploads"


def get_upload_path(company_id: uuid.UUID) -> Path:
    """Get upload directory for company."""
    path = UPLOAD_DIR / str(company_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    company_id: Annotated[uuid.UUID, Depends(get_company_id)] = None,
    db: Session = Depends(get_db),
):
    """
    Upload a document (image or PDF) for OCR processing.

    Args:
        file: Uploaded file
        company_id: Current company ID
        db: Database session

    Returns:
        Document metadata

    Raises:
        HTTPException: If file type or size is invalid
    """
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    # Read file content
    file_content = await file.read()

    # Validate file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    # Save file to disk
    upload_path = get_upload_path(company_id)
    file_path = upload_path / unique_filename

    try:
        with open(file_path, "wb") as f:
            f.write(file_content)

        logger.info(f"File saved: {file_path}")

    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail="Error saving file")

    # Create document record
    document = Document(
        id=uuid.uuid4(),
        company_id=company_id,
        filename=file.filename,
        mime_type=file.content_type,
        file_size=len(file_content),
        file_path=str(file_path),
        status="uploaded",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info(f"Document created: {document.id}")

    return document


@router.post("/{document_id}/process", response_model=DocumentResponse)
async def process_document(
    document_id: uuid.UUID,
    company_id: Annotated[uuid.UUID, Depends(get_company_id)] = None,
    db: Session = Depends(get_db),
):
    """
    Process document with OCR and extract fields.

    Args:
        document_id: Document ID
        company_id: Current company ID
        db: Database session

    Returns:
        Document with OCR results

    Raises:
        HTTPException: If document not found or processing fails
    """
    # Get document
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.company_id == company_id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if already processed
    if document.status == "completed":
        return document

    # Update status to processing
    document.status = "processing"
    db.commit()

    try:
        # Read file from disk
        if not os.path.exists(document.file_path):
            raise HTTPException(status_code=404, detail="Document file not found on disk")

        with open(document.file_path, "rb") as f:
            file_bytes = f.read()

        # Get OCR service
        ocr_service = get_ocr_service()

        # Process with OCR
        logger.info(f"Processing document {document_id} with OCR...")
        ocr_result = await ocr_service.process_image(file_bytes)

        # Extract fields using Ollama Phi3
        receipt_fields = await ocr_service.extract_receipt_fields(ocr_result.text, ocr_result.confidence)

        # Update document with results
        document.ocr_text = ocr_result.text
        document.ocr_confidence = round(ocr_result.confidence * 100, 2)  # Convert to percentage
        document.ocr_processed_at = datetime.utcnow()

        document.vendor = receipt_fields.vendor
        document.transaction_date = receipt_fields.transaction_date
        document.total_amount = receipt_fields.total_amount
        document.tax_amount = receipt_fields.tax_amount
        document.description = receipt_fields.description  # Items + card digits
        document.currency = receipt_fields.currency

        document.status = "completed"
        document.error_message = None

        db.commit()
        db.refresh(document)

        logger.info(f"Document {document_id} processed successfully")

        return document

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")

        # Update document with error
        document.status = "error"
        document.error_message = str(e)
        db.commit()

        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    company_id: Annotated[uuid.UUID, Depends(get_company_id)] = None,
    db: Session = Depends(get_db),
):
    """
    Get document details.

    Args:
        document_id: Document ID
        company_id: Current company ID
        db: Database session

    Returns:
        Document details

    Raises:
        HTTPException: If document not found
    """
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.company_id == company_id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document_fields(
    document_id: uuid.UUID,
    updates: DocumentFieldUpdate,
    company_id: Annotated[uuid.UUID, Depends(get_company_id)] = None,
    db: Session = Depends(get_db),
):
    """
    Update extracted document fields (user edits before creating transaction).

    Args:
        document_id: Document ID
        updates: Field updates
        company_id: Current company ID
        db: Database session

    Returns:
        Updated document

    Raises:
        HTTPException: If document not found
    """
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.company_id == company_id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update fields
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)

    db.commit()
    db.refresh(document)

    logger.info(f"Document {document_id} fields updated")

    return document
