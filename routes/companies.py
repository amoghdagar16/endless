from fastapi import APIRouter, HTTPException
from database import table

router = APIRouter(prefix="/companies", tags=["Companies"])


# Get all companies (with users included)
@router.get("/with-users")
def get_companies_with_users():
    """Fetch all companies along with their associated users."""
    try:
        response = table("companies").select("*, users(full_name, email, role, user_type)").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching companies: {e}")


# Get all companies (basic, no join)
@router.get("/")
def get_all_companies():
    try:
        response = table("companies").select("*").execute()
        
        # Deduplicate by name - keep the oldest company for each name
        seen_names = {}
        unique_companies = []
        
        # Sort by created_at to ensure we keep the oldest
        sorted_companies = sorted(
            response.data,
            key=lambda x: x.get("created_at", ""),
            reverse=False
        )
        
        for company in sorted_companies:
            company_name = company.get("name", "").strip()
            if company_name and company_name not in seen_names:
                seen_names[company_name] = True
                unique_companies.append(company)
        
        return {"status": "success", "data": unique_companies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get a single company by ID (with users)
@router.get("/{company_id}")
def get_company(company_id: str):
    try:
        response = (
            table("companies")
            .select("*, users(full_name, email, role, user_type)")
            .eq("id", company_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found.")
        return {"status": "success", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new company
@router.post("/")
def create_company(company: dict):
    try:
        company_name = company.get("name", "").strip()
        if not company_name:
            raise HTTPException(status_code=400, detail="Company name is required.")
        
        # Check if a company with the same name already exists
        existing = (
            table("companies")
            .select("id, name")
            .eq("name", company_name)
            .execute()
        )
        
        if existing.data and len(existing.data) > 0:
            # Return the existing company instead of creating a duplicate
            return {
                "status": "success",
                "data": existing.data,
                "message": "Company with this name already exists. Using existing company."
            }
        
        # Create new company if no duplicate exists
        response = table("companies").insert(company).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Update a company
@router.patch("/{company_id}")
def update_company(company_id: str, update_data: dict):
    try:
        response = table("companies").update(update_data).eq("id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found.")
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Delete a company
@router.delete("/{company_id}")
def delete_company(company_id: str):
    try:
        response = table("companies").delete().eq("id", company_id).execute()
        return {"status": "success", "message": f"Company {company_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get all users belonging to a specific company
@router.get("/{company_id}/users")
def get_company_users(company_id: str):
    """Fetch all users that belong to a given company."""
    try:
        response = table("users").select("*, companies(name, industry)").eq("company_id", company_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {e}")

