from fastapi import APIRouter, HTTPException
from database import table
from datetime import datetime

router = APIRouter(prefix="/expenses", tags=["Expenses"])

# Get all expenses (bills with vendor info)
@router.get("/")
def get_all_expenses():
    """Get all expenses (bills) with vendor information."""
    try:
        response = table("bills").select("*, vendors(name)").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get expenses for a specific company
@router.get("/company/{company_id}")
def get_company_expenses(company_id: str):
    """Get all expenses for a specific company."""
    try:
        response = table("bills").select("*, vendors(name)").eq("company_id", company_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a manual expense
@router.post("/manual_entry")
def create_expense(expense: dict):
    """
    Log a manual expense.
    Automatically links vendor, creates a bill and journal entry.
    """
    try:
        company_id = expense.get("company_id")
        user_id = expense.get("user_id")
        vendor_name = expense.get("vendor_name")
        amount = expense.get("amount")
        category = expense.get("category", "Uncategorized")
        payment_method = expense.get("payment_method", "cash")
        memo = expense.get("memo", "")
        date = expense.get("date", str(datetime.utcnow().date()))

        if not all([company_id, user_id, vendor_name, amount]):
            raise HTTPException(status_code=400, detail="Missing required fields.")

        # Create or fetch vendor
        vendor_resp = table("vendors").select("*").eq("name", vendor_name).eq("company_id", company_id).execute()
        if vendor_resp.data:
            vendor_id = vendor_resp.data[0]["id"]
        else:
            new_vendor = {"company_id": company_id, "name": vendor_name}
            vendor_insert = table("vendors").insert(new_vendor).execute()
            vendor_id = vendor_insert.data[0]["id"]

        # Create a Bill record
        bill_data = {
            "company_id": company_id,
            "vendor_id": vendor_id,
            "bill_number": f"EXP-{int(datetime.utcnow().timestamp())}",
            "bill_date": date,
            "total_amount": amount,
            "balance_due": amount,
            "status": "draft",
            "memo": memo
        }
        bill = table("bills").insert(bill_data).execute()

        # Create Journal Entry
        journal_entry = {
            "company_id": company_id,
            "entry_date": date,
            "memo": f"Expense logged: {vendor_name} ({category})",
            "status": "posted",
            "created_by": user_id
        }
        journal = table("journal_entries").insert(journal_entry).execute()
        journal_id = journal.data[0]["id"]

        # Add Journal Lines
        debit_line = {
            "journal_id": journal_id,
            "description": f"{category} expense",
            "debit": amount,
            "credit": 0,
        }
        credit_line = {
            "journal_id": journal_id,
            "description": f"{payment_method} payment",
            "debit": 0,
            "credit": amount,
        }
        table("journal_lines").insert([debit_line, credit_line]).execute()

        return {
            "status": "success",
            "message": "Expense recorded successfully.",
            "bill": bill.data,
            "journal_entry": journal.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating expense: {e}")

