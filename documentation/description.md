Project overview and folder guide

- backend/: Accounting backend service (FastAPI + Postgres)
  - app/main.py: FastAPI app wiring `/v1` endpoints
  - app/core/: settings, logging, database session helpers
  - app/db/: SQLAlchemy models and Alembic migrations
  - app/api/v1/: routers for accounts, opening balances, periods, reports, health
  - app/services/: domain logic (COA import, posting, reporting, period control, audit)
  - app/schemas/: Pydantic request/response models
  - tests/: unit + integration tests (import validation, health)
  - Dockerfile + docker-compose.yml: Postgres 16 + backend runtime

- app/: Legacy OCR receipt pipeline (FastAPI) retained for reference
  - Focused on pytesseract-based extraction; see `ocr-readme.md` for details

- samples/: Sample receipts for the OCR prototype

- requirements.txt: Legacy OCR dependencies (prior to backend redesign)

- receipts.db: SQLite data store used by the OCR prototype

How it fits together (accounting backend)

1. Import COA → `POST /v1/accounts/import` (dry-run/apply; CSV/XLSX)
2. Persist accounts → stored via SQLAlchemy → Postgres tables (`accounts`, parents respected)
3. Apply opening balances → `POST /v1/opening-balances/apply` posts balanced JE + audit
4. Period control → `/v1/periods/soft-close|lock`
5. Reporting → `/v1/reports/trial-balance`, `/balance-sheet`, `/pnl`
6. Audit log tracks imports, postings, period actions
