-- Migration: Report Functions
-- Date: 2026-02-18
-- Purpose: Create PostgreSQL functions for date-filtered financial reports
-- Usage: Run in Supabase SQL Editor, then call via supabase.rpc()

-- =============================================================================
-- 1. rpt_trial_balance(p_company_id, p_as_of_date)
--    Returns per-account debit/credit totals and net balance for posted entries
--    up to the given date.
-- =============================================================================
CREATE OR REPLACE FUNCTION rpt_trial_balance(
  p_company_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type account_type,
  account_subtype account_subtype,
  debit_total NUMERIC(15,2),
  credit_total NUMERIC(15,2),
  net_balance NUMERIC(15,2)
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS account_id,
    a.account_code,
    a.account_name,
    a.account_type,
    a.account_subtype,
    COALESCE(SUM(jl.debit), 0)::NUMERIC(15,2) AS debit_total,
    COALESCE(SUM(jl.credit), 0)::NUMERIC(15,2) AS credit_total,
    CASE
      WHEN a.account_type IN ('asset', 'expense')
        THEN (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))
      ELSE (COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0))
    END::NUMERIC(15,2) AS net_balance
  FROM accounts a
  LEFT JOIN journal_lines jl ON jl.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.company_id = p_company_id
    AND a.is_active = TRUE
  GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.account_subtype
  ORDER BY a.account_code;
$$;

-- =============================================================================
-- 2. rpt_account_balances_as_of(p_company_id, p_as_of_date)
--    Returns cumulative net balance per account up to the given date.
--    Used by Balance Sheet and Cash Flow.
-- =============================================================================
CREATE OR REPLACE FUNCTION rpt_account_balances_as_of(
  p_company_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type account_type,
  account_subtype account_subtype,
  net_balance NUMERIC(15,2)
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS account_id,
    a.account_code,
    a.account_name,
    a.account_type,
    a.account_subtype,
    CASE
      WHEN a.account_type IN ('asset', 'expense')
        THEN (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))
      ELSE (COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0))
    END::NUMERIC(15,2) AS net_balance
  FROM accounts a
  LEFT JOIN journal_lines jl ON jl.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.company_id = p_company_id
    AND a.is_active = TRUE
  GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.account_subtype
  ORDER BY a.account_code;
$$;

-- =============================================================================
-- 3. rpt_account_balances_between(p_company_id, p_start_date, p_end_date)
--    Returns net movement per account for a date range.
--    Used by P&L and Cash Flow.
-- =============================================================================
CREATE OR REPLACE FUNCTION rpt_account_balances_between(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type account_type,
  account_subtype account_subtype,
  net_balance NUMERIC(15,2)
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS account_id,
    a.account_code,
    a.account_name,
    a.account_type,
    a.account_subtype,
    CASE
      WHEN a.account_type IN ('asset', 'expense')
        THEN (COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))
      ELSE (COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0))
    END::NUMERIC(15,2) AS net_balance
  FROM accounts a
  LEFT JOIN journal_lines jl ON jl.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
  WHERE a.company_id = p_company_id
    AND a.is_active = TRUE
  GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.account_subtype
  ORDER BY a.account_code;
$$;

