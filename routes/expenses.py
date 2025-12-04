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
        user_id = expense.get("user_id")  # Can be None if user not in users table
        vendor_name = expense.get("vendor_name")
        amount = expense.get("amount")
        category = expense.get("category", "Uncategorized")
        payment_method = expense.get("payment_method", "cash")
        memo = expense.get("memo", "")
        date = expense.get("date", str(datetime.utcnow().date()))

        if not all([company_id, vendor_name, amount]):
            raise HTTPException(status_code=400, detail="Missing required fields: company_id, vendor_name, amount.")

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
        # created_by can be null if user_id is not in users table (schema allows ON DELETE SET NULL)
        journal_entry = {
            "company_id": company_id,
            "entry_date": date,
            "memo": f"Expense logged: {vendor_name} ({category})",
            "status": "posted",
        }
        # Only include created_by if user_id is provided and exists in users table
        if user_id:
            try:
                # Verify user exists in users table before setting created_by
                user_check = table("users").select("id").eq("id", user_id).limit(1).execute()
                if user_check.data:
                    journal_entry["created_by"] = user_id
            except Exception:
                # If user doesn't exist, just skip created_by (will be NULL)
                pass
        
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


# Update an expense
@router.patch("/{expense_id}")
def update_expense(expense_id: str, update_data: dict):
    """Update an expense (bill)."""
    try:
        # Extract update fields
        vendor_name = update_data.get("vendor_name")
        amount = update_data.get("amount")
        memo = update_data.get("memo")
        date = update_data.get("date")
        status = update_data.get("status")

        # Build update object for bills table
        bill_update = {}
        if amount is not None:
            bill_update["total_amount"] = amount
            bill_update["balance_due"] = amount
        if memo is not None:
            bill_update["memo"] = memo
        if date is not None:
            bill_update["bill_date"] = date
        if status is not None:
            bill_update["status"] = status

        # Update vendor if provided
        if vendor_name:
            # Get current bill to find company_id
            current_bill = table("bills").select("company_id").eq("id", expense_id).execute()
            if not current_bill.data:
                raise HTTPException(status_code=404, detail="Expense not found")

            company_id = current_bill.data[0]["company_id"]

            # Create or fetch vendor
            vendor_resp = table("vendors").select("*").eq("name", vendor_name).eq("company_id", company_id).execute()
            if vendor_resp.data:
                vendor_id = vendor_resp.data[0]["id"]
            else:
                new_vendor = {"company_id": company_id, "name": vendor_name}
                vendor_insert = table("vendors").insert(new_vendor).execute()
                vendor_id = vendor_insert.data[0]["id"]

            bill_update["vendor_id"] = vendor_id

        # Update the bill
        if bill_update:
            response = table("bills").update(bill_update).eq("id", expense_id).execute()
            if not response.data:
                raise HTTPException(status_code=404, detail="Expense not found")
            return {"status": "success", "data": response.data}
        else:
            raise HTTPException(status_code=400, detail="No update fields provided")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating expense: {e}")


# Delete (void) an expense
@router.delete("/{expense_id}")
def delete_expense(expense_id: str):
    """Delete an expense by setting status to 'void'."""
    try:
        response = table("bills").update({"status": "void"}).eq("id", expense_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return {"status": "success", "message": f"Expense {expense_id} voided successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting expense: {e}")

