from fastapi import APIRouter, HTTPException
import os
from datetime import datetime

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
