# Authentication Usage Guide

## Overview
JWT authentication is now implemented using Supabase tokens. The backend validates tokens sent from the frontend.

## How It Works

1. **Frontend** sends JWT token in `Authorization: Bearer <token>` header
2. **Backend** validates token against Supabase
3. **Routes** can require authentication or make it optional

## Using Authentication in Routes

### Option 1: Require Authentication (Protected Route)

```python
from fastapi import APIRouter, Depends
from auth import get_current_user

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.get("/protected")
def get_protected_data(user: dict = Depends(get_current_user)):
    """
    This route requires authentication.
    The user dict contains: user_id, email, user_metadata, authenticated
    """
    return {
        "message": f"Hello {user.get('email')}",
        "user_id": user.get("user_id")
    }
```

### Option 2: Optional Authentication

```python
from auth import get_optional_user

@router.get("/public")
def get_public_data(user: Optional[dict] = Depends(get_optional_user)):
    """
    This route works with or without authentication.
    """
    if user:
        return {"message": f"Authenticated as {user.get('email')}"}
    else:
        return {"message": "Anonymous access"}
```

### Option 3: No Authentication (Public Route)

```python
@router.get("/public")
def get_public_data():
    """
    This route doesn't require authentication.
    """
    return {"message": "Public data"}
```

## Current Implementation Status

- ✅ **Frontend**: Sends JWT token in all requests
- ✅ **Backend**: Has auth module ready to use
- ⚠️ **Routes**: Currently NOT protected (all routes are public)

## To Enable Authentication

1. Import the auth dependency in your route files
2. Add `user: dict = Depends(get_current_user)` to protected endpoints
3. Use `user.get("user_id")` to get the authenticated user's ID

## Example: Protecting Expenses Route

```python
# In routes/expenses.py
from auth import get_current_user

@router.post("/manual_entry")
def create_expense(expense_data: dict, user: dict = Depends(get_current_user)):
    # Now you have access to user["user_id"] and user["email"]
    expense_data["user_id"] = user["user_id"]
    # ... rest of your logic
```

## Testing

To test authentication:
1. Make a request without token → Should get 401 error
2. Make a request with valid token → Should work
3. Make a request with invalid token → Should get 401 error

