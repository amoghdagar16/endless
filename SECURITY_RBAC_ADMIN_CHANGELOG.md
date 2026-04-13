# Security, RBAC, and Admin Panel Changes

## Brief Summary

This update adds two major security layers to the product without redesigning existing accounting workflows:

1. **Authentication lockout hardening**
   - Global email-based lockout after 5 consecutive invalid password attempts.
   - 3-minute lock timer is enforced server-side and survives reload/device changes.

2. **Company-scoped RBAC + Admin panel foundation**
   - Added role model: `owner`, `admin`, `accountant`, `user`, `viewer`.
   - Added role-gated access to AI, reports/statements, transaction mutation paths, and admin surfaces.
   - Added `/admin` backend endpoints and frontend admin pages with second-step admin passcode flow.
   - Added metadata-only server activity logging and 30-day retention/purge support.

The implementation is **tenant-scoped** (company-specific) and designed to avoid changing core accounting logic or route architecture.

---

## Full Technical Detail

## 1) Authentication Lockout Hardening

### 1.1 Database Changes

- Added lockout table via:
  - `migrations/009_auth_login_lockout.sql`
  - reflected in `supabase_schema.sql`

Table:
- `auth_login_attempts`
  - `email` (PK)
  - `consecutive_failures`
  - `locked_until`
  - `updated_at`

### 1.2 Backend API Changes

Updated `routes/users.py` with:

- `POST /users/auth/attempts/precheck`
  - Input: email
  - Output: lock state + remaining seconds

- `POST /users/auth/attempts/record`
  - Input: email + outcome (`invalid_credentials` or `success`)
  - Behavior:
    - increments failures for invalid credentials
    - locks on 5th consecutive failure for 180s
    - resets on success
    - does not unlock before lock timer expiration

### 1.3 Frontend Auth Flow Changes

Updated:
- `frontend/contexts/AuthContext.tsx`
- `frontend/app/login/page.tsx`

Behavior:
- Precheck lock before attempting Supabase password sign-in.
- Count only invalid credential responses.
- Reset attempt state on successful login.
- Show lock countdown in login UI and disable submit while locked.

---

## 2) Company-Scoped RBAC Model

### 2.1 Role Intent

Implemented role model:
- `owner`
- `admin`
- `accountant`
- `user`
- `viewer`

High-level behavior:
- `owner/admin/accountant`: can access AI + reports/statements.
- `owner/admin`: can access admin panel and activity logs.
- `user`: create-only for transaction entry flows; blocked from AI/reports/admin.
- `viewer`: read-only (no mutation).

### 2.2 Role Utilities

Updated `middleware/auth.py`:
- Added role hierarchy including `owner`.
- Added `require_min_role(...)` dependency factory.
- Added `require_any_role(...)` dependency factory.

---

## 3) RBAC Enforcement Added to Routes

### 3.1 AI and Reports

Protected with minimum role `accountant`:
- `routes/ai_overlook.py`
- `routes/ai_research.py`
- `routes/ai_insights.py`
- `routes/reports.py`

### 3.2 Transaction and Posting Paths

Adjusted route-level authorization:

- `routes/journals.py`
  - create: `user+`
  - update/delete: `accountant+`

- `routes/invoices.py`
  - create: `user+`
  - update/posting: `accountant+`

- `routes/bills.py`
  - create: `user+`
  - update/posting: `accountant+`

- `routes/payments.py`
  - create: `user+`
  - apply-to-invoice: `accountant+`

- `routes/bill_payments.py`
  - create: `user+`
  - apply-to-bills: `accountant+`

### 3.3 Global Guardrails Middleware

Added `middleware/rbac_guard.py` and registered in `main.py`:
- blocks `user/viewer` from `/ai`, `/reports`, `/admin`.
- enforces `viewer` read-only on all mutating methods.
- enforces `user` create-only semantics for specific transaction entry endpoints.

---

## 4) Owner/Admin User Management

Extended `routes/users.py` with management endpoints:

- `GET /users/manage/company-members`
  - list company users for owner/admin.

- `PATCH /users/manage/company-members/{target_user_id}/role`
  - owner/admin role updates inside same company.
  - guardrails:
    - admin cannot modify owner/admin roles
    - admin cannot assign owner/admin
    - owner cannot self-demote

---

## 5) Admin Login (Separate Passcode Step)

### 5.1 Data + Migration

