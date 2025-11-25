"""EasyOCR service for receipt text extraction and field parsing."""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

import easyocr
import numpy as np
from PIL import Image

from app.services.ollama_service import get_ollama_service

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Result from OCR processing."""

    text: str
    confidence: float
    bounding_boxes: list


@dataclass
class ReceiptFields:
    """Parsed fields from receipt."""

    vendor: Optional[str] = None
    transaction_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    description: Optional[str] = None  # Items purchased + card digits
    currency: str = "USD"
    confidence: float = 0.0


class EasyOCRService:
    """Service for OCR processing using EasyOCR."""

    def __init__(self):
        """Initialize the OCR service (lazy loading)."""
        self._reader = None
        self.languages = ["en"]

    def _get_reader(self) -> easyocr.Reader:
        """Lazy initialization of EasyOCR reader."""
        if self._reader is None:
            logger.info("Initializing EasyOCR reader (this may take a moment on first run)...")
            self._reader = easyocr.Reader(
                self.languages, gpu=False, verbose=False, download_enabled=True
            )
            logger.info("EasyOCR reader initialized successfully")
        return self._reader

    async def process_image(self, file_bytes: bytes) -> OCRResult:
        """
        Process image and extract text with confidence scores.

        Args:
            file_bytes: Image file as bytes

        Returns:
            OCRResult with extracted text, confidence, and bounding boxes
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(file_bytes))

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Convert to numpy array for EasyOCR
            img_array = np.array(image)

            # Get reader and perform OCR
            reader = self._get_reader()
            results = reader.readtext(img_array)

            # Extract text and calculate average confidence
            text_lines = []
            confidences = []
            bounding_boxes = []

            for bbox, text, conf in results:
                text_lines.append(text)
                confidences.append(conf)
                bounding_boxes.append(bbox)

            # Combine text with newlines
            full_text = "\n".join(text_lines)

            # Calculate average confidence
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            logger.info(
                f"OCR completed: {len(text_lines)} lines extracted, "
                f"avg confidence: {avg_confidence:.2f}"
            )

            return OCRResult(
                text=full_text, confidence=avg_confidence, bounding_boxes=bounding_boxes
            )

        except Exception as e:
            logger.error(f"Error during OCR processing: {e}")
            raise

    async def extract_receipt_fields(self, ocr_text: str, ocr_confidence: float) -> ReceiptFields:
        """
        Parse OCR text to extract structured receipt fields using Ollama Phi3.

        Args:
            ocr_text: Full OCR text from image
            ocr_confidence: OCR confidence score

        Returns:
            ReceiptFields with extracted data
        """
        # Try Ollama Phi3 first for intelligent extraction
        logger.info("Attempting Ollama Phi3 extraction...")
        ollama_service = get_ollama_service()

        try:
            logger.info(f"Calling Ollama service with OCR text ({len(ocr_text)} chars)...")
            ollama_data = await ollama_service.extract_receipt_fields(ocr_text)
            logger.info(f"Ollama returned confidence: {ollama_data.confidence}")

            # If Ollama succeeded, convert to ReceiptFields
            if ollama_data.confidence > 0:
                fields = ReceiptFields(
                    vendor=ollama_data.vendor,
                    transaction_date=ollama_data.transaction_date,
                    total_amount=ollama_data.total_amount,
                    tax_amount=ollama_data.tax_amount,
                    description=ollama_data.description,
                    currency=ollama_data.currency,
                    confidence=ollama_data.confidence
                )

                logger.info(
                    f"Phi3 extracted: vendor={fields.vendor}, date={fields.transaction_date}, "
                    f"total={fields.total_amount}, tax={fields.tax_amount}, confidence={fields.confidence:.2f}"
                )

                return fields
        except Exception as e:
            logger.warning(f"Ollama extraction failed, falling back to regex: {e}")

        # Fallback to regex-based extraction if Ollama fails
        logger.info("Using fallback regex extraction")
        lines = ocr_text.split("\n")
        fields = ReceiptFields()

        # Extract vendor (usually in top 3 lines, longest non-numeric line)
        fields.vendor = self._extract_vendor(lines[:5])

        # Extract date
        fields.transaction_date = self._extract_date(lines)

        # Extract total amount
        fields.total_amount = self._extract_total(lines)

        # Extract tax amount
        fields.tax_amount = self._extract_tax(lines)

        # Description is just first 500 chars of OCR text as fallback
        fields.description = ocr_text[:500] if ocr_text else None

        # Calculate field confidence
        fields.confidence = self._calculate_confidence(fields, ocr_confidence)

        logger.info(
            f"Regex extracted: vendor={fields.vendor}, date={fields.transaction_date}, "
            f"total={fields.total_amount}, tax={fields.tax_amount}, confidence={fields.confidence:.2f}"
        )

        return fields

    def _extract_vendor(self, top_lines: list[str]) -> Optional[str]:
        """Extract vendor name from top lines of receipt."""
        # Look for common vendor names first
        common_vendors = ["target", "walmart", "costco", "amazon", "starbucks", "whole foods"]

        for line in top_lines:
            line_lower = line.lower().strip()
            # Check for known vendors
            for vendor in common_vendors:
                if vendor in line_lower:
                    # Return the vendor name capitalized
                    return vendor.title()

        # Fallback: find first substantial non-numeric line
        for line in top_lines:
            cleaned = line.strip()
            # Skip very short lines or lines with invoice numbers
            if len(cleaned) < 2:
                continue
            if re.search(r"invoice|ship\s+to|^\d+$", cleaned, re.IGNORECASE):
                continue
            if re.search(r"\d{5,}", cleaned):  # Skip lines with 5+ consecutive digits
                continue

            # Return first substantial text line
            if len(cleaned) >= 2:
                return cleaned[:100]  # Limit length

        return None

    def _extract_date(self, lines: list[str]) -> Optional[date]:
        """Extract transaction date from receipt text."""
        # Common date patterns
        date_patterns = [
            r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b",  # MM/DD/YYYY or DD/MM/YYYY
            r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b",  # YYYY-MM-DD
            r"\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b",  # Month DD, YYYY
        ]

        today = datetime.now().date()
        candidates = []

        for line in lines:
            for pattern in date_patterns:
                matches = re.finditer(pattern, line, re.IGNORECASE)
                for match in matches:
                    try:
                        parsed_date = self._parse_date_match(match)
                        if parsed_date:
                            # Only accept dates within reasonable range (past 5 years, not future)
                            if (today - timedelta(days=365 * 5)) <= parsed_date <= today:
                                candidates.append(parsed_date)
                    except (ValueError, IndexError):
                        continue

        # Return most recent date found (typically the transaction date)
        return max(candidates) if candidates else None

    def _parse_date_match(self, match: re.Match) -> Optional[date]:
        """Parse a regex match into a date object."""
        groups = match.groups()

        if len(groups) == 3:
            # Check if first group is a month name
            if groups[0].isalpha():
                # Month name format: "August 15, 2023"
                month_names = {
                    "january": 1, "february": 2, "march": 3, "april": 4,
                    "may": 5, "june": 6, "july": 7, "august": 8,
                    "september": 9, "october": 10, "november": 11, "december": 12,
                    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
                    "jun": 6, "jul": 7, "aug": 8, "sep": 9,
                    "oct": 10, "nov": 11, "dec": 12
                }
                month_str = groups[0].lower()
                if month_str in month_names:
                    try:
                        month = month_names[month_str]
                        day = int(groups[1])
                        year = int(groups[2])
                        return date(year, month, day)
                    except (ValueError, IndexError):
                        pass

            # Try different numeric interpretations
            try:
                # YYYY-MM-DD format
                if len(groups[0]) == 4:
                    return date(int(groups[0]), int(groups[1]), int(groups[2]))

                # MM/DD/YY or MM/DD/YYYY format
                year = int(groups[2])
                if year < 100:
                    year += 2000
                return date(year, int(groups[0]), int(groups[1]))

            except (ValueError, IndexError):
                # Try DD/MM/YYYY if MM/DD/YYYY failed
                try:
                    year = int(groups[2])
                    if year < 100:
                        year += 2000
                    return date(year, int(groups[1]), int(groups[0]))
                except (ValueError, IndexError):
                    pass

        return None

    def _extract_total(self, lines: list[str]) -> Optional[Decimal]:
        """Extract total amount from receipt."""
        # Keywords that indicate total (in priority order)
        total_keywords = [
            r"invoice\s+total",  # Highest priority for invoices
            r"total\s+due",
            r"amount\s+due",
            r"balance\s+due",
            r"grand\s+total",
            r"^total$",  # Just "total" on its own line
            r"total",  # Generic total
        ]

        # Two patterns: one that REQUIRES currency symbol, one that doesn't
        # Prefer amounts with currency symbols (more reliable)
        money_with_currency = r"[\$\€\£]\s*(\d{1,7}(?:[,\.]\d{2,3})*[,\.]?\d{0,2})"
        money_without_currency = r"(\d{1,7}(?:[,\.]\d{2,3})*[,\.]\d{2})"

        # Search bottom 40% of receipt first (totals usually at bottom)
        bottom_start = int(len(lines) * 0.6)
        priority_lines = lines[bottom_start:] + lines[:bottom_start]

        for keyword in total_keywords:
            for idx, line in enumerate(priority_lines):
                if re.search(keyword, line, re.IGNORECASE):
                    # Try to find amounts with currency symbols first (more reliable)
                    amounts = re.findall(money_with_currency, line)

                    # If not found on same line, check the next line
                    if not amounts and idx + 1 < len(priority_lines):
                        next_line = priority_lines[idx + 1]
                        amounts = re.findall(money_with_currency, next_line)

                    # If still nothing, fallback to pattern without currency symbol
                    if not amounts:
                        amounts = re.findall(money_without_currency, line)
                        if not amounts and idx + 1 < len(priority_lines):
                            amounts = re.findall(money_without_currency, priority_lines[idx + 1])

                    if amounts:
                        # Filter out obviously wrong amounts (OCR errors like "SO,00" or numbers > $10,000)
                        valid_amounts = []
                        for amt in amounts:
                            # Skip if it's a placeholder like "0.00" or "SO,00"
                            if amt.upper().startswith("S0") or amt == "0.00" or amt == "00":
                                continue
                            valid_amounts.append(amt)

                        if not valid_amounts:
                            continue

                        try:
                            # Take the last (rightmost) valid amount
                            amount_str = valid_amounts[-1].replace(" ", "")

                            # Normalize decimal separator
                            if "," in amount_str and "." not in amount_str:
                                amount_str = amount_str.replace(",", ".")
                            elif "," in amount_str and "." in amount_str:
                                amount_str = amount_str.replace(",", "")

                            # Ensure it has a decimal point
                            if "." not in amount_str:
                                amount_str = amount_str + ".00"

                            amount = Decimal(amount_str)

                            # Skip unreasonably large amounts for invoices (likely OCR errors like 548.14 instead of 48.14)
                            if amount > 10000:
                                logger.debug(f"Skipping unreasonably large amount: {amount}")
                                continue

                            return amount
                        except (ValueError, IndexError, Exception) as e:
                            logger.debug(f"Failed to parse amount from '{line}': {e}")
                            continue

        return None

    def _extract_tax(self, lines: list[str]) -> Optional[Decimal]:
        """Extract tax amount from receipt."""
        tax_keywords = [
            r"sales\s+tax",
            r"tax",
            r"hst",
            r"gst",
            r"vat",
        ]
        # Same patterns as total extraction - prefer currency symbols
        money_with_currency = r"[\$\€\£]\s*(\d{1,7}(?:[,\.]\d{2,3})*[,\.]?\d{0,2})"
        money_without_currency = r"(\d{1,7}(?:[,\.]\d{2,3})*[,\.]\d{2})"

        for idx, line in enumerate(lines):
            for keyword in tax_keywords:
                if re.search(keyword, line, re.IGNORECASE):
                    # Try with currency symbol first
                    amounts = re.findall(money_with_currency, line)

                    if not amounts and idx + 1 < len(lines):
                        next_line = lines[idx + 1]
                        amounts = re.findall(money_with_currency, next_line)

                    # Fallback to pattern without currency
                    if not amounts:
                        amounts = re.findall(money_without_currency, line)
                        if not amounts and idx + 1 < len(lines):
                            amounts = re.findall(money_without_currency, lines[idx + 1])

                    if amounts:
                        # Filter out OCR errors
                        valid_amounts = []
                        for amt in amounts:
                            # Skip OCR errors like "SO,00" or "S0.0O"
                            if amt.upper().startswith("S0") or amt.upper().startswith("SO"):
                                continue
                            valid_amounts.append(amt)

                        if not valid_amounts:
                            continue

                        try:
                            amount_str = valid_amounts[-1].replace(" ", "")

                            # Normalize decimal separator
                            if "," in amount_str and "." not in amount_str:
                                amount_str = amount_str.replace(",", ".")
                            elif "," in amount_str and "." in amount_str:
                                amount_str = amount_str.replace(",", "")

                            # Ensure it has a decimal point
                            if "." not in amount_str:
                                amount_str = amount_str + ".00"

                            return Decimal(amount_str)
                        except (ValueError, IndexError, Exception) as e:
                            logger.debug(f"Failed to parse tax from '{line}': {e}")
                            continue

        return None

    def _calculate_confidence(self, fields: ReceiptFields, ocr_confidence: float) -> float:
        """
        Calculate overall confidence in extracted fields.

        Args:
            fields: Extracted receipt fields
            ocr_confidence: OCR engine confidence

        Returns:
            Confidence score (0-100)
        """
        # Start with OCR confidence as base
        confidence = ocr_confidence * 100

        # Adjust based on fields found
        if fields.vendor:
            confidence += 5
        else:
            confidence -= 10

        if fields.transaction_date:
            confidence += 5
        else:
            confidence -= 10

        if fields.total_amount:
            confidence += 10
        else:
            confidence -= 15

        if fields.tax_amount:
            confidence += 5

        # Clamp to 0-100 range
        return max(0.0, min(100.0, confidence))


# Singleton instance
_ocr_service = None


def get_ocr_service() -> EasyOCRService:
    """Get or create the OCR service singleton."""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = EasyOCRService()
    return _ocr_service
