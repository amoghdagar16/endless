from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.models.company import Company


def ensure_company(session: Session, company_id: uuid.UUID) -> Company:
    company = session.execute(
        select(Company).where(Company.id == company_id)
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError("Company not found")
    return company
