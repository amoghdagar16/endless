"""
Quick script to sync an auth user to the users table
Run this when you've created a user directly in Supabase dashboard
"""
from database import supabase
import sys

def sync_user(email: str):
    """Sync an auth user to the users table"""
    try:
        # Get auth user by email
        response = supabase.auth.admin.list_users()
        auth_user = None

        for user in response:
            if user.email == email:
                auth_user = user
                break

        if not auth_user:
            print(f"No auth user found with email: {email}")
            return

        print(f"Found auth user: {auth_user.id} - {auth_user.email}")

        # Check if user already exists in users table
        existing = supabase.table("users").select("*").eq("id", auth_user.id).execute()

        if existing.data:
            print(f"User already exists in users table")
            return

        # Create user record
        user_data = {
            "id": auth_user.id,
            "email": auth_user.email,
            "full_name": auth_user.user_metadata.get("full_name", "User"),
            "role": "admin",
            "company_id": None
        }

        result = supabase.table("users").insert(user_data).execute()
        print(f"Created user record: {result.data}")
        print(f"\nNow visit http://localhost:3000/company-setup to complete onboarding")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sync_auth_user.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    sync_user(email)
