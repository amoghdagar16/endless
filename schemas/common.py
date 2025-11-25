from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    row: Optional[int] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class APIErrorEnvelope(BaseModel):
    error: ErrorResponse


class HealthResponse(BaseModel):
    status: str
    db: str
