-- Run in Supabase SQL Editor
-- Company-scoped RBAC support + admin passcode + activity logs

-- ---------------------------------------------------------------------------
-- 1) Expand users.role to include owner
-- ---------------------------------------------------------------------------
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'admin', 'accountant', 'user', 'viewer'));

UPDATE users
SET role = 'user'
WHERE role IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Owner bootstrap:
--    Promote exactly one admin per company to owner (oldest admin first),
--    but only when that company has no owner yet.
-- ---------------------------------------------------------------------------
WITH owner_companies AS (
  SELECT DISTINCT company_id
  FROM users
  WHERE company_id IS NOT NULL
    AND role = 'owner'
),
ranked_admins AS (
  SELECT
    id,
    company_id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM users
  WHERE company_id IS NOT NULL
    AND role = 'admin'
),
promotions AS (
  SELECT ra.id
  FROM ranked_admins ra
  LEFT JOIN owner_companies oc ON oc.company_id = ra.company_id
  WHERE ra.rn = 1
    AND oc.company_id IS NULL
)
UPDATE users u
SET role = 'owner'
FROM promotions p
WHERE u.id = p.id;

-- ---------------------------------------------------------------------------
-- 3) Per-user admin passcode storage (2nd step for /admin login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_passcodes (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  passcode_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_passcodes_company_id
  ON admin_passcodes (company_id);

-- ---------------------------------------------------------------------------
-- 4) Metadata-only server activity log (inbound + outbound)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS server_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  actor_email TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  method TEXT,
  path TEXT,
  status_code INT,
  duration_ms INT,
  ip_address TEXT,
  target_service TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_activity_logs_company_created
  ON server_activity_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_server_activity_logs_created_at
  ON server_activity_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5) 30-day purge helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_server_activity_logs()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM server_activity_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
