from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from database import table, supabase


def log_server_activity(
    *,
    direction: str,
    method: Optional[str] = None,
    path: Optional[str] = None,
    status_code: Optional[int] = None,
    duration_ms: Optional[int] = None,
    ip_address: Optional[str] = None,
    target_service: Optional[str] = None,
    company_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    actor_email: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Best-effort metadata audit logging. Never raises to caller."""
    try:
        payload: Dict[str, Any] = {
            "direction": direction,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "ip_address": ip_address,
            "target_service": target_service,
            "company_id": company_id,
            "actor_user_id": actor_user_id,
            "actor_role": actor_role,
            "actor_email": actor_email,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        payload = {k: v for k, v in payload.items() if v is not None}
        table("server_activity_logs").insert(payload).execute()
    except Exception:
        # Logging must never block business flow.
        return


def purge_company_activity_logs(company_id: str, days: int = 30) -> int:
    """Purge old logs for one company; returns number of deleted rows."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        response = table("server_activity_logs")\
            .delete()\
            .eq("company_id", company_id)\
            .lt("created_at", cutoff.isoformat())\
            .execute()
        return len(response.data or [])
    except Exception:
        return 0


def purge_all_activity_logs_via_function() -> int:
    """Use SQL function for global 30-day purge. Returns deleted row count."""
    try:
        response = supabase.rpc("purge_server_activity_logs").execute()
        if isinstance(response.data, int):
            return response.data
        if isinstance(response.data, list) and response.data:
            first = response.data[0]
            if isinstance(first, int):
                return first
        return 0
    except Exception:
        return 0
