from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Literal
import hashlib
import os

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel

from database import table
from middleware.auth import require_any_role
from lib.admin_session import create_admin_session_token, verify_admin_session_token
from lib.audit import purge_company_activity_logs

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminPasscodeBody(BaseModel):
    passcode: str


class AdminSessionValidateBody(BaseModel):
    token: str


def _passcode_hash(company_id: str, user_id: str, passcode: str) -> str:
    pepper = os.getenv("ADMIN_PASSCODE_PEPPER", "dev-admin-pepper")
    source = f"{pepper}:{company_id}:{user_id}:{passcode}"
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def _validate_admin_session_or_403(
    token: Optional[str],
    auth: Dict[str, str],
) -> Dict[str, Any]:
    payload = verify_admin_session_token(token or "")
    if not payload:
        raise HTTPException(status_code=401, detail="Missing or invalid admin session")
    if payload.get("sub") != auth["user_id"] or payload.get("company_id") != auth["company_id"]:
        raise HTTPException(status_code=403, detail="Admin session does not match current user/company")
    return payload


@router.post("/session/set-passcode")
def set_admin_passcode(
    body: AdminPasscodeBody,
    auth: Dict[str, str] = Depends(require_any_role("owner", "admin")),
):
    passcode = (body.passcode or "").strip()
    if len(passcode) < 6:
        raise HTTPException(status_code=400, detail="Passcode must be at least 6 characters")

    hashed = _passcode_hash(auth["company_id"], auth["user_id"], passcode)
    response = table("admin_passcodes")\
        .upsert({
            "user_id": auth["user_id"],
            "company_id": auth["company_id"],
            "passcode_hash": hashed,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="user_id")\
        .execute()
    return {"status": "success", "data": response.data}


@router.post("/session/verify-passcode")
def verify_passcode(
    body: AdminPasscodeBody,
    auth: Dict[str, str] = Depends(require_any_role("owner", "admin")),
):
    passcode = (body.passcode or "").strip()
    if not passcode:
        raise HTTPException(status_code=400, detail="Passcode is required")

    existing = table("admin_passcodes")\
        .select("user_id, company_id, passcode_hash")\
        .eq("user_id", auth["user_id"])\
        .eq("company_id", auth["company_id"])\
        .limit(1)\
        .execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Admin passcode is not configured for this account")

    stored = existing.data[0]
    expected = _passcode_hash(auth["company_id"], auth["user_id"], passcode)
    if stored.get("passcode_hash") != expected:
        raise HTTPException(status_code=401, detail="Invalid admin passcode")

    token_payload = create_admin_session_token(
        user_id=auth["user_id"],
        company_id=auth["company_id"],
        role=auth.get("role", "admin"),
        expires_minutes=30,
    )
    return {"status": "success", **token_payload}


@router.post("/session/validate")
def validate_admin_session(
    body: AdminSessionValidateBody,
    auth: Dict[str, str] = Depends(require_any_role("owner", "admin")),
):
    payload = _validate_admin_session_or_403(body.token, auth)
    return {"status": "success", "payload": payload}


@router.get("/activity")
def list_activity(
    auth: Dict[str, str] = Depends(require_any_role("owner", "admin")),
    x_admin_session: Optional[str] = Header(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    direction: Optional[Literal["inbound", "outbound"]] = None,
    method: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    status_code: Optional[int] = None,
    path_contains: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    _validate_admin_session_or_403(x_admin_session, auth)

    q = table("server_activity_logs")\
        .select("*", count="exact")\
        .eq("company_id", auth["company_id"])

    if direction:
        q = q.eq("direction", direction)
    if method:
        q = q.eq("method", method.upper())
    if actor_user_id:
        q = q.eq("actor_user_id", actor_user_id)
    if status_code is not None:
        q = q.eq("status_code", status_code)
    if path_contains:
        q = q.ilike("path", f"%{path_contains}%")
    if start_date:
        q = q.gte("created_at", start_date)
    if end_date:
        q = q.lte("created_at", end_date)

    response = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {
        "status": "success",
        "data": response.data or [],
        "total": response.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.post("/activity/purge")
def purge_old_activity(
    auth: Dict[str, str] = Depends(require_any_role("owner", "admin")),
    x_admin_session: Optional[str] = Header(None),
):
    _validate_admin_session_or_403(x_admin_session, auth)
    deleted = purge_company_activity_logs(auth["company_id"], days=30)
    return {
        "status": "success",
        "deleted_count": deleted,
        "before_date": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
    }
