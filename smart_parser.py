import os
import re
import pandas as pd
from pdfminer.high_level import extract_text
from pdf2image import convert_from_path
import easyocr
from PIL import Image


def extract_fields(text: str):
    """Extract vendor, date, total, and description from text using regex."""
    fields = {
        "vendor": None,
        "date": None,
        "total": None,
        "description": None
    }

    # Vendor extraction
    vendor_match = re.search(r"(?i)(?:from|vendor|supplier)[:\s]+([A-Za-z0-9& ,.'-]+)", text)

    # Date extraction
    date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)

    # Total extraction (supports $, €, £, ₹)
    total_match = re.search(r"(?i)(?:total|amount\s+due|balance)[:\s\$€£₹]*([\d,]+\.\d{2})", text)

    # Description extraction (explicit)
    description_match = re.search(r"(?i)(?:description|item|details)[:\s\-]+(.{5,80})", text)

    # Fallback description: line before "Total" or "Amount"
    if not description_match:
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if re.search(r"(?i)(total|amount|balance)", line):
                if i > 0 and not re.search(r"\d", lines[i - 1]):
                    fields["description"] = lines[i - 1].strip()
                break

    # Assign found values
    if vendor_match:
        fields["vendor"] = vendor_match.group(1).strip()
    if date_match:
        fields["date"] = date_match.group(1)
    if total_match:
        fields["total"] = total_match.group(1)
    if description_match:
        fields["description"] = description_match.group(1).strip()

    return fields


def extract_from_image(filepath: str):
    """Extract text from image using EasyOCR."""
    reader = easyocr.Reader(['en'])
    result = reader.readtext(filepath, detail=0)
    return "\n".join(result)


def extract_from_pdf(filepath: str):
    """Extract text from PDF (text-based or scanned)."""
    # Try text-based first
    text = extract_text(filepath)
    if len(text.strip()) > 50:
        return text

    # Fallback to OCR for scanned PDFs
    pages = convert_from_path(filepath, dpi=300)
    reader = easyocr.Reader(['en'])
    full_text = ""
    for i, page in enumerate(pages):
        img_path = f"temp_page_{i}.png"
        page.save(img_path, "PNG")
        result = reader.readtext(img_path, detail=0)
        full_text += "\n".join(result)
        os.remove(img_path)
    return full_text


def extract_from_csv(filepath: str):
    """Convert CSV content to readable text."""
    df = pd.read_csv(filepath)
    return df.to_string(index=False)


def smart_extract(filepath: str):
    """Automatically detect file type and extract text + structured fields."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext in [".jpg", ".jpeg", ".png"]:
        print("📸 Image detected — using EasyOCR...")
        text = extract_from_image(filepath)

    elif ext == ".pdf":
        print("📄 PDF detected — auto-selecting method...")
        text = extract_from_pdf(filepath)

    elif ext == ".csv":
        print("🧾 CSV detected — parsing content...")
        text = extract_from_csv(filepath)

    else:
        raise ValueError("Unsupported file type")

    fields = extract_fields(text)
    return {"raw_text": text, "parsed_fields": fields}
