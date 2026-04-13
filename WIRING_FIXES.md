# Wiring Fixes — Before & After

This document records all fixes applied to wire the frontend, backend, middleware, migrations, routes, and Supabase correctly. Format: **Before** → **After**.

---

## 1. Backend: Dashboard — Account Type Field

**File:** `routes/dashboard.py`

| Before | After |
|--------|--------|
| Used `account.get("type", "")` and `.eq("type", "expense")` / `.select("id, type")` | Use `account.get("account_type", "")`, `.eq("account_type", "expense")`, and `.select("id, account_type")` to match DB column `account_type`. |

**Why:** Schema defines `accounts.account_type` (and `account_subtype`), not `type`. Totals and filters were wrong or empty.

---

## 2. Backend: Dashboard — Auth on All Endpoints

**File:** `routes/dashboard.py`

| Before | After |
|--------|--------|
| `get_monthly_trend(company_id, months)` — no auth | Added `auth: Depends(get_current_user_company)` and check `auth["company_id"] == company_id`; return 403 otherwise. |
| `get_category_breakdown(company_id)` — no auth | Same: require auth and verify company access. |
| `get_recent_transactions(company_id, limit)` — no auth | Same: require auth and verify company access. |

**Why:** Any company’s dashboard data was accessible without authentication. All dashboard routes are now scoped to the authenticated user’s company.

---

## 3. Backend: Accounts — PATCH Field Mapping

**File:** `routes/accounts.py`

| Before | After |
|--------|--------|
| `update_data = account.dict()` (with keys `type`, `subtype`, `balance`) sent directly to DB | New `_account_update_to_db()` maps Pydantic → DB: `type` → `account_type`, `subtype` → `account_subtype`, `balance` → `current_balance`. Only mapped fields are sent to Supabase. |

**Why:** DB columns are `account_type`, `account_subtype`, `current_balance`. Unmapped PATCH body would either fail or update wrong columns.

---

## 4. Backend: Journals — Create Response

**File:** `routes/journals.py`

| Before | After |
|--------|--------|
| `return get_journal_entry(journal_entry["id"])` — route handler called from Python without request context, so `auth` from `Depends` was not available. | After creating entry and lines, refetch with Supabase: `journal_entries` + `journal_lines(*, accounts(...))` for same `company_id`, then `return full.data` (or fallback to `journal_entry`). |

**Why:** Calling a FastAPI route that uses `Depends(get_current_user_company)` from inside another route does not inject `auth`. Refetching in the same function returns the full journal shape without depending on request context.

---

## 5. Frontend: AuthContext — API Base URL

**File:** `frontend/contexts/AuthContext.tsx`

| Before | After |
|--------|--------|
| `fetch(\`${process.env.NEXT_PUBLIC_API_BASE}/users/\`, ...)` | `const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'` then `fetch(\`${apiBase}/users/\`, ...)`. |

**Why:** If `NEXT_PUBLIC_API_BASE` is unset, the URL became `undefined/users/` and signup user-creation failed. Fallback keeps local dev working without env.

---

## 6. Frontend: New Journals — Parse Request & Response

**File:** `frontend/app/new-journals/page.tsx`

| Before | After |
|--------|--------|
| `api.post('/parse', formData, { headers: { 'Content-Type': 'multipart/form-data' } })` — `api.post` only takes `(url, body)`; third arg ignored; wrong method for file upload. | `api.postFormData<...>('/parse/', formData)` so the request is sent as multipart form data. |
| Used `response.data.extracted_data` (vendor, date, amount, memo, invoice_number) | Backend returns `{ parsed_fields, sample_text }`. Use `response.parsed_fields`; derive amount from `amount` or `total` (string or number); normalize date to `YYYY-MM-DD` (including 2-digit year); use `vendor`, `memo`, `invoice_number` from `parsed_fields`. |

**Why:** Parser endpoint expects `File(...)` via multipart; response shape is `parsed_fields` (with `vendor`, `date`, `total`/`amount`, etc.), not `data.extracted_data`. Frontend now matches backend contract and normalizes dates.

---

## 7. Frontend: New Journals — Accounts List Field

**File:** `frontend/app/new-journals/page.tsx`

| Before | After |
|--------|--------|
| `type: acc.type` when mapping API response to local account list | `type: acc.account_type` |

**Why:** API returns Supabase columns; `accounts` table has `account_type`, not `type`. Dropdown/display now uses the correct field.

---

## 8. Config & Docs — Environment Examples

| Before | After |
|--------|--------|
| Root `.env.example`: only `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY`. | Added optional `SUPABASE_JWT_SECRET`, `PERPLEXITY_API_KEY` with short comments. |
| No frontend env example. | Added `frontend/.env.local.example`: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_COMPANY_ID`. |
| Frontend README env referred to `NEXT_PUBLIC_COMPANY_ID` only. | Updated to document `NEXT_PUBLIC_API_BASE` and Supabase URL/anon key for auth, with pointer to `.env.local.example`. |

**Why:** Backend JWT fallback and Perplexity are optional but documented; frontend has a single reference for required and optional env vars and auth setup.

---

## Summary Table

| Area | Fix | Files |
|------|-----|--------|
| Backend | Dashboard uses `account_type` and auth on all dashboard routes | `routes/dashboard.py` |
| Backend | Accounts PATCH maps `type`/`subtype`/`balance` to DB columns | `routes/accounts.py` |
| Backend | Journals create returns refetched entry instead of calling route | `routes/journals.py` |
| Frontend | AuthContext API base fallback | `contexts/AuthContext.tsx` |
| Frontend | New Journals: postFormData to `/parse/`, use `parsed_fields`, date/amount handling | `app/new-journals/page.tsx` |
| Frontend | New Journals: use `account_type` from API | `app/new-journals/page.tsx` |
| Config | Env examples and README | `.env.example`, `frontend/.env.local.example`, `frontend/README.md` |

No changes were made to route registration in `main.py`, middleware logic in `middleware/auth.py`, migration files, or Supabase schema — those were already wired correctly.
