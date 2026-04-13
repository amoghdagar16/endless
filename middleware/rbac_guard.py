from typing import Optional, Dict
import os

from fastapi import Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from database import table

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

USER_ALLOWED_CREATE_PATHS = {
    "/journals",
    "/invoices",
    "/bills",
    "/payments",
    "/bill-payments",
}


def _normalize_path(path: str) -> str:
    p = (path or "/").rstrip("/")
    return p or "/"


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "")


def _decode_user_id(token: Optional[str]) -> Optional[str]:
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


def _load_role(user_id: Optional[str]) -> Optional[Dict[str, str]]:
    if not user_id:
        return None
    try:
        response = table("users")\
            .select("id, role, company_id")\
            .eq("id", user_id)\
            .limit(1)\
            .execute()
        if not response.data:
            return None
        return response.data[0]
    except Exception:
        return None


class RBACGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = _normalize_path(request.url.path)
        method = request.method.upper()

        # Auth/login utility paths should remain accessible.
        if path.startswith("/users/auth/attempts"):
            return await call_next(request)

        token = _extract_bearer(request.headers.get("authorization"))
        user_id = _decode_user_id(token)
        auth_row = _load_role(user_id)
        if not auth_row:
            return await call_next(request)

        role = (auth_row.get("role") or "user").lower()

        # Restrict sensitive feature access for user/viewer.
        if role in {"user", "viewer"} and (
            path.startswith("/ai") or path.startswith("/reports") or path.startswith("/admin")
        ):
            return JSONResponse(
                status_code=403,
                content={"detail": "Access denied for your role."},
            )

        # Viewer is read-only globally.
        if role == "viewer" and method in MUTATING_METHODS:
            return JSONResponse(
                status_code=403,
                content={"detail": "Viewer role is read-only."},
            )

        # User can only add transactions (create-only on specific endpoints).
        if role == "user" and method in MUTATING_METHODS:
            if not (method == "POST" and path in USER_ALLOWED_CREATE_PATHS):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "User role can only add new transactions."},
                )

        return await call_next(request)
