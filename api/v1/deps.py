from __future__ import annotations

import uuid
from typing import Generator

from fastapi import Header
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.exceptions import ValidationError


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_company_id(x_company_id: str | None = Header(default=None)) -> uuid.UUID:
    if not x_company_id:
        raise ValidationError("X-Company-Id header is required")
    try:
        return uuid.UUID(x_company_id)
    except ValueError as exc:
        raise ValidationError("X-Company-Id header must be a valid UUID") from exc
