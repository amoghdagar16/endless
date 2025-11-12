OCR Receipt Pipeline — Build Notes and Issues Log

Scope (MVP)
- Upload receipt (PDF/PNG/JPG) → store raw bytes in SQLite (receipts_raw)
- Prefer embedded PDF text; else rasterize → OCR
- Parse vendor, date, total, tax, currency, last‑4 → store in receipts_extracted
- When commit=true and total+date exist → create a transactions row

Initial Stack Choices (M1‑friendly)
- FastAPI, SQLAlchemy, SQLite for local dev
- pypdfium2 for fast PDF rasterization
- pdfminer.six to extract embedded text (skip OCR when possible)
- pytesseract (Homebrew tesseract 5.x) for OCR

Key Issues Encountered and Fixes

1) OCR text quirks on receipts (typos and dropped digits)
- Symptom: “TAX” read as “TAK”, “SUBTOTAL 23.09” read as “2.09”, totals sometimes letters (“aw”).
- Fixes:
  - Fuzzy keyword matching for TOTAL/SUBTOTAL/TAX (edit‑distance ≤1, compact token matches)
  - Totals coherence repair: derive TOTAL as SUBTOTAL + sum(TAX lines) when the keyword line is wrong or missing
  - “Rightmost money” rule on keyword lines; fallback to bottom‑of‑doc scan

2) Wrong dates selected
- Symptom: Parser latched onto spurious or future dates instead of the footer timestamp.
- Fixes:
  - Bottom‑biased date selection (search bottom third first)
  - Priority for lines containing a time token (HH:MM)
  - Strict candidate extraction with regex patterns, plausible‑year guard (>=2000), and +1 day future limit
  - Debug logging of date candidates (index + parsed value)

3) Card last‑4 misreads
- Symptom: Unmasked numbers (barcodes, IDs) misdetected as last‑4.
- Fix: Accept last‑4 only when preceded by a masking token (****/XXXX/xx). Track whether a masked line was observed.

4) Confidence too optimistic
- Symptom: High scores despite missing/misparsed core fields.
- Fix: Recalibrated penalties and bonuses; cap base score at 95 and add a small cash/change coherence bonus (+3) when present and balanced, or −5 when contradictory.

5) Tesseract wiring on macOS
- Symptom: pytesseract not finding the binary.
- Fix: Auto‑set tesseract_cmd to /opt/homebrew/bin/tesseract when PATH lookup fails; added standalone smoke test.

Outcome on Known Samples
- Walmart‑style receipt (image):
  - vendor: WALL‑MART‑SUPERSTORE
  - txn_date: 2020‑10‑17 (footer timestamp)
  - subtotal: 23.09; tax: 4.18 (2.90 + 1.28); total: 27.27 (coherence repaired)
  - payment_last4: None (no masked card line in OCR text)
  - confidence: ~90–95 depending on currency detection

- Fresh Foods receipt (with cash/change):
  - date: 2014‑03‑18 09:56; total: 4.86; tax: 0.36; cash 10.00; change 5.14
  - cash/change sanity adds a small confidence bonus

What Changed in Code (high level)
- app/services/extract.py: robust keyword detection, totals/tax coherence, bottom‑biased date parser with candidate logs, masked‑only last‑4, confidence tuning, optional cash/change bonus.
- app/services/pdf.py: embedded‑text first path and PDF rasterization
- app/services/ocr_tesseract.py: stable OCR with basic fallbacks and version reporting
- app/services/pipeline.py: debug logging (summary of picks and timings), page cap

How to Test Manually
- Start API: `uvicorn app.main:app --reload`
- Upload: `curl -F "file=@samples/receipt1.png" http://127.0.0.1:8000/receipts`
- Extract: `curl -X POST "http://127.0.0.1:8000/receipts/<raw_id>/extract?commit=true"`
- Inspect OCR text: `sqlite3 receipts.db "SELECT full_text FROM receipts_extracted ORDER BY created_at DESC LIMIT 1;"`
- Check rows: `sqlite3 receipts.db ".tables"` and query the three tables

Next Ideas (optional)
- RapidOCR engine behind a flag (OCR_ENGINE=rapid)
- Alembic migrations for Postgres/Supabase deployments
- More locales/currencies; configurable symbols and keywords
- Improved vendor detection via a small lexicon

