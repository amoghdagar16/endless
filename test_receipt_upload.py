#!/usr/bin/env python3
"""Test receipt upload and processing with Ollama."""
import httpx
import asyncio
import uuid

async def test_receipt():
    # Use a test company ID
    company_id = "00000000-0000-0000-0000-000000000001"

    # Read receipt1.png
    with open("/Users/atimanr/AI_accounting/v21.1/samples/receipt1.png", "rb") as f:
        image_bytes = f.read()

    # Set up headers with Company-Id
    headers = {"X-Company-Id": company_id}

    # Set a longer timeout for OCR + Phi3 processing
    async with httpx.AsyncClient(base_url="http://localhost:8000", headers=headers, timeout=120.0) as client:
        # Upload
        files = {"file": ("receipt1.png", image_bytes, "image/png")}
        upload_resp = await client.post("/v1/documents/upload", files=files)
        print(f"Upload response: {upload_resp.status_code}")
        upload_data = upload_resp.json()
        print(f"Upload data: {upload_data}")

        if upload_resp.status_code != 200:
            print(f"Error: {upload_data}")
            return

        doc_id = upload_data["id"]
        print(f"Document ID: {doc_id}")

        # Process
        print("\nProcessing with OCR + Ollama...")
        process_resp = await client.post(f"/v1/documents/{doc_id}/process")
        print(f"Process response: {process_resp.status_code}")
        result = process_resp.json()

        print(f"\nExtracted Fields:")
        print(f"  Vendor: {result.get('vendor')}")
        print(f"  Date: {result.get('transactionDate')}")
        print(f"  Total: {result.get('totalAmount')}")
        print(f"  Tax: {result.get('taxAmount')}")
        print(f"  Description: {result.get('description', '')[:100]}")
        print(f"  Confidence: {result.get('ocrConfidence')}")

if __name__ == "__main__":
    asyncio.run(test_receipt())
