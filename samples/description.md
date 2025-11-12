Folder: samples/

Purpose
- Holds example receipts (images or PDFs) for manual end‑to‑end testing via the API.

Files
- receipt1.png: Walmart‑style sample (scanned/phone capture)
- receipt2.png: Additional sample for verifying different layouts

How to use
- Upload: `curl -F "file=@samples/receipt1.png" http://127.0.0.1:8000/receipts`
- Extract: `curl -X POST "http://127.0.0.1:8000/receipts/<raw_id>/extract?commit=true"`

