Folder: backend/

Purpose
- Accounting backend service scaffold for V1 (chart of accounts import, opening balances, core reports, period controls, audit logging).

Key Structure
- app/main.py: FastAPI entry point mounting `/v1` routes.
- app/core/: settings, logging, and database session helpers.
- app/db/: SQLAlchemy models plus Alembic migrations.
- app/api/v1/: versioned routers (accounts, reports, periods, opening balances, health).
- app/services/: domain services (COA import, posting, reporting, period control, audit).
- app/schemas/: Pydantic request/response models.
- tests/: unit and integration suites.
- Dockerfile + docker-compose.yml: local development environment with Postgres 16.
- test_ocr_smoke.py: legacy OCR smoke test retained for reference.

Getting Started
- Copy `.env.example` to `.env` and adjust as needed.
- `docker compose up --build` starts Postgres + backend.
- `alembic -c backend/alembic.ini upgrade head` applies migrations.
