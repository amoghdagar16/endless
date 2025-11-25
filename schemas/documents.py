"""Schemas for document OCR endpoints."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""

    id: UUID
    filename: str
    file_size: int = Field(alias="fileSize")
    mime_type: str = Field(alias="mimeType")
    status: str
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class DocumentFieldUpdate(BaseModel):
    """Schema for updating extracted document fields."""

    vendor: Optional[str] = None
    transaction_date: Optional[date] = Field(None, alias="transactionDate")
    total_amount: Optional[Decimal] = Field(None, alias="totalAmount")
    tax_amount: Optional[Decimal] = Field(None, alias="taxAmount")
    description: Optional[str] = None  # Items purchased + card digits
    currency: Optional[str] = None

    model_config = {"populate_by_name": True}


class DocumentResponse(BaseModel):
    """Full document response with OCR data."""

    id: UUID
    company_id: UUID = Field(alias="companyId")
    filename: str
    file_size: int = Field(alias="fileSize")
    mime_type: str = Field(alias="mimeType")
    status: str

    # OCR data
    ocr_text: Optional[str] = Field(None, alias="ocrText")
    ocr_confidence: Optional[Decimal] = Field(None, alias="ocrConfidence")
    ocr_engine: str = Field(alias="ocrEngine")
    ocr_processed_at: Optional[datetime] = Field(None, alias="ocrProcessedAt")

    # Extracted fields
    vendor: Optional[str] = None
    transaction_date: Optional[date] = Field(None, alias="transactionDate")
    total_amount: Optional[Decimal] = Field(None, alias="totalAmount")
    tax_amount: Optional[Decimal] = Field(None, alias="taxAmount")
    description: Optional[str] = None  # Items purchased + card digits
    currency: str

    # Error tracking
    error_message: Optional[str] = Field(None, alias="errorMessage")

    # Timestamps
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}
