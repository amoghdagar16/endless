from fastapi import APIRouter, HTTPException
import os
from datetime import datetime
from database import table

router = APIRouter(prefix="/ai", tags=["AI Overlook"])


def get_ai_suggestions(company_id: str, vendor_name: str, amount: float, date: str, category: str = None, memo: str = None):
    """
    Use OpenAI to suggest category, memo, and normalized vendor name.
    Falls back to basic rules if OPENAI_API_KEY is not set.
    """
    openai_key = os.getenv("OPENAI_API_KEY", "")

    # If OpenAI key is available, use it
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            prompt = f"""Analyze this expense and provide suggestions:
- Vendor: {vendor_name}
- Amount: ${amount}
- Date: {date}
- Category: {category or 'Not provided'}
- Memo: {memo or 'Not provided'}

Provide:
1. A normalized vendor name (clean, standardized)
2. An appropriate expense category (e.g., Office Supplies, Travel, Meals & Entertainment, Software & Services, etc.)
3. A concise memo describing the expense

Respond in JSON format:
{{
  "normalized_vendor": "standardized name",
  "category": "category name",
  "memo": "brief description"
}}"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a financial assistant helping categorize business expenses. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            import json
            suggestions = json.loads(response.choices[0].message.content)

            return {
                "normalized_vendor": suggestions.get("normalized_vendor", vendor_name),
                "category": suggestions.get("category", category or "Uncategorized"),
                "memo": suggestions.get("memo", memo or f"{vendor_name} expense")
            }

        except Exception as e:
            print(f"OpenAI API error: {e}")
            # Fall through to basic suggestions

    # Fallback: Basic rule-based suggestions
    normalized_vendor = vendor_name.strip().title()
    suggested_category = category or "Uncategorized"
    suggested_memo = memo or f"{normalized_vendor} expense"

    # Simple category guessing based on vendor name
    vendor_lower = vendor_name.lower()
    if any(word in vendor_lower for word in ["office", "staples", "depot"]):
        suggested_category = "Office Supplies"
    elif any(word in vendor_lower for word in ["amazon", "aws", "google", "microsoft", "software"]):
        suggested_category = "Software & Services"
    elif any(word in vendor_lower for word in ["restaurant", "cafe", "coffee", "lunch", "dinner"]):
        suggested_category = "Meals & Entertainment"
    elif any(word in vendor_lower for word in ["uber", "lyft", "airline", "hotel"]):
        suggested_category = "Travel"

    return {
        "normalized_vendor": normalized_vendor,
        "category": suggested_category,
        "memo": suggested_memo
    }


@router.post("/overlook_expense")
def overlook_expense(expense_data: dict):
    """
    AI-powered expense validation and suggestion.
    Returns issues, suggestions, and a JSON patch for the expense.
    """
    try:
        company_id = expense_data.get("company_id")
        vendor_name = expense_data.get("vendor_name")
        amount = expense_data.get("amount")
        date = expense_data.get("date")
        category = expense_data.get("category")
        memo = expense_data.get("memo")

        # Validation
        issues = []
        if not vendor_name:
            issues.append("Vendor name is required")
        if not amount or amount <= 0:
            issues.append("Amount must be greater than 0")
        if not date:
            issues.append("Date is required")
        else:
            # Validate date format
            try:
                datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                issues.append("Date must be in YYYY-MM-DD format")

        valid = len(issues) == 0

        # Get AI suggestions
        suggestions = {}
        if valid:
            suggestions = get_ai_suggestions(
                company_id=company_id,
                vendor_name=vendor_name,
                amount=amount,
                date=date,
                category=category,
                memo=memo
            )

        return {
            "valid": valid,
            "issues": issues,
            "suggestions": suggestions,
            "json_patch": suggestions  # Same as suggestions for now
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing expense: {str(e)}")


@router.post("/query")
def ai_query(query_data: dict):
    """
    AI-powered financial assistant that answers questions about your expenses.
    Acts as a helpful, friendly accountant companion.
    """
    try:
        company_id = query_data.get("company_id")
        question = query_data.get("question", "").strip()

        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")

        if not question:
            raise HTTPException(status_code=400, detail="question is required")

        # Check for OpenAI key
        openai_key = os.getenv("OPENAI_API_KEY", "")
        if not openai_key:
            raise HTTPException(
                status_code=503,
                detail="AI assistant requires OPENAI_API_KEY to be configured. Please add it to your .env file."
            )

        # Fetch expense data for the company
        try:
            expenses_resp = table("bills").select("*, vendors(name)").eq("company_id", company_id).execute()
            expenses = expenses_resp.data or []
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching expense data: {str(e)}")

        # Prepare expense summary for AI
        if not expenses:
            return {
                "answer": "I don't see any expenses recorded yet for your company. Once you start recording expenses, I'll be able to help you analyze your spending patterns, identify trends, and answer questions about your financial data!",
                "expense_count": 0
            }

        # Build a concise summary of expenses for the AI
        total_amount = sum(exp.get("total_amount", 0) for exp in expenses)
        expense_count = len(expenses)

        # Group by vendor
        vendor_totals = {}
        for exp in expenses:
            vendor = exp.get("vendors", {}).get("name", "Unknown") if exp.get("vendors") else "Unknown"
            amount = exp.get("total_amount", 0)
            vendor_totals[vendor] = vendor_totals.get(vendor, 0) + amount

        # Recent expenses (last 10)
        recent_expenses = expenses[-10:] if len(expenses) > 10 else expenses

        # Build context for AI
        context = f"""Company Expense Data Summary:
- Total Expenses: {expense_count}
- Total Amount: ${total_amount:.2f}
- Average Expense: ${total_amount/expense_count:.2f}

Top Vendors by Spending:
"""
        # Add top 5 vendors
        sorted_vendors = sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        for vendor, amount in sorted_vendors:
            context += f"- {vendor}: ${amount:.2f}\n"

        context += "\nRecent Expenses:\n"
        for exp in recent_expenses:
            vendor = exp.get("vendors", {}).get("name", "Unknown") if exp.get("vendors") else "Unknown"
            amount = exp.get("total_amount", 0)
            date = exp.get("bill_date", "N/A")
            memo = exp.get("memo", "")
            context += f"- {date}: {vendor} - ${amount:.2f}"
            if memo:
                context += f" ({memo})"
            context += "\n"

        # Call OpenAI
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            system_prompt = """You are a helpful, friendly AI accountant companion for a small business.
Your role is to help the user understand their financial data, identify trends, and make informed decisions.

Be conversational, warm, and encouraging. Use clear language without too much jargon.
When discussing numbers, be specific and helpful. Offer insights and suggestions when appropriate.

Think of yourself as a knowledgeable friend who happens to be great with numbers and finances."""

            user_prompt = f"""Based on the following expense data, please answer the user's question:

{context}

User's Question: {question}

Provide a helpful, friendly response that directly answers their question. If you notice any interesting patterns or have helpful suggestions, feel free to mention them!"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )

            answer = response.choices[0].message.content

            return {
                "answer": answer,
                "expense_count": expense_count,
                "total_amount": total_amount
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing AI query: {str(e)}")
