"""
Authentication module for validating Supabase JWT tokens.
"""
from fastapi import HTTPException, Depends, Header
from typing import Optional
from supabase import create_client
import os
import jwt
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Service role key for backend operations

# Create Supabase client
if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase_client = None


async def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify Supabase JWT token from Authorization header.
    Uses Supabase's REST API to verify the token.
    Returns the user payload if valid, raises HTTPException if invalid.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme. Use 'Bearer'"
            )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Use 'Bearer <token>'"
        )
    
    # For development: if no Supabase config, allow requests but mark as anonymous
    if not supabase_client or not SUPABASE_URL:
        return {"user_id": "anonymous", "email": None, "authenticated": False}
    
    try:
        # Use Supabase REST API to verify the token
        # GET /auth/v1/user with Authorization header
        # Using sync client since this is called from async context
        with httpx.Client() as client:
            response = client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_KEY
                },
                timeout=5.0
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "user_id": user_data.get("id"),
                    "email": user_data.get("email"),
                    "user_metadata": user_data.get("user_metadata", {}),
                    "authenticated": True
                }
            elif response.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired token"
                )
            else:
                # If API verification fails, try to decode JWT as fallback
                # (for development/testing when token format might be different)
                try:
                    decoded = jwt.decode(token, options={"verify_signature": False})
                    return {
                        "user_id": decoded.get("sub", "unknown"),
                        "email": decoded.get("email"),
                        "user_metadata": decoded.get("user_metadata", {}),
                        "authenticated": True
                    }
                except Exception:
                    raise HTTPException(
                        status_code=401,
                        detail=f"Token verification failed: {response.text}"
                    )
    except httpx.RequestError as e:
        # Network error - try JWT decode as fallback
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            return {
                "user_id": decoded.get("sub", "unknown"),
                "email": decoded.get("email"),
                "user_metadata": decoded.get("user_metadata", {}),
                "authenticated": True
            }
        except Exception:
            raise HTTPException(
                status_code=401,
                detail=f"Token verification failed: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )


# Dependency for protected routes
def get_current_user(user: dict = Depends(verify_token)) -> dict:
    """Dependency to get current authenticated user."""
    return user


# Optional dependency for routes that work with or without auth
async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Optional authentication - returns user if token is valid, None otherwise."""
    if not authorization:
        return None
    try:
        return await verify_token(authorization)
    except HTTPException:
        return None

