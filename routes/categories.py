from fastapi import APIRouter, HTTPException
from database import table

router = APIRouter(prefix="/categories", tags=["Categories"])


# Get all categories for a company
@router.get("/company/{company_id}")
def get_company_categories(company_id: str):
    """Get all categories for a specific company."""
    try:
        response = table("categories").select("*").eq("company_id", company_id).eq("is_active", True).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new category
@router.post("/")
def create_category(category: dict):
    """Create a new expense category."""
    try:
        company_id = category.get("company_id")
        name = category.get("name")
        description = category.get("description", "")
        budget_amount = category.get("budget_amount")
        
        if not all([company_id, name]):
            raise HTTPException(status_code=400, detail="Missing required fields: company_id, name")
        
        new_category = {
            "company_id": company_id,
            "name": name,
            "description": description,
            "budget_amount": budget_amount,
            "is_active": True
        }
        
        response = table("categories").insert(new_category).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Update a category
@router.patch("/{category_id}")
def update_category(category_id: str, update_data: dict):
    """Update an expense category."""
    try:
        response = table("categories").update(update_data).eq("id", category_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Delete (soft delete) a category
@router.delete("/{category_id}")
def delete_category(category_id: str):
    """Soft delete a category by setting is_active to False."""
    try:
        response = table("categories").update({"is_active": False}).eq("id", category_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"status": "success", "message": f"Category {category_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get expenses by category
@router.get("/{category_id}/expenses")
def get_category_expenses(category_id: str):
    """Get all expenses for a specific category."""
    try:
        # Note: This requires the bills table to have a category_id column
        # For now, we'll return a placeholder
        return {"status": "success", "data": [], "message": "Feature pending: category_id column in bills table"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
