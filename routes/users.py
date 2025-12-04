from fastapi import APIRouter, HTTPException
from database import table

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


# Get a user by email
@router.get("/by-email/{email}")
def get_user_by_email(email: str):
    try:
        response = table("users").select("*").eq("email", email).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"status": "success", "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new user
@router.post("/")
def create_user(user: dict):
    try:
        email = user.get("email")
        if email:
            # Check if user with this email already exists
            existing = table("users").select("*").eq("email", email).execute()
            if existing.data and len(existing.data) > 0:
                existing_user = existing.data[0]
                # If user already has a company, prevent association with another
                if existing_user.get("company_id"):
                    raise HTTPException(
                        status_code=400,
                        detail="This email is already associated with a company. One email can only be associated with one company."
                    )
                # User exists but no company - allow update
                if user.get("company_id"):
                    response = table("users").update({"company_id": user["company_id"]}).eq("id", existing_user["id"]).execute()
                    return {"status": "success", "data": response.data}
        
        # Check if trying to associate with company and user already has one
        if user.get("company_id"):
            user_id = user.get("id")
            if user_id:
                existing = table("users").select("*").eq("id", user_id).execute()
                if existing.data and len(existing.data) > 0:
                    existing_user = existing.data[0]
                    if existing_user.get("company_id") and existing_user.get("company_id") != user.get("company_id"):
                        raise HTTPException(
                            status_code=400,
                            detail="This email is already associated with a company. One email can only be associated with one company."
                        )
        
        response = table("users").insert(user).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Update a user
@router.patch("/{user_id}")
def update_user(user_id: str, update_data: dict):
    try:
        # Check if user exists
        existing = table("users").select("*").eq("id", user_id).execute()
        
        if not existing.data or len(existing.data) == 0:
            # User doesn't exist - create them if company_id is being set
            if "company_id" in update_data and update_data["company_id"]:
                # Create user with provided data
                user_data = {"id": user_id, "company_id": update_data["company_id"]}
                # If email is provided in update_data, use it
                if "email" in update_data:
                    user_data["email"] = update_data["email"]
                # If full_name is provided, use it
                if "full_name" in update_data:
                    user_data["full_name"] = update_data["full_name"]
                # If email is provided but no full_name, derive from email
                elif "email" in update_data and update_data["email"]:
                    user_data["full_name"] = update_data["email"].split("@")[0]
                response = table("users").insert(user_data).execute()
                return {"status": "success", "data": response.data}
            else:
                raise HTTPException(status_code=404, detail="User not found.")
        
        existing_user = existing.data[0]
        existing_company_id = existing_user.get("company_id")
        
        # Prevent changing company_id if user already has one (one email = one company)
        if "company_id" in update_data:
            new_company_id = update_data["company_id"]
            # Check if user already has a valid company_id (not None, not empty string)
            has_existing_company = existing_company_id and str(existing_company_id).strip()
            
            # Only prevent if: user has a valid company AND it's different from the new one
            if has_existing_company and existing_company_id != new_company_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot change company association. One email can only be associated with one company."
                )
            # Allow if: user has no company (None/null/empty) OR setting to the same company
        
        response = table("users").update(update_data).eq("id", user_id).execute()
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
        email = user.get("email")
        if email:
            # Check if user with this email already exists and has a company
            existing = table("users").select("*").eq("email", email).execute()
            if existing.data and len(existing.data) > 0:
                existing_user = existing.data[0]
                if existing_user.get("company_id"):
                    raise HTTPException(
                        status_code=400,
                        detail="This email is already associated with a company. One email can only be associated with one company."
                    )
        
        user["company_id"] = company_id
        response = table("users").insert(user).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {e}")
