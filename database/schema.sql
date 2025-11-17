-- ============================================================================
-- MiniBooks Database Schema - Complete & Production-Ready
-- ============================================================================
-- This schema supports:
-- - Multi-tenant companies
-- - User authentication (Supabase Auth integration)
-- - Expense management with categories and budgets
-- - Vendor management
-- - Journal entries (double-entry accounting)
-- - Payment methods
-- - Receipt storage URLs
-- - Audit logging
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ein TEXT,
  address TEXT,
  fiscal_year_start DATE,
  industry TEXT,
  created_by UUID,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users Table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'accountant', 'employee')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_type TEXT DEFAULT 'company' CHECK (user_type IN ('company', 'freelancer')),
  last_login TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL ENTITIES
-- ============================================================================

-- Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  website TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  default_category_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- EXPENSE CATEGORIES & BUDGETS
-- ============================================================================

-- Categories Table (Enhanced with our new fields)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  budget_amount NUMERIC(15, 2),
  is_active BOOLEAN DEFAULT true,
  icon TEXT,
  color TEXT,
  parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Add foreign key for vendors default category (after categories table exists)
ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_default_category_fkey,
  ADD CONSTRAINT vendors_default_category_fkey
  FOREIGN KEY (default_category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'bank_account', 'cash', 'check', 'paypal', 'other')),
  account_number_last4 TEXT,
  bank_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- EXPENSES & BILLS
-- ============================================================================

-- Bills Table (Current expense storage - legacy)
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  bill_number TEXT,
  bill_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  balance_due NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'partial', 'void')),
  memo TEXT,
  receipt_url TEXT,
  receipt_file_name TEXT,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses Table (Enhanced - recommended for future use)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  bill_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  memo TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid', 'void')),
  receipt_url TEXT,
  receipt_file_name TEXT,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Expense Audit Log
CREATE TABLE IF NOT EXISTS public.expense_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'approved', 'rejected')),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CHART OF ACCOUNTS & JOURNALS
-- ============================================================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_code TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  opening_balance NUMERIC(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  memo TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Lines (Double-entry)
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description TEXT,
  debit NUMERIC(15, 2) DEFAULT 0,
  credit NUMERIC(15, 2) DEFAULT 0,
  department TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INVOICES & PAYMENTS
-- ============================================================================

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  balance_due NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'void')),
  memo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(15, 2) DEFAULT 0,
  method TEXT CHECK (method IN ('bank_transfer', 'credit_card', 'check', 'cash')),
  reference TEXT,
  applied_to JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('cleared', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BUDGETS
-- ============================================================================

-- Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  budget_amount NUMERIC(15, 2) DEFAULT 0,
  actual_amount NUMERIC(15, 2) DEFAULT 0,
  variance NUMERIC(15, 2) GENERATED ALWAYS AS (budget_amount - actual_amount) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- AI & CHAT
-- ============================================================================

-- AI Logs (for tracking AI interactions)
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  input_text TEXT,
  ai_output JSONB,
  ai_confidence NUMERIC(3, 2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message TEXT,
  sender TEXT CHECK (sender IN ('user', 'ai', 'support')),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- UTILITIES
-- ============================================================================

-- Reports Cache
CREATE TABLE IF NOT EXISTS public.reports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  data JSONB,
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Payroll
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  gross_pay NUMERIC(15, 2) DEFAULT 0,
  deductions NUMERIC(15, 2) DEFAULT 0,
  net_pay NUMERIC(15, 2) DEFAULT 0,
  payment_date DATE,
  journal_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Migrations/Imports Tracking
CREATE TABLE IF NOT EXISTS public.migrations_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  source_system TEXT CHECK (source_system IN ('quickbooks', 'netsuite')),
  file_name TEXT,
  import_date TIMESTAMP DEFAULT NOW(),
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON public.vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors(is_active);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_category_id);

-- Bills
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON public.bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON public.bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON public.bills(bill_date);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON public.expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_bill_date ON public.expenses(bill_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- Expense Audit Log
CREATE INDEX IF NOT EXISTS idx_expense_audit_expense_id ON public.expense_audit_log(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_audit_company_id ON public.expense_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_audit_created_at ON public.expense_audit_log(created_at);

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON public.journal_entries(entry_date);

-- Journal Lines
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id ON public.journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON public.journal_lines(account_id);

-- Payment Methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON public.payment_methods(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see their own company
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Users: Users can see other users in their company
DROP POLICY IF EXISTS "Users can view company users" ON public.users;
CREATE POLICY "Users can view company users" ON public.users
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Vendors: Company-scoped
DROP POLICY IF EXISTS "Company scoped vendors" ON public.vendors;
CREATE POLICY "Company scoped vendors" ON public.vendors
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Categories: Company-scoped
DROP POLICY IF EXISTS "Company scoped categories" ON public.categories;
CREATE POLICY "Company scoped categories" ON public.categories
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Bills: Company-scoped
DROP POLICY IF EXISTS "Company scoped bills" ON public.bills;
CREATE POLICY "Company scoped bills" ON public.bills
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Expenses: Company-scoped
DROP POLICY IF EXISTS "Company scoped expenses" ON public.expenses;
CREATE POLICY "Company scoped expenses" ON public.expenses
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Payment Methods: Company-scoped
DROP POLICY IF EXISTS "Company scoped payment methods" ON public.payment_methods;
CREATE POLICY "Company scoped payment methods" ON public.payment_methods
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Journal Entries: Company-scoped
DROP POLICY IF EXISTS "Company scoped journal entries" ON public.journal_entries;
CREATE POLICY "Company scoped journal entries" ON public.journal_entries
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Journal Lines: Access through journal entries
DROP POLICY IF EXISTS "Access through journal entries" ON public.journal_lines;
CREATE POLICY "Access through journal entries" ON public.journal_lines
  FOR ALL USING (
    journal_id IN (
      SELECT id FROM public.journal_entries
      WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON public.bills;
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Optional - Common Categories)
-- ============================================================================

-- You can uncomment this to seed default categories for new companies
-- INSERT INTO public.categories (company_id, name, description, is_system, sort_order)
-- SELECT
--   c.id,
--   unnest(ARRAY['Office Supplies', 'Travel', 'Marketing', 'Utilities', 'Rent', 'Software', 'Equipment', 'Meals & Entertainment']),
--   unnest(ARRAY['Office supplies and equipment', 'Business travel expenses', 'Marketing and advertising', 'Utilities and services', 'Rent and lease payments', 'Software subscriptions', 'Equipment purchases', 'Business meals and entertainment']),
--   true,
--   unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8])
-- FROM public.companies c
-- WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE company_id = c.id)
-- ON CONFLICT (company_id, name) DO NOTHING;

-- ============================================================================
-- GRANTS (Adjust based on your service role)
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
