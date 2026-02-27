"""
Authentication middleware for JWT validation and company scoping.
Supports both Legacy HS256 (JWT Secret) and new ECC signing keys (JWKS).
"""

from fastapi import HTTPException, Header, Depends
from typing import Optional, Dict, Any
import os
import httpx
from jose import jwt, jwk, JWTError
from database import supabase

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
# JWKS for new ECC signing keys (after migration from Legacy JWT Secret)
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""

# In-memory cache of JWKS (keyed by kid) to avoid fetching on every request
_jwks_cache: Dict[str, Any] = {}


def _get_signing_key_from_jwks(kid: str) -> Optional[Any]:
    """Fetch JWKS and return the key for the given kid, with simple cache."""
    global _jwks_cache
    if kid in _jwks_cache:
        return _jwks_cache[kid]
    if not SUPABASE_JWKS_URL:
        return None
    try:
        resp = httpx.get(SUPABASE_JWKS_URL, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        for key in data.get("keys", []):
            if key.get("kid") == kid:
                key_obj = jwk.construct(key)
                _jwks_cache[kid] = key_obj
                return key_obj
    except Exception:
        pass
    return None


def _get_payload_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify JWT; return payload dict or None. Used for user sync."""
    if not token:
        return None
    # Legacy HS256
    if SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        except JWTError:
            pass
    # ECC JWKS
    try:
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if kid:
            key_obj = _get_signing_key_from_jwks(kid)
            if key_obj:
                return jwt.decode(
                    token,
                    key_obj,
                    algorithms=["ES256"],
                    audience="authenticated"
                )
    except JWTError:
        pass
    return None


def ensure_user_row_from_token(authorization: Optional[str]) -> bool:
    """
    If the authenticated user has no row in `users`, create it from JWT claims.
    Returns True if user row now exists, False otherwise.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.replace("Bearer ", "")
    payload = _get_payload_from_token(token)
    if not payload:
        return False
    user_id = payload.get("sub")
    email = payload.get("email") or ""
    user_metadata = payload.get("user_metadata") or {}
    full_name = user_metadata.get("full_name") or email or "User"
    try:
        # Upsert so we don't fail if row already exists (e.g. signup or race)
        supabase.table("users").upsert(
            {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "role": "admin",
            },
            on_conflict="id",
        ).execute()
        return True
    except Exception:
        return False


async def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Validate JWT token from Authorization header.
    Supports Legacy HS256 secret and new ECC (ES256) signing keys via JWKS.
    Returns user_id if valid.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token. Please login."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Use 'Bearer <token>'"
        )

    token = authorization.replace("Bearer ", "")

    # 1) Legacy HS256 (JWT Secret) – still used while "Current key" is Legacy HS256
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            user_id = payload.get("sub")
            if user_id:
                return user_id
        except JWTError:
            pass

    # 2) New ECC signing keys (JWKS) – after you rotate to ECC (P-256)
    try:
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if kid:
            key_obj = _get_signing_key_from_jwks(kid)
            if key_obj:
                # ES256 for ECC P-256 keys from Supabase
                payload = jwt.decode(
                    token,
                    key_obj,
                    algorithms=["ES256"],
                    audience="authenticated"
                )
                user_id = payload.get("sub")
                if user_id:
                    return user_id
    except JWTError:
        pass

    # 3) Fallback: Supabase Auth API (can timeout on slow networks)
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user.id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )


async def get_current_user_company(
    authorization: Optional[str] = Header(None),
    user_id: str = Depends(verify_token)
) -> Dict[str, str]:
    """
    Get the authenticated user's company_id.
    If no user row exists, creates one from JWT (sync on first request).
    """
    try:
        response = supabase.table("users")\
            .select("id, company_id, email, role")\
            .eq("id", user_id)\
            .limit(1)\
            .execute()

        if not response.data:
            ensure_user_row_from_token(authorization)
            response = supabase.table("users")\
                .select("id, company_id, email, role")\
                .eq("id", user_id)\
                .limit(1)\
                .execute()

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="User not found in database"
            )

        user_data = response.data[0]

        if not user_data.get("company_id"):
            raise HTTPException(
                status_code=403,
                detail="User not assigned to a company. Please complete onboarding."
            )

        return {
            "user_id": user_data["id"],
            "company_id": user_data["company_id"],
            "email": user_data.get("email"),
            "role": user_data.get("role", "user")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user company: {str(e)}"
        )


async def require_role(required_role: str, auth: Dict[str, str] = Depends(get_current_user_company)):
    """
    Verify user has the required role.

    Args:
        required_role: One of 'admin', 'accountant', 'user', 'viewer'
        auth: Authentication context from get_current_user_company

    Raises:
        HTTPException: If user doesn't have required role
    """
    role_hierarchy = {
        "admin": 4,
        "accountant": 3,
        "user": 2,
        "viewer": 1
    }

    user_role = auth.get("role", "user")
    user_level = role_hierarchy.get(user_role, 0)
    required_level = role_hierarchy.get(required_role, 999)

    if user_level < required_level:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required role: {required_role}, your role: {user_role}"
        )

    return auth


# Optional: For routes that work with or without authentication
async def get_optional_user_company(
    authorization: Optional[str] = Header(None)
) -> Optional[Dict[str, str]]:
    """
    Get user company if authenticated, otherwise return None.
    Useful for public/demo routes.
    """
    if not authorization:
        return None

    try:
        user_id = await verify_token(authorization)
        return await get_current_user_company(user_id)
    except:
        return None
