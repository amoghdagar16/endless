Folder: tests/

Purpose
- Text‑only tests for extraction heuristics and parsing behavior. Avoids heavy OCR/PDF dependencies so tests run fast and deterministically.

Files
- test_extract.py: Covers fuzzy keyword handling, totals+tax coherence, bottom‑biased date selection, masked last‑4 rule, and confidence scoring (including cash/change sanity).

How to run
- Ensure venv is active and dependencies installed: `pip install -r requirements.txt`
- Run: `pytest tests/test_extract.py`

