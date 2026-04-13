from fastapi import APIRouter, HTTPException, Depends
import os
from datetime import datetime
from database import table
import re
from typing import Dict
from middleware.auth import require_min_role

router = APIRouter(prefix="/ai", tags=["AI Overlook"])

def build_peer_context(revenue: float, expense: float) -> str:
    revenue = revenue or 0
    expense = expense or 0
    peer_expense_ratio = 0.62  # simple SaaS benchmark
    peer_margin = 0.18

    if revenue <= 0:
        return "Comparable SaaS companies typically spend ~62% of revenue on operating costs and run ~18% net margins."

    company_exp_ratio = expense / revenue
    company_margin = (revenue - expense) / revenue

    return (
        f"SaaS peers spend ~{peer_expense_ratio * 100:.0f}% of revenue and run ~{peer_margin * 100:.0f}% margins; "
        f"you're tracking at {company_exp_ratio * 100:.0f}% spend and {company_margin * 100:.0f}% margins."
    )

def clean_ai_response(answer: str, peer_context: str = None) -> str:
    """Basic cleanup - removes markdown and extra whitespace."""
    if not answer:
        return answer

    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", answer)
    cleaned = cleaned.replace("•", "-").replace("*", "")
    cleaned = " ".join(cleaned.split())

    if peer_context and peer_context.lower() not in cleaned.lower():
        cleaned = f"{cleaned} Peer snapshot: {peer_context}"

    return cleaned.strip()


async def format_for_dashboard(raw_response: str, context: str, openai_key: str) -> str:
    """
    Two-stage processing: Use OpenAI to format Perplexity's raw data into clean, visual-friendly insights.

    Args:
        raw_response: Raw text from Perplexity (may have markdown, citations, etc.)
        context: Context about what type of insight this is
        openai_key: OpenAI API key

    Returns:
        Clean, formatted, concise text suitable for dashboard cards
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)

        prompt = f"""You are a data visualization expert. Take this raw research data and format it for a business dashboard card.

CONTEXT: {context}

RAW DATA:
{raw_response}

