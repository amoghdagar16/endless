-- Run in Supabase SQL Editor
-- Adds Plaid sync cursor + balances to banking tables

ALTER TABLE bank_connections
  ADD COLUMN IF NOT EXISTS sync_cursor TEXT;

ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS balance_current NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_available NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS account_subtype TEXT;
