"""
Authentication signup route that creates company and user records.
"""
from fastapi import APIRouter, HTTPException, Depends
from database import table, supabase
from auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup")
async def signup_with_company(
    signup_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a company and user record after Supabase authentication.
    Requires a valid JWT token from Supabase.
    
    Request body:
    {
        "company_name": "My Company",
        "user_name": "John Doe",  # optional
        "user_email": "user@example.com"  # optional, will use from token if not provided
    }
    """
    try:
        # Get user info from token
        user_id = current_user.get("user_id")
        user_email = current_user.get("email") or signup_data.get("user_email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        company_name = signup_data.get("company_name")
        if not company_name:
            raise HTTPException(status_code=400, detail="Company name is required")
        
        # Check if user already has a company
        existing_user = table("users").select("company_id").eq("id", user_id).execute()
        if existing_user.data and existing_user.data[0].get("company_id"):
            # User already has a company, return it
            company_id = existing_user.data[0]["company_id"]
            company = table("companies").select("*").eq("id", company_id).execute()
            return {
                "status": "success",
                "message": "User already has a company",
                "company_id": company_id,
                "company": company.data[0] if company.data else None
            }
        
        # Create company
        company_data = {
            "name": company_name,
            "industry": signup_data.get("industry", ""),
        }
        company_response = table("companies").insert(company_data).execute()
        
        if not company_response.data:
            raise HTTPException(status_code=500, detail="Failed to create company")
        
        company_id = company_response.data[0]["id"]
        
        # Create or update user record
        user_name = signup_data.get("user_name", user_email.split("@")[0] if user_email else "User")
        user_data = {
            "id": user_id,
            "email": user_email,
            "full_name": user_name,
            "company_id": company_id,
            "role": "owner",  # First user is the owner
            "user_type": "admin"
        }
        
        # Check if user exists
        existing = table("users").select("*").eq("id", user_id).execute()
        if existing.data:
            # Update existing user with company_id
            user_response = table("users").update({
                "company_id": company_id,
                "full_name": user_name,
            }).eq("id", user_id).execute()
            # Get updated user data
            updated_user = table("users").select("*").eq("id", user_id).execute()
            user_data_final = updated_user.data[0] if updated_user.data else existing.data[0]
        else:
            # Create new user
            user_response = table("users").insert(user_data).execute()
            user_data_final = user_response.data[0] if user_response.data else None
        
        return {
            "status": "success",
            "message": "Company and user created successfully",
            "company_id": company_id,
            "company": company_response.data[0],
            "user": user_data_final
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during signup: {str(e)}")


@router.get("/my-company")
async def get_my_company(current_user: dict = Depends(get_current_user)):
    """
    Get the current user's company information.
    """
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Get user's company_id
        user_response = table("users").select("company_id").eq("id", user_id).execute()
        if not user_response.data or not user_response.data[0].get("company_id"):
            return {
                "status": "no_company",
                "message": "User does not have a company yet"
            }
        
        company_id = user_response.data[0]["company_id"]
        
        # Get company details
        company_response = table("companies").select("*").eq("id", company_id).execute()
        if not company_response.data:
            return {
                "status": "not_found",
                "message": "Company not found"
            }
        
        return {
            "status": "success",
            "company_id": company_id,
            "company": company_response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching company: {str(e)}")


@router.delete("/delete-account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Delete the current user's account from Supabase.
    This will delete the user record from the database and from Supabase Auth.
    """
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Delete user from users table (cascade should handle related records)
        try:
            table("users").delete().eq("id", user_id).execute()
        except Exception as e:
            print(f"Error deleting user from users table: {e}")
        
        # Delete user from Supabase Auth using admin API
        # Note: Supabase Python client doesn't have a direct admin.delete_user method
        # We'll use the REST API directly with the service role key
        try:
            import httpx
            import os
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            if supabase_url and supabase_key:
                with httpx.Client() as client:
                    response = client.delete(
                        f"{supabase_url}/auth/v1/admin/users/{user_id}",
                        headers={
                            "Authorization": f"Bearer {supabase_key}",
                            "apikey": supabase_key
                        },
                        timeout=10.0
                    )
                    if response.status_code not in [200, 204]:
                        print(f"Auth deletion returned status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Error deleting user from Supabase Auth: {e}")
            # Continue even if auth deletion fails - user record is already deleted
        
        return {
            "status": "success",
            "message": "Account deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting account: {str(e)}")

