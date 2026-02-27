from fastapi import APIRouter, HTTPException, Depends
from database import table
from middleware.auth import verify_token

router = APIRouter(prefix="/users", tags=["Users"])


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


# Update a user (authenticated user can only update their own record)
@router.patch("/{user_id}")
def update_user(user_id: str, update_data: dict, token_user_id: str = Depends(verify_token)):
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="Can only update your own user record")
    # Only allow updating safe fields (e.g. company_id for onboarding link)
    allowed = {"company_id", "full_name", "avatar_url", "preferences", "role"}
    payload = {k: v for k, v in update_data.items() if k in allowed}
    if not payload:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    try:
        response = table("users").update(payload).eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
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
