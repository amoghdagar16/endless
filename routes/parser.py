from fastapi import APIRouter, File, UploadFile, HTTPException
from smart_parser import smart_extract
import os
import json

router = APIRouter(prefix="/parse", tags=["Parser"])


@router.post("/")
async def parse_any_file(file: UploadFile = File(...)):
    """Accepts image, PDF, or CSV and extracts text + structured info."""
    try:
        filename = file.filename
        temp_path = f"temp_{filename}"

        # Save file temporarily
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Run smart extraction
        result = smart_extract(temp_path)
        os.remove(temp_path)

        return {
            "filename": filename,
            "parsed_fields": result["parsed_fields"],
            "sample_text": result["raw_text"][:500]  # preview first 500 chars
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai")
async def parse_with_ai(file: UploadFile = File(...)):
    """
    AI-enhanced receipt parsing: OCR + OpenAI for intelligent field extraction.
    Returns cleaned, categorized, and validated expense data in one step.
    """
    try:
        filename = file.filename
        temp_path = f"temp_{filename}"

        # Save file temporarily
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Step 1: Run OCR extraction
        ocr_result = smart_extract(temp_path)
        os.remove(temp_path)

        raw_text = ocr_result["raw_text"]
        ocr_fields = ocr_result["parsed_fields"]

        # Step 2: Check if OpenAI is configured
        openai_key = os.getenv("OPENAI_API_KEY", "")

        if not openai_key:
            # Fallback: Return OCR-only results
            return {
                "filename": filename,
                "parsed_fields": ocr_fields,
                "sample_text": raw_text[:500],
                "ai_enhanced": False,
                "message": "OpenAI not configured. Returning OCR-only results."
            }

        # Step 3: Use OpenAI to enhance and validate OCR output
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            prompt = f"""You are an expert at analyzing receipt text and extracting structured expense data.

Raw OCR Text:
{raw_text[:1000]}

OCR Extracted Fields (may be incomplete or messy):
- Vendor: {ocr_fields.get('vendor', 'Not found')}
- Date: {ocr_fields.get('date', 'Not found')}
- Amount: {ocr_fields.get('total', 'Not found')}
- Description: {ocr_fields.get('description', 'Not found')}

Your task: Analyze the receipt and return clean, structured expense data.

Return a JSON object with:
{{
  "vendor": "Clean vendor name (standardized, no store numbers)",
  "date": "Date in YYYY-MM-DD format",
  "amount": "Amount as number (no $ or currency symbols)",
  "description": "Short, professional description of the purchase",
  "category": "Expense category (e.g., Office Supplies, Travel, Meals & Entertainment, Software & Services, Utilities, etc.)",
  "memo": "Professional memo for accounting records",
  "confidence": "high|medium|low based on OCR text quality"
}}

Rules:
- Normalize vendor names (e.g., "WALMART STORE #1234" → "Walmart")
- Use YYYY-MM-DD date format
- Extract only the numeric amount (e.g., "123.45")
- Infer category from vendor name and items purchased
- Be conservative: if unsure about any field, use confidence: "low"
"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a receipt analysis expert. Extract and clean expense data from OCR text. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            ai_fields = json.loads(response.choices[0].message.content)

            return {
                "filename": filename,
                "parsed_fields": ai_fields,
                "ocr_fields": ocr_fields,
                "sample_text": raw_text[:500],
                "ai_enhanced": True,
                "message": "Receipt successfully parsed and enhanced with AI"
            }

        except Exception as ai_error:
            # If AI fails, return OCR results with error message
            return {
                "filename": filename,
                "parsed_fields": ocr_fields,
                "sample_text": raw_text[:500],
                "ai_enhanced": False,
                "message": f"AI enhancement failed: {str(ai_error)}. Returning OCR-only results."
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
