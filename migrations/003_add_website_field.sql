-- Migration: Add website field to companies table
-- Date: 2026-02-01
-- Purpose: Add company website URL to improve AI accuracy by providing additional context

-- Add website field
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;

-- Add index for website searches
CREATE INDEX IF NOT EXISTS idx_companies_website ON companies(website);

-- Add helpful comment
COMMENT ON COLUMN companies.website IS 'Company website URL (used by AI for accurate business identification and context)';
