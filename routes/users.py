from datetime import datetime, timedelta, timezone
from typing import Literal, Dict
from fastapi import APIRouter, HTTPException, Depends
from database import table
from pydantic import BaseModel, EmailStr
from middleware.auth import require_min_role

router = APIRouter(prefix="/users", tags=["Users"])

MAX_CONSECUTIVE_FAILURES = 5
LOCKOUT_SECONDS = 180


class AuthAttemptsPrecheckRequest(BaseModel):
    email: EmailStr


class AuthAttemptsRecordRequest(BaseModel):
    email: EmailStr
    outcome: Literal["invalid_credentials", "success"]


class RoleUpdateRequest(BaseModel):
    role: Literal["owner", "admin", "accountant", "user", "viewer"]


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _parse_timestamptz(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _read_attempt_row(email: str) -> dict | None:
    response = table("auth_login_attempts")\
        .select("*")\
        .eq("email", email)\
        .limit(1)\
        .execute()
    if not response.data:
        return None
    return response.data[0]


def _clear_if_expired(email: str, row: dict | None) -> dict | None:
    """Reset stale lockout state so users are not re-locked immediately after expiry."""
    if not row:
        return None

    locked_until = _parse_timestamptz(row.get("locked_until"))
    now = datetime.now(timezone.utc)
    if locked_until and locked_until <= now:
        reset_response = table("auth_login_attempts")\
            .upsert({
                "email": email,
                "consecutive_failures": 0,
                "locked_until": None,
                "updated_at": now.isoformat(),
            }, on_conflict="email")\
            .execute()
        if reset_response.data:
            return reset_response.data[0]
        return {
            "email": email,
            "consecutive_failures": 0,
            "locked_until": None,
            "updated_at": now.isoformat(),
        }
    return row


def _lock_state(email: str) -> dict:
    row = _clear_if_expired(email, _read_attempt_row(email))
    locked_until = _parse_timestamptz(row.get("locked_until")) if row else None
    now = datetime.now(timezone.utc)

    remaining_seconds = 0
    if locked_until and locked_until > now:
        remaining_seconds = int((locked_until - now).total_seconds())
        if remaining_seconds < 0:
            remaining_seconds = 0

    return {
        "row": row,
        "locked": remaining_seconds > 0,
        "remaining_seconds": remaining_seconds,
        "consecutive_failures": int((row or {}).get("consecutive_failures", 0) or 0),
    }


@router.post("/auth/attempts/precheck")
def precheck_auth_attempts(payload: AuthAttemptsPrecheckRequest):
    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    state = _lock_state(email)
    return {
        "email": email,
        "locked": state["locked"],
        "remaining_seconds": state["remaining_seconds"],
        "max_attempts": MAX_CONSECUTIVE_FAILURES,
        "lockout_seconds": LOCKOUT_SECONDS,
    }


@router.post("/auth/attempts/record")
def record_auth_attempt(payload: AuthAttemptsRecordRequest):
    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    now = datetime.now(timezone.utc)
    state = _lock_state(email)

    if payload.outcome == "success":
        response = table("auth_login_attempts")\
            .upsert({
                "email": email,
                "consecutive_failures": 0,
                "locked_until": None,
                "updated_at": now.isoformat(),
            }, on_conflict="email")\
            .execute()
        return {
            "email": email,
            "locked": False,
            "remaining_seconds": 0,
            "consecutive_failures": 0,
            "max_attempts": MAX_CONSECUTIVE_FAILURES,
            "lockout_seconds": LOCKOUT_SECONDS,
            "data": response.data,
        }

    if state["locked"]:
        return {
            "email": email,
            "locked": True,
            "remaining_seconds": state["remaining_seconds"],
            "consecutive_failures": state["consecutive_failures"],
            "max_attempts": MAX_CONSECUTIVE_FAILURES,
            "lockout_seconds": LOCKOUT_SECONDS,
        }

    next_failures = state["consecutive_failures"] + 1
    locked_until = None
    remaining_seconds = 0
    is_locked = False

    if next_failures >= MAX_CONSECUTIVE_FAILURES:
        is_locked = True
        next_failures = MAX_CONSECUTIVE_FAILURES
        locked_until_dt = now + timedelta(seconds=LOCKOUT_SECONDS)
        locked_until = locked_until_dt.isoformat()
        remaining_seconds = LOCKOUT_SECONDS

    response = table("auth_login_attempts")\
        .upsert({
            "email": email,
            "consecutive_failures": next_failures,
            "locked_until": locked_until,
            "updated_at": now.isoformat(),
        }, on_conflict="email")\
        .execute()

    return {
        "email": email,
        "locked": is_locked,
        "remaining_seconds": remaining_seconds,
        "consecutive_failures": next_failures,
        "max_attempts": MAX_CONSECUTIVE_FAILURES,
        "lockout_seconds": LOCKOUT_SECONDS,
        "data": response.data,
    }


# Get all users
@router.get("/")
def get_all_users():
    try:
        response = table("users").select("*").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get a user by ID
@router.get("/{user_id}")
def get_user(user_id: str):
    try:
        response = table("users").select("*").eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"status": "success", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new user
@router.post("/")
def create_user(user: dict):
    try:
        response = table("users").insert(user).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Update a user
@router.patch("/{user_id}")
def update_user(user_id: str, update_data: dict):
    try:
        response = table("users").update(update_data).eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Delete a user
@router.delete("/{user_id}")
def delete_user(user_id: str):
    try:
        response = table("users").delete().eq("id", user_id).execute()
        return {"status": "success", "message": f"User {user_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new user linked to a specific company
@router.post("/company/{company_id}")
def create_user_for_company(company_id: str, user: dict):
    """Create a new user and automatically link them to a company."""
    try:
        user["company_id"] = company_id
        response = table("users").insert(user).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {e}")


@router.get("/manage/company-members")
def get_company_members(auth: Dict[str, str] = Depends(require_min_role("admin"))):
    """List users in authenticated user's company (owner/admin only)."""
    response = table("users")\
        .select("id, company_id, email, full_name, role, created_at")\
        .eq("company_id", auth["company_id"])\
        .order("created_at")\
        .execute()
    return {"status": "success", "data": response.data or []}


@router.patch("/manage/company-members/{target_user_id}/role")
def update_company_member_role(
    target_user_id: str,
    payload: RoleUpdateRequest,
    auth: Dict[str, str] = Depends(require_min_role("admin")),
):
    """
    Update a member role within the same company.
    - owner can demote/reassign admin roles
    - admin cannot change owner/admin roles
    """
    actor_role = (auth.get("role") or "user").lower()
    company_id = auth["company_id"]

    target_resp = table("users")\
        .select("id, role, company_id")\
        .eq("id", target_user_id)\
        .eq("company_id", company_id)\
        .limit(1)\
        .execute()
    if not target_resp.data:
        raise HTTPException(status_code=404, detail="Target user not found in your company")

    target = target_resp.data[0]
    target_role = (target.get("role") or "user").lower()
    next_role = payload.role.lower()

    if actor_role == "admin":
        if target_role in {"owner", "admin"}:
            raise HTTPException(status_code=403, detail="Admins cannot modify owner/admin roles")
        if next_role in {"owner", "admin"}:
            raise HTTPException(status_code=403, detail="Admins cannot assign owner/admin roles")

    if actor_role == "owner":
        if target_user_id == auth["user_id"] and next_role != "owner":
            raise HTTPException(status_code=400, detail="Owner cannot demote self")

    updated = table("users")\
        .update({"role": next_role, "updated_at": datetime.now(timezone.utc).isoformat()})\
        .eq("id", target_user_id)\
        .eq("company_id", company_id)\
        .execute()
    if not updated.data:
        raise HTTPException(status_code=400, detail="Failed to update role")

    return {"status": "success", "data": updated.data[0]}
