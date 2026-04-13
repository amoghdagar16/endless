from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import os
from jose import jwt, JWTError


def _admin_session_secret() -> str:
    return (
        os.getenv("ADMIN_SESSION_SECRET")
        or os.getenv("SUPABASE_JWT_SECRET")
        or "dev-admin-session-secret"
    )


def create_admin_session_token(
    *,
    user_id: str,
    company_id: str,
    role: str,
    expires_minutes: int = 30,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)
    payload = {
        "sub": user_id,
        "company_id": company_id,
        "role": role,
        "type": "admin_session",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, _admin_session_secret(), algorithm="HS256")
    return {"token": token, "expires_at": exp.isoformat()}


def verify_admin_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, _admin_session_secret(), algorithms=["HS256"])
        if payload.get("type") != "admin_session":
            return None
        return payload
    except JWTError:
        return None