REQUIREMENTS:
1. Remove ALL markdown formatting (no #, *, **, [], etc.)
2. Remove citation numbers [1][2][3]
3. Extract ONLY the 3-4 most important insights
4. Make each insight 1-2 sentences max
5. Use plain text with line breaks between insights
6. Start each insight with a dash "-"
7. Keep total response under 120 words
8. Focus on actionable information

Output clean, dashboard-ready text:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a data visualization expert. Extract key insights and format them cleanly."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )

        formatted = response.choices[0].message.content
        return formatted.strip()

    except Exception as e:
        print(f"[FORMAT] Error formatting response: {str(e)}")
        # Fallback to basic cleaning
        return clean_ai_response(raw_response)


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
def overlook_expense(
    expense_data: dict,
    auth: Dict[str, str] = Depends(require_min_role("accountant"))
):
    """
    AI-powered expense validation and suggestion.
    Returns issues, suggestions, and a JSON patch for the expense.
    """
    try:
        company_id = auth["company_id"]
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
async def ai_query(
    query_data: dict,
    auth: Dict[str, str] = Depends(require_min_role("accountant"))
):
    """
    AI-powered business intelligence assistant.

    Combines financial data with real-time web intelligence via Perplexity AI.
    Provides value immediately - even before financial data is logged.

    Routes questions intelligently to:
    - Industry benchmarks
    - Competitor analysis & online presence
    - Growth recommendations
    - Financial data analysis (when available)
    - General business advice
    """
    try:
        company_id = auth["company_id"]
        question = query_data.get("question", "").strip()

        if not question:
            raise HTTPException(status_code=400, detail="question is required")

        # Check for Perplexity key (primary) or OpenAI key (fallback)
        perplexity_key = os.getenv("PERPLEXITY_API_KEY", "")
        openai_key = os.getenv("OPENAI_API_KEY", "")

        if not perplexity_key and not openai_key:
            raise HTTPException(
                status_code=503,
                detail="AI assistant requires PERPLEXITY_API_KEY or OPENAI_API_KEY to be configured."
            )

        # ========== Fetch company profile ==========
        company_resp = table("companies").select("*").eq("id", company_id).execute()
        company = company_resp.data[0] if company_resp.data else {}

        company_name = company.get("name", "your business")
        industry = company.get("industry", "general business")
        website = company.get("website", "")

        # Construct full location from city + state
        location_city = company.get("location_city", "")
        location_state = company.get("location_state", "")
        location_country = company.get("location_country", "USA")

        # Build location string: "Phoenix, AZ" or "Phoenix, AZ, USA"
        location_parts = []
        if location_city:
            location_parts.append(location_city)
        if location_state:
            location_parts.append(location_state)
        location = ", ".join(location_parts) if location_parts else ""

        business_type = company.get("business_type", "")
        revenue = company.get("annual_revenue", 0)
        employees = company.get("employee_count", 0)

        # ========== Fetch financial data ==========
        accounts_resp = table("accounts").select("*").eq("company_id", company_id).execute()
        accounts = accounts_resp.data or []
        account_count = len(accounts)

        journals_resp = table("journal_entries").select("*, journal_lines(*)").eq("company_id", company_id).execute()
        journals = journals_resp.data or []
        journal_count = len(journals)

        # ========== Build financial context ==========
        financial_context = f"Company: {company_name}\n"
        financial_context += f"Industry: {industry}\n"
        if location:
            financial_context += f"Location: {location}\n"
        if website:
            financial_context += f"Website: {website}\n"
        if business_type:
            financial_context += f"Business Type: {business_type}\n"

        financial_context += f"\nFinancial Data: {account_count} accounts, {journal_count} journal entries\n\n"

        # Add detailed financial data if available
        if account_count > 0:
            account_types = {}
            for acc in accounts:
                acc_type = acc.get("account_type", "Unknown")
                balance = acc.get("current_balance", 0)
                if acc_type not in account_types:
                    account_types[acc_type] = {"count": 0, "total": 0, "accounts": []}
                account_types[acc_type]["count"] += 1
                account_types[acc_type]["total"] += balance
                account_types[acc_type]["accounts"].append({
                    "code": acc.get("account_code", ""),
                    "name": acc.get("account_name", ""),
                    "balance": balance
                })

            financial_context += "ACCOUNTS BY TYPE:\n"
            for acc_type, data in account_types.items():
                financial_context += f"  {acc_type}: {data['count']} accounts, Total: ${data['total']:,.2f}\n"
                # Show top 3 accounts
                sorted_accs = sorted(data['accounts'], key=lambda x: abs(x['balance']), reverse=True)[:3]
                for acc in sorted_accs:
                    financial_context += f"    - {acc['code']}: {acc['name']} = ${acc['balance']:,.2f}\n"

        if journal_count > 0:
            recent = journals[-5:] if len(journals) > 5 else journals
            financial_context += f"\nRECENT TRANSACTIONS ({len(recent)}):\n"
            for j in recent:
                financial_context += f"  - {j.get('entry_date', 'N/A')}: {j.get('memo', 'No memo')}\n"

        # ========== Intelligent routing with Perplexity ==========
        answer = ""

        if perplexity_key:
            from lib.perplexity_client import PerplexityClient
            client = PerplexityClient()

            question_lower = question.lower()

            # Route 1: Industry benchmarks / "how am I doing?" / comparison
            if any(kw in question_lower for kw in ["benchmark", "industry average", "industry standard", "how am i doing", "compare", "typical", "normal", "peers"]):
                print(f"[AI] Routing to: Industry Benchmarks")

                # Use onboarding data automatically
                working_industry = industry if industry and industry != "general business" else "small business"
                # Use full location (city, state) if available, otherwise use state, otherwise default
                if location:
                    working_location = location
                elif location_state:
                    working_location = location_state
                else:
                    working_location = "United States"

                metrics = ["revenue growth rate", "profit margin", "operating expenses ratio"]

                result = await client.get_industry_benchmarks(
                    industry=working_industry,
                    location=working_location,
                    metrics=metrics
                )
                raw_answer = result.get("answer", "")

                # Two-stage processing: Format with OpenAI
                if openai_key:
                    answer = await format_for_dashboard(
                        raw_response=raw_answer,
                        context=f"Industry benchmarks for {working_industry} businesses",
                        openai_key=openai_key
                    )
                else:
                    answer = clean_ai_response(raw_answer)

            # Route 2: Reviews / online presence / social media / reputation
            elif any(kw in question_lower for kw in ["review", "online", "social media", "reputation", "presence", "find me", "search for"]):
                print(f"[AI] Routing to: Online Presence Search")

                # Build detailed search prompt with all available context
                search_prompt = f"""Search for information about {company_name}"""
                if location:
                    search_prompt += f" located in {location}"
                if website:
                    search_prompt += f" (website: {website})"
                if industry:
                    search_prompt += f", a {industry} business"

                search_prompt += f"""

IMPORTANT: Use the website URL and location to identify the CORRECT business. There may be multiple businesses with similar names in different locations.

Find:
1. Online reviews (Google, Yelp, industry platforms, BBB)
2. Social media accounts (LinkedIn, Facebook, Instagram, Twitter)
3. Company website and online visibility
4. News or press mentions
5. Customer feedback and ratings

If you cannot find specific information about {company_name} at {website or location}, provide:
- Guidance on where {industry} businesses should have online presence
- How to get reviews and improve visibility
- Examples of similar businesses with strong online presence
- Actionable steps to build reputation"""

                result = await client.query(
                    prompt=search_prompt,
                    system_prompt="""You are a business intelligence analyst. Search the web for factual information.
If you cannot find specific information, say so and provide general guidance for that industry.""",
                    temperature=0.2,
                    max_tokens=600
                )
                raw_answer = result.get("answer", "")

                # Two-stage processing: Format with OpenAI
                if openai_key:
                    answer = await format_for_dashboard(
                        raw_response=raw_answer,
                        context=f"Online presence and reviews for {company_name}",
                        openai_key=openai_key
                    )
                else:
                    answer = clean_ai_response(raw_answer)

            # Route 3: Growth / expansion / scaling strategies
            elif any(kw in question_lower for kw in ["grow", "growth", "expand", "scale", "improve", "increase revenue", "get more customers"]):
                print(f"[AI] Routing to: Growth Recommendations")

                # Use onboarding data automatically - provide defaults if missing
                working_industry = industry if industry and industry != "general business" else "small business"
                working_revenue = revenue if revenue > 0 else 250000  # Default $250k
                working_employees = employees if employees > 0 else 5  # Default 5 employees
                # Use full location (city, state) if available, otherwise use state, otherwise default
                if location:
                    working_location = location
                elif location_state:
                    working_location = location_state
                else:
                    working_location = "United States"

                result = await client.get_growth_recommendations(
                    industry=working_industry,
                    revenue=working_revenue,
                    employees=working_employees,
                    growth_stage="growth" if working_revenue > 500000 else "startup",
                    location=working_location
                )
                raw_answer = result.get("answer", "")

                # Two-stage processing: Format with OpenAI
                if openai_key:
                    answer = await format_for_dashboard(
                        raw_response=raw_answer,
                        context=f"Growth strategies for {working_industry} business",
                        openai_key=openai_key
                    )
                else:
                    answer = clean_ai_response(raw_answer)

            # Route 4: Competitor analysis
            elif any(kw in question_lower for kw in ["competitor", "competition", "rival", "other businesses"]):
                print(f"[AI] Routing to: Competitor Analysis")

                search_prompt = f"""Analyze the competitive landscape for {company_name}"""
                if website:
                    search_prompt += f" ({website})"
                search_prompt += f", a {industry} business"
                if location:
                    search_prompt += f" in {location}"

                search_prompt += f"""

IMPORTANT: Focus on competitors in the same geographic area ({location}) and industry ({industry}).

Identify:
1. Main competitors in the area/industry
2. Their market positioning and differentiation
3. Pricing strategies
4. Online presence and customer reviews
5. What {company_name} can learn from them

Provide actionable competitive insights."""

                result = await client.query(
                    prompt=search_prompt,
                    system_prompt="You are a competitive intelligence analyst. Provide factual market analysis from web sources.",
                    temperature=0.2,
                    max_tokens=600
                )
                raw_answer = result.get("answer", "")

                # Two-stage processing: Format with OpenAI
                if openai_key:
                    answer = await format_for_dashboard(
                        raw_response=raw_answer,
                        context=f"Competitive analysis for {company_name}",
                        openai_key=openai_key
                    )
                else:
                    answer = clean_ai_response(raw_answer)

            # Route 5: Financial data questions (if they have data)
            elif account_count > 0 and any(kw in question_lower for kw in ["expense", "revenue", "cash", "profit", "loss", "balance", "account", "transaction", "spending"]):
                print(f"[AI] Routing to: Financial Data Analysis")

                # Calculate peer context if possible
                revenue_total = 0
                expense_total = 0
                for acc in accounts:
                    acc_type = acc.get("account_type", "").lower()
                    balance = acc.get("current_balance", 0)
                    if "revenue" in acc_type or "income" in acc_type:
                        revenue_total += balance
                    elif "expense" in acc_type or "cost" in acc_type:
                        expense_total += balance

                peer_context = build_peer_context(revenue_total, expense_total)

                system_prompt = """You are a financial analyst analyzing accounting data.

CRITICAL RULES:
1. ONLY reference numbers that are explicitly in the provided data - never estimate or guess
2. If data is insufficient to answer, say "I need more data" or ask clarifying questions
3. Keep response under 100 words - be direct and actionable
4. Reference specific account names/codes when making recommendations
5. Use plain text only - no markdown formatting"""

                user_prompt = f"""Analyze this financial data and answer:

{financial_context}

QUESTION: {question}

Answer with ONLY information from the data above. If data is insufficient, say so and ask what's needed."""

                result = await client.query(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    temperature=0.3,
                    max_tokens=600
                )
                answer = result.get("answer", "")
                answer = clean_ai_response(answer, peer_context)

            # Route 6: General business questions (catch-all)
            else:
                print(f"[AI] Routing to: General Business Advice")

                context_prompt = f"I run {company_name}"
                if website:
                    context_prompt += f" ({website})"
                context_prompt += f", a {industry} business"
                if location:
                    context_prompt += f" in {location}"
                context_prompt += f". {question}"

                result = await client.query(
                    prompt=context_prompt,
                    system_prompt="You are a business advisor. Provide practical, actionable advice backed by current web information.",
                    temperature=0.2,
                    max_tokens=600
                )
                raw_answer = result.get("answer", "")

                # Two-stage processing: Format with OpenAI
                if openai_key:
                    answer = await format_for_dashboard(
                        raw_response=raw_answer,
                        context="General business advice",
                        openai_key=openai_key
                    )
                else:
                    answer = clean_ai_response(raw_answer)

        else:
            # Fallback to OpenAI (limited - no web search)
            print(f"[AI] Using OpenAI fallback (no web search)")
            from openai import OpenAI
            openai_client = OpenAI(api_key=openai_key)

            system_prompt = "You are a business and financial advisor. Provide clear, actionable advice. Use plain text only."
            user_prompt = f"{financial_context}\n\nQUESTION: {question}\n\nProvide helpful advice even if financial data is limited. Use plain text only."

            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=600
            )

            answer = response.choices[0].message.content

        return {
            "answer": answer.strip(),
            "account_count": account_count,
            "journal_count": journal_count
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[AI] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/financial-summary")
async def financial_summary(auth: Dict[str, str] = Depends(require_min_role("accountant"))):
    """
    Template-based financial summary — works without any external API keys.
    Pulls account balances, invoice/bill counts, and recent journal activity.
    """
    try:
        company_id = auth["company_id"]

        # Accounts
        accounts_resp = table("accounts").select("account_type, current_balance").eq("company_id", company_id).execute()
        accounts = accounts_resp.data or []

        totals: dict = {"asset": 0, "liability": 0, "equity": 0, "revenue": 0, "expense": 0}
        for a in accounts:
            t = a.get("account_type", "")
            if t in totals:
                totals[t] += float(a.get("current_balance") or 0)

        revenue = totals["revenue"]
        expense = totals["expense"]
        net = revenue - expense
        assets = totals["asset"]
        liabilities = totals["liability"]

        # Journal entries
        journals_resp = table("journal_entries").select("status", count="exact").eq("company_id", company_id).execute()
        journal_count = journals_resp.count or 0
        draft_count = sum(1 for j in (journals_resp.data or []) if j.get("status") == "draft")

        # Overdue invoices
        today = datetime.now().strftime("%Y-%m-%d")
        inv_resp = table("invoices").select("status, total_amount").eq("company_id", company_id).execute()
        invoices = inv_resp.data or []
        overdue = [i for i in invoices if i.get("status") not in ("paid", "void") and i.get("due_date", "") and i["due_date"] < today]

        # Build template summary
        parts = []

        if revenue > 0 or expense > 0:
            parts.append(f"Revenue ${revenue:,.0f}, expenses ${expense:,.0f} — net ${net:+,.0f}.")
        else:
            parts.append("No revenue or expense transactions recorded yet.")

        if assets > 0:
            parts.append(f"Total assets ${assets:,.0f}, liabilities ${liabilities:,.0f}.")

        if overdue:
            total_overdue = sum(float(i.get("total_amount") or 0) for i in overdue)
            parts.append(f"{len(overdue)} overdue invoice{'s' if len(overdue) > 1 else ''} totalling ${total_overdue:,.0f}.")

        if draft_count > 0:
            parts.append(f"{draft_count} draft journal entr{'ies' if draft_count > 1 else 'y'} pending review.")

        parts.append(f"{journal_count} total journal entries.")

        return {
            "summary": " ".join(parts),
            "metrics": {
                "revenue": revenue,
                "expense": expense,
                "net_income": net,
                "total_assets": assets,
                "total_liabilities": liabilities,
                "overdue_invoices": len(overdue),
                "journal_count": journal_count,
                "draft_journals": draft_count,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
