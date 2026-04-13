-- ============================================================
-- Migration 004: Seed Chart of Accounts Templates
-- Run once in Supabase SQL Editor.
-- Idempotent: uses ON CONFLICT DO NOTHING throughout.
-- ============================================================

-- 0. Add unique constraints for idempotency (safe to re-run)
DO $$ BEGIN
  ALTER TABLE coa_templates ADD CONSTRAINT coa_templates_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE coa_template_accounts
    ADD CONSTRAINT coa_template_accounts_template_code_key
    UNIQUE (coa_template_id, account_code);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1. Insert 12 industry templates
-- ============================================================
INSERT INTO coa_templates (name, description, is_system) VALUES
  ('SaaS / Software',         'Software-as-a-Service and software product companies',       TRUE),
  ('E-commerce / Retail',     'Online and physical retail businesses',                       TRUE),
  ('Professional Services',   'Consulting, legal, accounting, and other professional firms', TRUE),
  ('Healthcare',              'Medical practices, clinics, and health services',              TRUE),
  ('Manufacturing',           'Product manufacturing and fabrication',                        TRUE),
  ('Food & Beverage',         'Restaurants, cafes, food production, and beverage companies',  TRUE),
  ('Real Estate',             'Property management, brokerage, and development',              TRUE),
  ('Construction',            'General and specialty construction contractors',                TRUE),
  ('Marketing / Advertising', 'Agencies, media buying, and creative services',                TRUE),
  ('Education',               'Schools, tutoring, e-learning, and training providers',        TRUE),
  ('Consulting',              'Management, IT, strategy, and other consulting firms',         TRUE),
  ('Other',                   'General-purpose chart of accounts for any business',           TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. Base accounts shared by ALL 12 templates
-- ============================================================
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM coa_templates LOOP
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      -- Assets
      (t.id, '1000', 'Cash',                     'asset',     'cash',               NULL,   TRUE),
      (t.id, '1010', 'Business Checking',         'asset',     'bank',               '1000', TRUE),
      (t.id, '1020', 'Business Savings',           'asset',     'bank',               '1000', TRUE),
      (t.id, '1100', 'Accounts Receivable',        'asset',     'accounts_receivable', NULL,   TRUE),
      (t.id, '1200', 'Prepaid Expenses',           'asset',     'current_asset',       NULL,   TRUE),
      (t.id, '1300', 'Fixed Assets',               'asset',     'fixed_asset',         NULL,   TRUE),
      (t.id, '1310', 'Furniture & Equipment',      'asset',     'fixed_asset',         '1300', TRUE),
      (t.id, '1390', 'Accumulated Depreciation',   'asset',     'fixed_asset',         '1300', TRUE),
      -- Liabilities
      (t.id, '2000', 'Accounts Payable',           'liability', 'accounts_payable',    NULL,   TRUE),
      (t.id, '2100', 'Credit Card',                'liability', 'credit_card',         NULL,   TRUE),
      (t.id, '2200', 'Accrued Expenses',           'liability', 'current_liability',   NULL,   TRUE),
      (t.id, '2300', 'Payroll Liabilities',        'liability', 'current_liability',   NULL,   TRUE),
      (t.id, '2400', 'Sales Tax Payable',          'liability', 'current_liability',   NULL,   TRUE),
      -- Equity
      (t.id, '3000', 'Owner''s Equity',            'equity',    'owner_equity',        NULL,   TRUE),
      (t.id, '3100', 'Retained Earnings',          'equity',    'retained_earnings',   NULL,   TRUE),
      -- Revenue
      (t.id, '4000', 'Service Revenue',            'revenue',   'income',              NULL,   TRUE),
      (t.id, '4900', 'Other Income',               'revenue',   'other_income',        NULL,   TRUE),
      -- Expenses
      (t.id, '5000', 'Cost of Goods Sold',         'expense',   'cost_of_goods_sold',  NULL,   TRUE),
      (t.id, '6000', 'Rent',                       'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6100', 'Utilities',                  'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6200', 'Office Supplies',            'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6300', 'Payroll',                    'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6400', 'Insurance',                  'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6500', 'Professional Fees',          'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6600', 'Marketing & Advertising',    'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6700', 'Travel & Meals',             'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6800', 'Depreciation Expense',       'expense',   'operating_expense',   NULL,   TRUE),
      (t.id, '6900', 'Other Expense',              'expense',   'other_expense',       NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 3. Industry-specific accounts
-- ============================================================

-- SaaS / Software
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'SaaS / Software';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Subscription Revenue',   'revenue',  'income',             NULL,   TRUE),
      (tid, '4020', 'License Revenue',         'revenue',  'income',             NULL,   TRUE),
      (tid, '5010', 'Hosting Costs',           'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5020', 'Third-Party API Costs',   'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '6810', 'R&D Expense',             'expense',  'operating_expense',  NULL,   TRUE),
      (tid, '6820', 'Software & Tools',        'expense',  'operating_expense',  NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- E-commerce / Retail
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'E-commerce / Retail';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '1400', 'Inventory',               'asset',    'inventory',          NULL,   TRUE),
      (tid, '4010', 'Product Sales',           'revenue',  'income',             NULL,   TRUE),
      (tid, '5010', 'Shipping Costs',          'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5020', 'Platform Fees',           'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5030', 'Packaging & Supplies',    'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '6810', 'Returns & Refunds',       'expense',  'operating_expense',  NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Professional Services
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Professional Services';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Consulting Revenue',          'revenue',  'income',            NULL,   TRUE),
      (tid, '4020', 'Project Revenue',             'revenue',  'income',            NULL,   TRUE),
      (tid, '6810', 'Subcontractor Costs',         'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6820', 'Professional Development',    'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6830', 'Licenses & Certifications',   'expense',  'operating_expense', NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Healthcare
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Healthcare';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Patient Revenue',             'revenue',  'income',             NULL,   TRUE),
      (tid, '4020', 'Insurance Reimbursements',    'revenue',  'income',             NULL,   TRUE),
      (tid, '1400', 'Medical Supplies Inventory',  'asset',    'inventory',          NULL,   TRUE),
      (tid, '5010', 'Medical Supplies Expense',    'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '1320', 'Medical Equipment',           'asset',    'fixed_asset',        '1300', TRUE),
      (tid, '6810', 'Licensing & Compliance',      'expense',  'operating_expense',  NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Manufacturing
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Manufacturing';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '1400', 'Raw Materials Inventory',     'asset',    'inventory',          NULL,   TRUE),
      (tid, '1410', 'Work-in-Progress Inventory',  'asset',    'inventory',          NULL,   TRUE),
      (tid, '1420', 'Finished Goods Inventory',    'asset',    'inventory',          NULL,   TRUE),
      (tid, '4010', 'Product Sales',               'revenue',  'income',             NULL,   TRUE),
      (tid, '5010', 'Direct Materials',            'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5020', 'Direct Labor',                'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5030', 'Manufacturing Overhead',      'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '1320', 'Production Equipment',        'asset',    'fixed_asset',        '1300', TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Food & Beverage
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Food & Beverage';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Food Sales',              'revenue',  'income',             NULL,   TRUE),
      (tid, '4020', 'Beverage Sales',          'revenue',  'income',             NULL,   TRUE),
      (tid, '1400', 'Food Inventory',          'asset',    'inventory',          NULL,   TRUE),
      (tid, '5010', 'Food Costs',              'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5020', 'Beverage Costs',          'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '1320', 'Kitchen Equipment',       'asset',    'fixed_asset',        '1300', TRUE),
      (tid, '6810', 'Health Permits & Licenses', 'expense', 'operating_expense', NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Real Estate
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Real Estate';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Rental Income',               'revenue',  'income',            NULL,   TRUE),
      (tid, '4020', 'Commission Income',            'revenue',  'income',            NULL,   TRUE),
      (tid, '1400', 'Properties Held for Sale',     'asset',    'other_asset',       NULL,   TRUE),
      (tid, '6810', 'Property Management Fees',     'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6820', 'Property Maintenance',         'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6830', 'Property Taxes',               'expense',  'operating_expense', NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Construction
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Construction';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Contract Revenue',            'revenue',  'income',             NULL,   TRUE),
      (tid, '1400', 'Construction Materials',      'asset',    'inventory',          NULL,   TRUE),
      (tid, '5010', 'Materials Costs',             'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '5020', 'Subcontractor Costs',         'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '1320', 'Heavy Equipment',             'asset',    'fixed_asset',        '1300', TRUE),
      (tid, '6810', 'Permits & Inspections',       'expense',  'operating_expense',  NULL,   TRUE),
      (tid, '6820', 'Equipment Rental',            'expense',  'operating_expense',  NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Marketing / Advertising
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Marketing / Advertising';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Agency Revenue',              'revenue',  'income',             NULL,   TRUE),
      (tid, '4020', 'Media Buying Revenue',        'revenue',  'income',             NULL,   TRUE),
      (tid, '5010', 'Media Buying Costs',          'expense',  'cost_of_goods_sold', NULL,   TRUE),
      (tid, '6810', 'Creative Production',         'expense',  'operating_expense',  NULL,   TRUE),
      (tid, '6820', 'Software & Platforms',        'expense',  'operating_expense',  NULL,   TRUE),
      (tid, '6830', 'Freelancer & Contractor Costs','expense', 'operating_expense',  NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Education
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Education';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Tuition Revenue',             'revenue',  'income',            NULL,   TRUE),
      (tid, '4020', 'Course & Program Fees',       'revenue',  'income',            NULL,   TRUE),
      (tid, '6810', 'Curriculum Development',      'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6820', 'Instructor Costs',            'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6830', 'Learning Materials',          'expense',  'operating_expense', NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Consulting
DO $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM coa_templates WHERE name = 'Consulting';
  IF tid IS NOT NULL THEN
    INSERT INTO coa_template_accounts (coa_template_id, account_code, account_name, account_type, account_subtype, parent_account_code, is_system) VALUES
      (tid, '4010', 'Consulting Fees',             'revenue',  'income',            NULL,   TRUE),
      (tid, '4020', 'Retainer Revenue',            'revenue',  'income',            NULL,   TRUE),
      (tid, '6810', 'Subcontractor Costs',         'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6820', 'Research & Data Services',    'expense',  'operating_expense', NULL,   TRUE),
      (tid, '6830', 'Professional Development',    'expense',  'operating_expense', NULL,   TRUE)
    ON CONFLICT (coa_template_id, account_code) DO NOTHING;
  END IF;
END $$;

-- Other (no extra accounts beyond the base set)
-- The base accounts inserted in step 2 are sufficient for "Other".
