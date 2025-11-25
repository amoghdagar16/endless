"""Ollama Phi3 service for structured receipt data extraction."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class ReceiptData:
    """Structured receipt data extracted by Phi3."""

    vendor: Optional[str] = None
    transaction_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    description: Optional[str] = None  # Contains items purchased + card digits
    currency: str = "USD"
    confidence: float = 0.0


class OllamaService:
    """Service for calling Ollama Phi3 model for receipt parsing."""

    def __init__(self, base_url: str = "http://localhost:11434"):
        """Initialize Ollama service.

        Args:
            base_url: Ollama API base URL (default: http://localhost:11434)
        """
        self.base_url = base_url
        self.model = "phi3"
        self.timeout = 60.0  # 60 second timeout for LLM calls

    async def extract_receipt_fields(self, ocr_text: str) -> ReceiptData:
        """
        Extract structured receipt data from OCR text using Phi3.

        Args:
            ocr_text: Raw OCR text from receipt

        Returns:
            ReceiptData with extracted fields
        """
        logger.info(f"=== OLLAMA SERVICE: Starting extraction, OCR text length: {len(ocr_text)} ===")
        logger.info(f"=== RAW OCR TEXT ===\n{ocr_text}\n=== END OCR TEXT ===")
        try:
            # Create the prompt for Phi3
            prompt = self._create_extraction_prompt(ocr_text)
            logger.info(f"Created prompt, length: {len(prompt)}")

            # Call Ollama API
            logger.info(f"Calling Ollama API at {self.base_url}/api/generate with model={self.model}")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",  # Request JSON response
                    },
                )
                logger.info(f"Ollama API response status: {response.status_code}")

                if response.status_code != 200:
                    logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                    raise Exception(f"Ollama API returned status {response.status_code}")

                result = response.json()
                llm_response = result.get("response", "")

                logger.info(f"Raw Phi3 response: {llm_response[:500]}")

                # Parse the LLM response
                receipt_data = self._parse_llm_response(llm_response)

                logger.info(
                    f"Phi3 extracted: vendor={receipt_data.vendor}, "
                    f"date={receipt_data.transaction_date}, total={receipt_data.total_amount}"
                )

                return receipt_data

        except Exception as e:
            logger.error(f"Error calling Ollama Phi3: {e}")
            # Return empty data on error (caller can use fallback regex extraction)
            return ReceiptData(confidence=0.0)

    def _create_extraction_prompt(self, ocr_text: str) -> str:
        """Create the prompt for Phi3 to extract receipt data."""
        return f"""Extract receipt data as JSON from this OCR text:

{ocr_text}

Return this exact JSON structure:
{{
  "vendor": "store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "tax": 0.00,
  "items": "single string with items, prices, tax, and card ending"
}}

CRITICAL INSTRUCTIONS FOR "total" FIELD:
- Find the line that says "TOTAL", "TOTAL DUE", "AMOUNT DUE", or similar (usually near bottom of receipt)
- This must be the FINAL amount the customer paid AFTER all taxes are added
- DO NOT use the "SUBTOTAL" value
- DO NOT use "CREDIT TEND" or "DEBIT TEND" value
- DO NOT add up individual item prices yourself
- The total should be subtotal + tax (verify this makes sense)

For "items" field:
- List all purchased items with their individual prices
- Then add tax amount
- Then add card ending digits if visible
Example: "Hand Towel $2.97, Gatorade $2.00, T-Shirt $16.88, Push Pins $1.24. Tax $2.90. Card ending in 9999"

Return ONLY the JSON, nothing else."""

    def _parse_llm_response(self, llm_response: str) -> ReceiptData:
        """Parse the JSON response from Phi3."""
        try:
            # Clean up response (sometimes LLMs wrap JSON in markdown)
            cleaned = llm_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            # Parse JSON
            data = json.loads(cleaned)

            # Extract fields
            vendor = data.get("vendor")
            date_str = data.get("date")
            total = data.get("total")
            tax = data.get("tax")
            items = data.get("items", "")

            # Parse date
            transaction_date = None
            if date_str:
                try:
                    # Expected format: YYYY-MM-DD
                    parts = date_str.split("-")
                    if len(parts) == 3:
                        transaction_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
                except Exception as e:
                    logger.warning(f"Failed to parse date '{date_str}': {e}")

            # Parse amounts
            total_amount = None
            if total is not None:
                try:
                    total_amount = Decimal(str(total))
                except Exception as e:
                    logger.warning(f"Failed to parse total '{total}': {e}")

            tax_amount = None
            if tax is not None:
                try:
                    tax_amount = Decimal(str(tax))
                except Exception as e:
                    logger.warning(f"Failed to parse tax '{tax}': {e}")

            # Calculate confidence based on fields extracted
            confidence = 50.0  # Base confidence for successful parse
            if vendor:
                confidence += 15
            if transaction_date:
                confidence += 15
            if total_amount:
                confidence += 15
            if tax_amount:
                confidence += 5

            return ReceiptData(
                vendor=vendor,
                transaction_date=transaction_date,
                total_amount=total_amount,
                tax_amount=tax_amount,
                description=items if items else None,
                confidence=min(confidence, 100.0),
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Phi3 JSON response: {e}")
            logger.debug(f"Raw response: {llm_response}")
            return ReceiptData(confidence=0.0)
        except Exception as e:
            logger.error(f"Error parsing Phi3 response: {e}")
            return ReceiptData(confidence=0.0)


# Singleton instance
_ollama_service = None


def get_ollama_service() -> OllamaService:
    """Get or create the Ollama service singleton."""
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service
