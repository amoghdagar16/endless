from __future__ import annotations

import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models.audit_log import AuditLog


def log_action(
    session: Session,
    *,
    company_id: uuid.UUID,
    actor_id: Optional[uuid.UUID],
    action: str,
    entity: str,
    entity_id: uuid.UUID,
    before: Optional[dict[str, Any]] = None,
    after: Optional[dict[str, Any]] = None,
) -> None:
    record = AuditLog(
        company_id=company_id,
        actor_id=actor_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        before=before,
        after=after,
    )
    session.add(record)
