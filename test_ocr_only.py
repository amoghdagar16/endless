#!/usr/bin/env python3
"""Test OCR extraction to see what text is actually extracted."""
import asyncio
from backend.app.services.ocr_service import get_ocr_service

async def test_ocr():
    # Read receipt1.png
    with open("/Users/atimanr/AI_accounting/v21.1/samples/receipt1.png", "rb") as f:
        image_bytes = f.read()

    # Process with OCR
    ocr_service = get_ocr_service()
    ocr_result = await ocr_service.process_image(image_bytes)

    print("=== OCR EXTRACTED TEXT ===")
    print(ocr_result.text)
    print("=== END OCR TEXT ===")
    print(f"\nConfidence: {ocr_result.confidence:.2%}")
    print(f"Lines extracted: {len(ocr_result.text.split(chr(10)))}")

if __name__ == "__main__":
    asyncio.run(test_ocr())
