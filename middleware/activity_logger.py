from time import perf_counter
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError

from database import table
from lib.audit import log_server_activity
import os

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "")


def _decode_sub_from_token(token: str) -> Optional[str]:
    if not token or not SUPABASE_JWT_SECRET:
        return None
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload.get("sub")
    except JWTError:
        return None


def _resolve_actor(user_id: Optional[str]) -> Dict[str, Any]:
    if not user_id:
        return {}
    try:
        response = table("users")\
            .select("id, company_id, role, email")\
            .eq("id", user_id)\
            .limit(1)\
            .execute()
        if not response.data:
            return {"user_id": user_id}
        row = response.data[0]
        return {
            "user_id": row.get("id"),
            "company_id": row.get("company_id"),
            "role": row.get("role"),
            "email": row.get("email"),
        }
    except Exception:
        return {"user_id": user_id}


class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """Metadata-only inbound request logger."""

    async def dispatch(self, request: Request, call_next):
        started = perf_counter()
        status_code = 500
        actor: Dict[str, Any] = {}
        path = request.url.path
        method = request.method.upper()
        ip_addr = request.client.host if request.client else None
        query = request.url.query

        try:
            token = _extract_bearer(request.headers.get("authorization"))
            user_id = _decode_sub_from_token(token) if token else None
            actor = _resolve_actor(user_id)
            request.state.audit_actor = actor
        except Exception:
            actor = {}

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration = int((perf_counter() - started) * 1000)
            log_server_activity(
                direction="inbound",
                method=method,
                path=path,
                status_code=status_code,
                duration_ms=duration,
                ip_address=ip_addr,
                company_id=actor.get("company_id"),
                actor_user_id=actor.get("user_id"),
                actor_role=actor.get("role"),
                actor_email=actor.get("email"),
                metadata={
                    "query": query,
                    "logged_at": datetime.now(timezone.utc).isoformat(),
                },
            )
