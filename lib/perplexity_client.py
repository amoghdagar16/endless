"""
Perplexity AI client for real-time market intelligence and business comparisons.
Provides industry benchmarks, competitor analysis, and contextual insights.
"""

import os
import httpx
from typing import List, Dict, Optional
import json

class PerplexityClient:
    """
    Client for Perplexity AI API (real-time web-search powered LLM).
    Uses llama-3.1-sonar models for up-to-date business intelligence.
    """

    def __init__(self):
        self.api_key = os.getenv("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY not found in environment variables")

        self.base_url = "https://api.perplexity.ai"
        # Use sonar-pro for real-time web search (updated 2026 model)
        self.model = "sonar-pro"

    async def query(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        search_domain_filter: Optional[List[str]] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000
    ) -> Dict:
        """
        Query Perplexity with optional domain filtering.

        Args:
            prompt: The user query/question
            system_prompt: Optional system instruction
            search_domain_filter: List of domains to restrict search to
            temperature: Sampling temperature (0.0-1.0, lower = more factual)
            max_tokens: Maximum response length

        Returns:
            Dict with 'answer' and 'citations'
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt or "You are a helpful business analyst."},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "return_citations": True,
            "return_images": False
        }

        if search_domain_filter:
            payload["search_domain_filter"] = search_domain_filter

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

                # Extract answer and citations
                answer = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                citations = result.get("citations", [])

                return {
                    "answer": answer,
                    "citations": citations,
                    "raw_response": result
                }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
            raise Exception(f"Perplexity API error ({e.response.status_code}): {error_detail}")
        except Exception as e:
            raise Exception(f"Failed to query Perplexity: {str(e)}")

    async def get_industry_benchmarks(
        self,
        industry: str,
        location: str,
        metrics: List[str]
    ) -> Dict:
        """
        Get real-time industry benchmarks for specific metrics.

        Args:
            industry: Industry name (e.g., "SaaS", "E-commerce")
            location: Geographic location (e.g., "San Francisco, CA")
            metrics: List of metrics to benchmark (e.g., ["revenue growth", "profit margin"])

        Returns:
            Dict with benchmarks and citations
        """
        prompt = f"""
For {industry} businesses in {location}, provide current industry benchmarks for the following metrics in 2026:
{chr(10).join(f'- {metric}' for metric in metrics)}

Please include:
1. Median values for small-medium businesses
2. 25th and 75th percentile ranges
3. Recent trends (2024-2026)
4. Key factors affecting these metrics

Format the response as a structured summary with clear numbers and sources.
Only use recent data (2024-2026). Include publication dates in citations.
"""

        system_prompt = """You are a financial analyst providing factual market data.
Focus on verified statistics from reputable sources.
Be specific with numbers and ranges.
Always cite your sources with publication dates."""

        return await self.query(
            prompt,
            system_prompt=system_prompt,
            search_domain_filter=[
                "ibisworld.com",
                "statista.com",
                "census.gov",
                "bls.gov",
                "sba.gov",
                "forbes.com",
                "mckinsey.com"
            ]
        )

    async def compare_competitors(
        self,
        company_name: str,
        industry: str,
        competitors: List[str],
        location: str
    ) -> Dict:
        """
        Compare company to competitors using real-time data.

        Args:
            company_name: The company's name
            industry: Industry/sector
            competitors: List of competitor names
            location: Geographic location

        Returns:
            Dict with competitive analysis and citations
        """
        competitors_list = ", ".join(competitors)
        prompt = f"""
Analyze the competitive landscape for {company_name}, a {industry} business in {location},
compared to these competitors: {competitors_list}.

Focus on:
1. Revenue growth rates (recent quarters/years)
2. Market share and positioning
3. Customer acquisition strategies and costs
4. Operational efficiency metrics
5. Unique differentiators

Provide actionable insights that {company_name} can learn from competitors.
Use the most recent data available (2024-2026).
"""

        system_prompt = """You are a competitive intelligence analyst.
Provide fact-based comparisons with specific metrics.
Highlight both threats and opportunities.
Be objective and cite all sources."""

        return await self.query(
            prompt,
            system_prompt=system_prompt
        )

    async def get_tax_compliance_updates(
        self,
        business_type: str,
        location_state: str,
        year: int = 2026
    ) -> Dict:
        """
        Get latest tax compliance requirements for the business.

        Args:
            business_type: Legal entity type (e.g., "LLC", "S-Corp")
            location_state: State abbreviation (e.g., "CA")
            year: Tax year (default: current year)

        Returns:
            Dict with tax updates and citations
        """
        prompt = f"""
What are the latest tax compliance requirements for {business_type} businesses
in {location_state} for {year}?

Include:
1. Recent tax law changes affecting {business_type}
2. Filing deadlines (federal and state)
3. Available deductions and credits
4. State-specific requirements
5. Common compliance pitfalls to avoid

Only use official government sources (IRS, state revenue departments).
"""

        system_prompt = """You are a tax compliance expert.
Only provide information from official government sources.
Be specific about deadlines and requirements.
Include links to official forms and resources."""

        return await self.query(
            prompt,
            system_prompt=system_prompt,
            search_domain_filter=[
                "irs.gov",
                f"{location_state.lower()}.gov",
                "taxpayeradvocate.irs.gov"
            ]
        )

    async def get_growth_recommendations(
        self,
        industry: str,
        revenue: float,
        employees: int,
        growth_stage: str,
        location: str
    ) -> Dict:
        """
        Get personalized growth recommendations based on company profile.

        Args:
            industry: Industry name
            revenue: Annual revenue
            employees: Employee count
            growth_stage: Stage (startup, growth, mature, enterprise)
            location: Geographic location

        Returns:
            Dict with growth recommendations and case studies
        """
        prompt = f"""
Provide growth recommendations for a {growth_stage} stage {industry} company
in {location} with approximately ${revenue:,.0f} in annual revenue and {employees} employees.

Include:
1. Growth strategies used by similar successful companies
2. Case studies of companies at similar stage who achieved 2-3x growth
3. Key metrics to track (with target ranges)
4. Common scaling challenges and how to overcome them
5. Funding/financing options appropriate for this stage

Focus on recent examples (2023-2026) and practical, actionable advice.
"""

        system_prompt = """You are a business growth strategist.
Provide data-driven recommendations with specific examples.
Include case studies from similar companies.
Focus on practical, actionable steps."""

        return await self.query(
            prompt,
            system_prompt=system_prompt
        )


# Convenience function for quick testing
async def test_perplexity():
    """Test the Perplexity client with a simple query."""
    client = PerplexityClient()

    result = await client.get_industry_benchmarks(
        industry="SaaS",
        location="San Francisco, CA",
        metrics=["Customer Acquisition Cost", "Monthly Recurring Revenue Growth", "Churn Rate"]
    )

    print("Answer:", result["answer"])
    print("\nCitations:")
    for citation in result.get("citations", []):
        print(f"- {citation}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_perplexity())
