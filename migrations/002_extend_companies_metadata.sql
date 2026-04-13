-- Migration: Extend companies table with business metadata for Perplexity AI comparisons
-- Date: 2026-02-01
-- Purpose: Add business context fields for market intelligence and competitor analysis

-- Add industry and business context fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type TEXT; -- 'sole_proprietor', 'llc', 'corporation', 's_corp', 'partnership'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INT;

-- Add location fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'USA';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_zip TEXT;

-- Add market and product context
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_products TEXT[]; -- Array of product/service categories
ALTER TABLE companies ADD COLUMN IF NOT EXISTS target_market TEXT; -- 'B2B', 'B2C', 'B2B2C'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS competitors TEXT[]; -- Known competitors
ALTER TABLE companies ADD COLUMN IF NOT EXISTS growth_stage TEXT; -- 'startup', 'growth', 'mature', 'enterprise'

-- Add onboarding status
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 1; -- Track progress through onboarding wizard

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_location_state ON companies(location_state);
CREATE INDEX IF NOT EXISTS idx_companies_onboarding ON companies(onboarding_completed);

-- Add helpful comments
COMMENT ON COLUMN companies.industry IS 'Primary industry/sector (e.g., SaaS, E-commerce, Professional Services)';
COMMENT ON COLUMN companies.business_type IS 'Legal entity type (sole_proprietor, llc, corporation, s_corp, partnership)';
COMMENT ON COLUMN companies.employee_count IS 'Number of employees (for benchmarking)';
COMMENT ON COLUMN companies.annual_revenue IS 'Annual revenue in USD (for benchmarking)';
COMMENT ON COLUMN companies.primary_products IS 'Array of primary products/services offered';
COMMENT ON COLUMN companies.target_market IS 'Primary customer type (B2B, B2C, B2B2C)';
COMMENT ON COLUMN companies.competitors IS 'Array of known competitor names (for Perplexity comparisons)';
COMMENT ON COLUMN companies.growth_stage IS 'Business maturity stage (startup, growth, mature, enterprise)';