Added in `migrations/010_company_rbac_admin_audit.sql`:
- `admin_passcodes` table (per user/company hash storage)

### 5.2 Backend

Added:
- `lib/admin_session.py` (admin session token mint/verify)
- `routes/admin.py`

Endpoints:
- `POST /admin/session/set-passcode`
- `POST /admin/session/verify-passcode`
- `POST /admin/session/validate`

Flow:
- standard auth identity + second passcode verification for admin scope.
- short-lived admin session token required for admin APIs.

### 5.3 Frontend

Added:
- `frontend/app/admin/login/page.tsx`
  - email/password + passcode flow.
  - first-time passcode setup path.

---

## 6) Admin Panel and Activity Endpoint

### 6.1 Backend Activity API

Added `routes/admin.py`:

- `GET /admin/activity`
  - owner/admin only
  - requires `X-Admin-Session`
  - scoped to authenticated user company
  - supports pagination and filters

- `POST /admin/activity/purge`
  - owner/admin only
  - company-scoped purge of old logs

### 6.2 Frontend Admin UI

Added:
- `frontend/app/admin/page.tsx`

Features:
- activity log table (company-only data).
- role management UI for company members.
- purge action for logs older than retention window.

### 6.3 Sidebar/Access UX

Updated:
- `frontend/components/NewSidebar.tsx`
  - Admin nav item only for `owner/admin`.
  - AI/Reports hidden for `user/viewer`.

- `frontend/components/AppLayout.tsx`
  - `/admin/login` treated as public-style route (no app shell requirement).

---

## 7) Metadata-Only Server Activity Logging

### 7.1 Data Layer

Added in `migrations/010_company_rbac_admin_audit.sql`:
- `server_activity_logs`
- helper SQL function `purge_server_activity_logs()`

### 7.2 Logging Utilities

Added:
- `lib/audit.py`
  - write log helper
  - company purge helper
  - SQL-function purge helper

- `middleware/activity_logger.py`
  - inbound request metadata capture:
    - path/method/status/duration/ip
    - actor context when resolvable
    - company scope

### 7.3 Outbound Capture

Updated `middleware/auth.py` to log key outbound auth/JWKS calls as `outbound` activity events.

---

## 8) Frontend Feature Gating (Role-Aware)

Updated:
- `frontend/components/AskAIButton.tsx` (hidden for non-authorized roles)
- `frontend/app/ai/page.tsx` (blocked UI for non-authorized roles)
- `frontend/app/reports/page.tsx` (blocked UI for non-authorized roles)

This complements backend enforcement; backend remains source-of-truth.

---

## 9) Additional Migration for RBAC Foundation

Added `migrations/010_company_rbac_admin_audit.sql` which also includes:

- users role check expansion to include `owner`.
- owner bootstrap migration:
  - promotes one existing admin per company when owner absent.

---

## 10) Operational Notes

### 10.1 Migrations to Apply

Required SQL order:
1. `migrations/009_auth_login_lockout.sql`
2. `migrations/010_company_rbac_admin_audit.sql`

### 10.2 Existing Functionality Guardrails

Changes were designed to be additive and role-gating focused:
- no broad architectural refactor.
- no replacement of existing auth provider flow.
- no cross-company visibility expansion.

### 10.3 Files Added

- `migrations/009_auth_login_lockout.sql`
- `migrations/010_company_rbac_admin_audit.sql`
- `lib/admin_session.py`
- `lib/audit.py`
- `middleware/activity_logger.py`
- `middleware/rbac_guard.py`
- `routes/admin.py`
- `frontend/app/admin/login/page.tsx`
- `frontend/app/admin/page.tsx`

### 10.4 Files Updated (Core)

- `routes/users.py`
- `middleware/auth.py`
- `main.py`
- `routes/reports.py`
- `routes/ai_overlook.py`
- `routes/ai_research.py`
- `routes/ai_insights.py`
- `routes/journals.py`
- `routes/invoices.py`
- `routes/bills.py`
- `routes/payments.py`
- `routes/bill_payments.py`
- `frontend/contexts/AuthContext.tsx`
- `frontend/app/login/page.tsx`
- `frontend/components/AppLayout.tsx`
- `frontend/components/NewSidebar.tsx`
- `frontend/components/AskAIButton.tsx`
- `frontend/app/ai/page.tsx`
- `frontend/app/reports/page.tsx`
- `supabase_schema.sql`

