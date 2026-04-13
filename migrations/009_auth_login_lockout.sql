-- Run in Supabase SQL Editor
-- Email-based auth lockout tracking for failed login attempts

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  email TEXT PRIMARY KEY,
  consecutive_failures INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON auth_login_attempts (locked_until);
