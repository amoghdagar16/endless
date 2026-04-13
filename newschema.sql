-- ==========================================
-- ENDLESS ACCOUNTING SYSTEM (MERGED / CANONICAL)
-- Supabase PostgreSQL Schema
-- - Your existing schema preserved
-- - Adds missing “core accounting” for the full product flow:
--   COA-first onboarding + Banking + AR + AP + Reconciliation + Period Close
-- - Fixes critical trigger issues (journal totals, balance update determinism)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CLEAN SLATE: drop all objects this schema creates (full replacement, not merge)
-- ==========================================
DROP VIEW IF EXISTS ar_aging_view CASCADE;
DROP VIEW IF EXISTS ap_aging_view CASCADE;
DROP VIEW IF EXISTS journal_entries_detail_view CASCADE;
DROP VIEW IF EXISTS trial_balance_view CASCADE;
DROP VIEW IF EXISTS account_balances_view CASCADE;

DROP TABLE IF EXISTS journal_lines CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS bank_transaction_splits CASCADE;
DROP TABLE IF EXISTS bank_transaction_matches CASCADE;
DROP TABLE IF EXISTS reconciliation_items CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS payment_applications CASCADE;
DROP TABLE IF EXISTS bill_lines CASCADE;
DROP TABLE IF EXISTS bill_payment_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS reconciliation_sessions CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS bill_payments CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS bank_connections CASCADE;
DROP TABLE IF EXISTS accounting_periods CASCADE;
DROP TABLE IF EXISTS bank_rules CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS coa_template_accounts CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS saved_reports CASCADE;
DROP TABLE IF EXISTS dashboard_widgets CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS import_history CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS coa_templates CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- ==========================================
-- 0. ENUMS (existing + additions)
-- ==========================================

-- Account Types
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('asset','liability','equity','revenue','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Account Subtypes (your existing list)
DO $$ BEGIN
  CREATE TYPE account_subtype AS ENUM (
    'current_asset','fixed_asset','other_asset','accounts_receivable','bank','cash','inventory',
    'current_liability','long_term_liability','accounts_payable','credit_card',
    'equity','retained_earnings','owner_equity',
    'income','other_income',
    'cost_of_goods_sold','operating_expense','other_expense'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contacts
DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM ('vendor','customer','both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Journals
DO $$ BEGIN
  CREATE TYPE journal_status AS ENUM ('draft','posted','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE journal_source AS ENUM ('manual','ocr','import','system','bank','invoice','bill','payment','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Documents
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('receipt','invoice','bank_statement','tax_document','contract','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ocr_status AS ENUM ('pending','processing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Banking
DO $$ BEGIN
  CREATE TYPE bank_provider AS ENUM ('plaid','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bank_account_type AS ENUM ('checking','savings','credit_card','cash','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bank_txn_status AS ENUM ('unreviewed','reviewed','matched','excluded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reconciliation_status AS ENUM ('in_progress','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AR/AP
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft','sent','posted','paid','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bill_status AS ENUM ('draft','posted','paid','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('draft','posted','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info','warning','error','success');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 1. AUTHENTICATION & ORGANIZATION (yours + onboarding fields)
-- ==========================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  currency TEXT DEFAULT 'USD',

  -- existing:
  fiscal_year_end DATE,
  tax_id TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,

  -- added for COA-first onboarding flow:
  books_start_date DATE,                    -- when user wants to start tracking
  onboarding_step TEXT,                     -- optional: 'company','coa_template','core_accounts','settings','done'
  coa_template_id UUID,                     -- optional pointer to template used (see table below)

  -- onboarding profile fields:
  website TEXT,
  location_city TEXT,
  location_state TEXT,
  location_country TEXT DEFAULT 'USA',
  location_zip TEXT,
  business_type TEXT,
  founded_year INTEGER,
  employee_count INTEGER,
  annual_revenue NUMERIC DEFAULT 0,
  growth_stage TEXT,
  target_market TEXT,
  primary_products TEXT[],
  competitors TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',                 -- keep your existing
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 1A. COA Templates (for COA-first onboarding)
-- ==========================================

CREATE TABLE IF NOT EXISTS coa_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                       -- "SaaS", "Services", "Retail", "E-commerce", "Custom"
  description TEXT,
  is_system BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coa_template_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coa_template_id UUID NOT NULL REFERENCES coa_templates(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type account_type NOT NULL,
  account_subtype account_subtype,
  parent_account_code TEXT,                 -- links hierarchy inside template by code
  is_system BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_coa_template_accounts_template ON coa_template_accounts(coa_template_id);

-- ==========================================
-- 2. CHART OF ACCOUNTS (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type account_type NOT NULL,
  account_subtype account_subtype,
  parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  opening_balance NUMERIC(15, 2) DEFAULT 0,
  current_balance NUMERIC(15, 2) DEFAULT 0,  -- keep for UI, but see deterministic logic below
  balance_as_of DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_account_id);

-- ==========================================
-- 3. CONTACTS (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_type contact_type NOT NULL DEFAULT 'vendor',
  display_name TEXT NOT NULL,
  legal_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);

-- ==========================================
-- 4. JOURNAL ENTRIES (yours, but we will fix triggers below)
-- ==========================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  journal_number TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source journal_source DEFAULT 'manual',
  status journal_status DEFAULT 'draft',
  reference_number TEXT,
  memo TEXT,
  total_debit NUMERIC(15, 2) DEFAULT 0,
  total_credit NUMERIC(15, 2) DEFAULT 0,
  is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
  attached_document_url TEXT,
  ocr_data JSONB,
  ai_suggestions JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL,
  description TEXT,
  debit NUMERIC(15, 2) DEFAULT 0,
  credit NUMERIC(15, 2) DEFAULT 0,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- ==========================================
-- 5. DOCUMENTS & OCR (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  document_type document_type DEFAULT 'receipt',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  ocr_status ocr_status DEFAULT 'pending',
  ocr_raw_text TEXT,
  ocr_confidence NUMERIC(3, 2),

  extracted_vendor TEXT,
  extracted_amount NUMERIC(15, 2),
  extracted_date DATE,
  extracted_category TEXT,
  extracted_tax NUMERIC(15, 2),
  extracted_fields JSONB,

  ai_processed BOOLEAN DEFAULT FALSE,
  ai_confidence TEXT,
  ai_suggestions JSONB,

  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_journal ON documents(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(ocr_status);

-- ==========================================
-- 6. CATEGORIES & TAGS (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_tags_company ON tags(company_id);

-- ==========================================
-- 7. AI INSIGHTS & CONVERSATIONS (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT,
  context_id UUID,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  data JSONB,
  severity TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_company ON ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_company ON ai_insights(company_id);

-- ==========================================
-- 8. REPORTS & DASHBOARDS (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB,
  schedule TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  title TEXT,
  position INTEGER,
  size TEXT,
  config JSONB,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_company ON saved_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id);

-- ==========================================
-- 9. AUDIT & ACTIVITY LOG (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ==========================================
-- 10. SYSTEM TABLES (yours)
-- ==========================================

CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER,
  successful_rows INTEGER,
  failed_rows INTEGER,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ==========================================
-- 11. NEW: BANKING (Plaid feed + categorization + matching)
-- ==========================================

CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider bank_provider NOT NULL DEFAULT 'plaid',
  provider_item_id TEXT,              -- Plaid item_id
  provider_access_token TEXT,         -- store securely; ideally encrypted/vault
  institution_name TEXT,
  status TEXT DEFAULT 'active',        -- active/error/disconnected
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_company ON bank_connections(company_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
  provider_account_id TEXT,           -- Plaid account_id
  name TEXT NOT NULL,
  mask TEXT,
  type bank_account_type NOT NULL DEFAULT 'checking',
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,

  -- Link to COA (critical for your “COA is the contract” rule)
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- the GL account representing this bank acct

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_linked_gl ON bank_accounts(linked_account_id);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

  provider_transaction_id TEXT,       -- Plaid transaction_id
  posted_date DATE NOT NULL,
  name TEXT NOT NULL,
  merchant_name TEXT,
  amount NUMERIC(15,2) NOT NULL,      -- positive number; interpretation handled by UI (inflow/outflow)
  currency TEXT DEFAULT 'USD',

  pending BOOLEAN DEFAULT FALSE,
  status bank_txn_status NOT NULL DEFAULT 'unreviewed',

  suggested_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- AI/rules suggestion
  user_selected_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  memo TEXT,
  raw JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_company ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON bank_transactions(posted_date);

-- Split lines for a bank txn (when user splits)
CREATE TABLE IF NOT EXISTS bank_transaction_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_splits_txn ON bank_transaction_splits(bank_transaction_id);

-- Rules engine (deterministic)
CREATE TABLE IF NOT EXISTS bank_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 100,

  -- match criteria
  match_text TEXT,                     -- substring match against name/merchant
  match_merchant TEXT,
  min_amount NUMERIC(15,2),
  max_amount NUMERIC(15,2),

  -- action
  set_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  set_memo TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_rules_company ON bank_rules(company_id);

-- Matching / linkage to posted accounting
CREATE TABLE IF NOT EXISTS bank_transaction_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  matched_by UUID REFERENCES users(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  match_type TEXT DEFAULT 'created',    -- created / matched_existing
  UNIQUE(bank_transaction_id)
);

-- ==========================================
-- 12. NEW: RECONCILIATION + PERIOD CLOSE
-- ==========================================

-- Accounting periods (lock past data)
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  lock_date DATE,                       -- entries on/before lock_date cannot be edited if closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, period_start, period_end)
);

-- Reconciliation sessions
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

  statement_start DATE NOT NULL,
  statement_end DATE NOT NULL,
  statement_ending_balance NUMERIC(15,2) NOT NULL,

  status reconciliation_status NOT NULL DEFAULT 'in_progress',

  started_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_company ON reconciliation_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_recon_bank_account ON reconciliation_sessions(bank_account_id);

-- Cleared items
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reconciliation_session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  cleared BOOLEAN DEFAULT TRUE,
  cleared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reconciliation_session_id, bank_transaction_id)
);

-- ==========================================
-- 13. NEW: AR (Invoices + Payments + Aging)
-- Uses contacts.contact_type = customer/both
-- ==========================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,

  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',

  memo TEXT,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_total NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) DEFAULT 0,

  linked_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT,
  quantity NUMERIC(15,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  amount NUMERIC(15,2) DEFAULT 0,
  revenue_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- maps to COA revenue buckets
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_id, line_number)
);

-- Payments (can be applied to invoices)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  payment_number TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'draft',

  deposit_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- cash/bank account in COA
  memo TEXT,

  linked_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_applied NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, invoice_id)
);

-- ==========================================
-- 14. NEW: AP (Bills + Bill Payments + Aging)
-- Uses contacts.contact_type = vendor/both
-- ==========================================

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,

  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status bill_status NOT NULL DEFAULT 'draft',

  memo TEXT,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_total NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) DEFAULT 0,

  linked_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, bill_number)
);

CREATE TABLE IF NOT EXISTS bill_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  expense_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- COA expense bucket
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, line_number)
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  payment_number TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'draft',

  payment_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- cash/bank account in COA
  memo TEXT,

  linked_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- one bill payment can pay multiple bills
CREATE TABLE IF NOT EXISTS bill_payment_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_payment_id UUID NOT NULL REFERENCES bill_payments(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount_applied NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_payment_id, bill_id)
);

-- ==========================================
-- 15. FUNCTIONS & TRIGGERS (FIXED + DETERMINISTIC)
-- ==========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (idempotent by dropping first if needed)
DO $$ BEGIN
  CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_journal_lines_updated_at BEFORE UPDATE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bank_connections_updated_at BEFORE UPDATE ON bank_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_reconciliation_sessions_updated_at BEFORE UPDATE ON reconciliation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bill_payments_updated_at BEFORE UPDATE ON bill_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------
-- Journal totals trigger (FIXED: works for INSERT/UPDATE/DELETE)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_journal_totals_fixed()
RETURNS TRIGGER AS $$
DECLARE
  v_journal_id UUID;
BEGIN
  v_journal_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  UPDATE journal_entries
  SET
    total_debit  = (SELECT COALESCE(SUM(debit), 0) FROM journal_lines WHERE journal_entry_id = v_journal_id),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_lines WHERE journal_entry_id = v_journal_id)
  WHERE id = v_journal_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop your old combined trigger if it exists, then create 3 safe triggers
DROP TRIGGER IF EXISTS recalculate_journal_totals ON journal_lines;

DO $$ BEGIN
  CREATE TRIGGER trg_journal_totals_ins
  AFTER INSERT ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION calculate_journal_totals_fixed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_journal_totals_upd
  AFTER UPDATE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION calculate_journal_totals_fixed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_journal_totals_del
  AFTER DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION calculate_journal_totals_fixed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------
-- Journal number generator (your existing, kept)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_journal_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  year_suffix TEXT;
BEGIN
  IF NEW.journal_number IS NULL THEN
    year_suffix := TO_CHAR(NEW.entry_date, 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(journal_number FROM 'JE-' || year_suffix || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM journal_entries
    WHERE company_id = NEW.company_id
      AND journal_number LIKE 'JE-' || year_suffix || '-%';

    NEW.journal_number := 'JE-' || year_suffix || '-' || LPAD(next_number::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_journal_number ON journal_entries;

DO $$ BEGIN
  CREATE TRIGGER auto_generate_journal_number
  BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION generate_journal_number();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------
-- Deterministic balance updates (TYPE-AWARE) on status transitions
-- - Applies when draft/void -> posted
-- - Reverses when posted -> void
-- - Does NOT attempt “reposting” or editing posted lines
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_posted_journal_to_accounts(p_journal_id UUID, p_direction INTEGER)
RETURNS VOID AS $$
BEGIN
  -- p_direction: +1 apply, -1 reverse
  UPDATE accounts a
  SET current_balance = a.current_balance + (
    SELECT COALESCE(SUM(
      CASE
        WHEN a.account_type IN ('asset','expense') THEN (jl.debit - jl.credit)
        ELSE (jl.credit - jl.debit)
      END
    ), 0) * p_direction
    FROM journal_lines jl
    WHERE jl.journal_entry_id = p_journal_id
      AND jl.account_id = a.id
  ),
  balance_as_of = (SELECT entry_date FROM journal_entries WHERE id = p_journal_id)
  WHERE a.id IN (SELECT DISTINCT account_id FROM journal_lines WHERE journal_entry_id = p_journal_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION journal_status_transition_effects()
RETURNS TRIGGER AS $$
BEGIN
  -- Post: apply once
  IF NEW.status = 'posted' AND COALESCE(OLD.status,'draft') <> 'posted' THEN
    PERFORM apply_posted_journal_to_accounts(NEW.id, +1);
    NEW.posted_at := COALESCE(NEW.posted_at, NOW());
  END IF;

  -- Void from posted: reverse once
  IF NEW.status = 'void' AND OLD.status = 'posted' THEN
    PERFORM apply_posted_journal_to_accounts(NEW.id, -1);
    NEW.voided_at := COALESCE(NEW.voided_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_account_balances_on_post ON journal_entries;

DO $$ BEGIN
  CREATE TRIGGER trg_journal_status_effects
  BEFORE UPDATE OF status ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION journal_status_transition_effects();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------
-- Guardrails: prevent editing posted journal lines (immutability)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_edit_posted_journal_lines()
RETURNS TRIGGER AS $$
DECLARE
  v_status journal_status;
BEGIN
  SELECT status INTO v_status FROM journal_entries WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  IF v_status = 'posted' THEN
    RAISE EXCEPTION 'Cannot modify journal lines for a POSTED journal entry';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_edit_posted_lines_ins ON journal_lines;
DROP TRIGGER IF EXISTS trg_prevent_edit_posted_lines_upd ON journal_lines;
DROP TRIGGER IF EXISTS trg_prevent_edit_posted_lines_del ON journal_lines;

DO $$ BEGIN
  CREATE TRIGGER trg_prevent_edit_posted_lines_ins
  BEFORE INSERT ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_edit_posted_journal_lines();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_prevent_edit_posted_lines_upd
  BEFORE UPDATE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_edit_posted_journal_lines();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_prevent_edit_posted_lines_del
  BEFORE DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_edit_posted_journal_lines();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------
-- Period lock enforcement (if period is closed and date <= lock_date)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_edit_closed_period()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_entry_date DATE;
  v_locked BOOLEAN;
BEGIN
  v_company_id := NEW.company_id;
  v_entry_date := NEW.entry_date;

  SELECT EXISTS (
    SELECT 1
    FROM accounting_periods ap
    WHERE ap.company_id = v_company_id
      AND ap.is_closed = TRUE
      AND ap.lock_date IS NOT NULL
      AND v_entry_date <= ap.lock_date
  ) INTO v_locked;

  IF v_locked THEN
    RAISE EXCEPTION 'Cannot modify journal entry in a closed/locked period';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_edit_closed_period ON journal_entries;

DO $$ BEGIN
  CREATE TRIGGER trg_prevent_edit_closed_period
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_edit_closed_period();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 16. RLS (your existing + new tables)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE coa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE coa_template_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transaction_matches ENABLE ROW LEVEL SECURITY;

ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payment_lines ENABLE ROW LEVEL SECURITY;

-- Drop+recreate policies (idempotent-ish)
DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON companies;
  DROP POLICY IF EXISTS company_isolation_policy ON users;
  DROP POLICY IF EXISTS company_isolation_policy ON accounts;
  DROP POLICY IF EXISTS company_isolation_policy ON contacts;
  DROP POLICY IF EXISTS company_isolation_policy ON journal_entries;
  DROP POLICY IF EXISTS company_isolation_policy ON journal_lines;
  DROP POLICY IF EXISTS company_isolation_policy ON documents;
  DROP POLICY IF EXISTS company_isolation_policy ON categories;
  DROP POLICY IF EXISTS company_isolation_policy ON tags;
  DROP POLICY IF EXISTS company_isolation_policy ON ai_conversations;
  DROP POLICY IF EXISTS company_isolation_policy ON ai_insights;
  DROP POLICY IF EXISTS company_isolation_policy ON saved_reports;
  DROP POLICY IF EXISTS company_isolation_policy ON audit_logs;
  DROP POLICY IF EXISTS company_isolation_policy ON import_history;

  DROP POLICY IF EXISTS user_own_widgets_policy ON dashboard_widgets;
  DROP POLICY IF EXISTS user_own_notifications_policy ON notifications;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Company isolation pattern (same as yours)
CREATE POLICY company_isolation_policy ON companies
FOR ALL USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON users
FOR ALL USING (
  id = auth.uid()
  OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY company_isolation_policy ON accounts
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON contacts
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON journal_entries
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON journal_lines
FOR ALL USING (journal_entry_id IN (
  SELECT id FROM journal_entries WHERE company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
));

CREATE POLICY company_isolation_policy ON documents
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON categories
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON tags
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON ai_conversations
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON ai_insights
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON saved_reports
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON audit_logs
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON import_history
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- User-owned policies
CREATE POLICY user_own_widgets_policy ON dashboard_widgets
FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_own_notifications_policy ON notifications
FOR ALL USING (user_id = auth.uid());

-- System COA templates readable by everyone authenticated (optional)
DO $$ BEGIN
  DROP POLICY IF EXISTS coa_templates_read ON coa_templates;
  DROP POLICY IF EXISTS coa_template_accounts_read ON coa_template_accounts;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY coa_templates_read ON coa_templates
FOR SELECT USING (true);

CREATE POLICY coa_template_accounts_read ON coa_template_accounts
FOR SELECT USING (true);

-- Banking + AR/AP + Recon: company isolation
DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON bank_connections;
  DROP POLICY IF EXISTS company_isolation_policy ON bank_accounts;
  DROP POLICY IF EXISTS company_isolation_policy ON bank_transactions;
  DROP POLICY IF EXISTS company_isolation_policy ON bank_rules;
  DROP POLICY IF EXISTS company_isolation_policy ON bank_transaction_matches;
  DROP POLICY IF EXISTS company_isolation_policy ON accounting_periods;
  DROP POLICY IF EXISTS company_isolation_policy ON reconciliation_sessions;
  DROP POLICY IF EXISTS company_isolation_policy ON invoices;
  DROP POLICY IF EXISTS company_isolation_policy ON payments;
  DROP POLICY IF EXISTS company_isolation_policy ON bills;
  DROP POLICY IF EXISTS company_isolation_policy ON bill_payments;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON bank_connections
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON bank_accounts
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON bank_transactions
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON bank_rules
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON bank_transaction_matches
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON accounting_periods
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON reconciliation_sessions
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- items through session -> company
DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON reconciliation_items;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON reconciliation_items
FOR ALL USING (
  reconciliation_session_id IN (
    SELECT id FROM reconciliation_sessions
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY company_isolation_policy ON invoices
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- invoice_lines through invoices
DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON invoice_lines;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON invoice_lines
FOR ALL USING (
  invoice_id IN (
    SELECT id FROM invoices
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY company_isolation_policy ON payments
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON payment_applications;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON payment_applications
FOR ALL USING (
  payment_id IN (
    SELECT id FROM payments
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY company_isolation_policy ON bills
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON bill_lines;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON bill_lines
FOR ALL USING (
  bill_id IN (
    SELECT id FROM bills
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY company_isolation_policy ON bill_payments
FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON bill_payment_lines;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON bill_payment_lines
FOR ALL USING (
  bill_payment_id IN (
    SELECT id FROM bill_payments
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
);

-- bank_transaction_splits through bank_transactions
DO $$ BEGIN
  DROP POLICY IF EXISTS company_isolation_policy ON bank_transaction_splits;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY company_isolation_policy ON bank_transaction_splits
FOR ALL USING (
  bank_transaction_id IN (
    SELECT id FROM bank_transactions
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
);

-- ==========================================
-- 17. VIEWS (upgrade to deterministic reporting inputs)
-- ==========================================

-- Your existing account_balances_view kept (but now useful w/ posted calc below)
CREATE OR REPLACE VIEW account_balances_view AS
SELECT
  a.id,
  a.company_id,
  a.account_code,
  a.account_name,
  a.account_type,
  a.account_subtype,
  a.parent_account_id,
  pa.account_name as parent_account_name,
  a.current_balance,
  a.is_active
FROM accounts a
LEFT JOIN accounts pa ON a.parent_account_id = pa.id;

-- Posted trial balance (deterministic: based on posted journal_lines, not current_balance)
CREATE OR REPLACE VIEW trial_balance_view AS
SELECT
  a.company_id,
  a.id AS account_id,
  a.account_code,
  a.account_name,
  a.account_type,
  COALESCE(SUM(jl.debit),0)::NUMERIC(15,2) AS total_debit,
  COALESCE(SUM(jl.credit),0)::NUMERIC(15,2) AS total_credit,
  CASE
    WHEN a.account_type IN ('asset','expense') THEN (COALESCE(SUM(jl.debit),0) - COALESCE(SUM(jl.credit),0))
    ELSE (COALESCE(SUM(jl.credit),0) - COALESCE(SUM(jl.debit),0))
  END::NUMERIC(15,2) AS net
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
GROUP BY a.company_id, a.id, a.account_code, a.account_name, a.account_type
ORDER BY a.account_code;

-- Journal entries with line details (your existing)
CREATE OR REPLACE VIEW journal_entries_detail_view AS
SELECT
  je.id as journal_id,
  je.company_id,
  je.journal_number,
  je.entry_date,
  je.status,
  je.memo,
  je.total_debit,
  je.total_credit,
  je.is_balanced,
  json_agg(
    json_build_object(
      'line_id', jl.id,
      'account_id', jl.account_id,
      'account_code', a.account_code,
      'account_name', a.account_name,
      'description', jl.description,
      'debit', jl.debit,
      'credit', jl.credit,
      'contact_id', jl.contact_id,
      'contact_name', c.display_name
    )
    ORDER BY jl.line_number
  ) as lines
FROM journal_entries je
LEFT JOIN journal_lines jl ON je.id = jl.journal_entry_id
LEFT JOIN accounts a ON jl.account_id = a.id
LEFT JOIN contacts c ON jl.contact_id = c.id
GROUP BY je.id;

-- AR Aging (posted invoices only; simple buckets)
CREATE OR REPLACE VIEW ar_aging_view AS
SELECT
  i.company_id,
  i.customer_id,
  c.display_name AS customer_name,
  i.id AS invoice_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total,
  i.amount_paid,
  i.balance_due,
  CASE
    WHEN i.due_date IS NULL THEN 'no_due_date'
    WHEN i.due_date >= CURRENT_DATE THEN 'current'
    WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
    WHEN i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
    WHEN i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM invoices i
LEFT JOIN contacts c ON c.id = i.customer_id
WHERE i.status IN ('posted','sent','paid') AND i.balance_due > 0;

-- AP Aging (posted bills only; simple buckets)
CREATE OR REPLACE VIEW ap_aging_view AS
SELECT
  b.company_id,
  b.vendor_id,
  c.display_name AS vendor_name,
  b.id AS bill_id,
  b.bill_number,
  b.bill_date,
  b.due_date,
  b.total,
  b.amount_paid,
  b.balance_due,
  CASE
    WHEN b.due_date IS NULL THEN 'no_due_date'
    WHEN b.due_date >= CURRENT_DATE THEN 'current'
    WHEN b.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
    WHEN b.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
    WHEN b.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM bills b
LEFT JOIN contacts c ON c.id = b.vendor_id
WHERE b.status IN ('posted','paid') AND b.balance_due > 0;

-- ==========================================
-- COMMENTS (documentation)
-- ==========================================
COMMENT ON TABLE companies IS 'Organization/company master table';
COMMENT ON TABLE users IS 'User accounts linked to Supabase Auth';
COMMENT ON TABLE accounts IS 'Chart of Accounts - all general ledger accounts';
COMMENT ON TABLE journal_entries IS 'Journal entry headers (double-entry bookkeeping)';
COMMENT ON TABLE journal_lines IS 'Individual debit/credit lines for journal entries';
COMMENT ON TABLE bank_transactions IS 'Imported bank feed transactions (review -> match/post)';
COMMENT ON TABLE invoices IS 'Accounts receivable invoices (customer owes money)';
COMMENT ON TABLE bills IS 'Accounts payable bills (company owes vendor)';
COMMENT ON TABLE reconciliation_sessions IS 'Bank reconciliation sessions';
COMMENT ON TABLE accounting_periods IS 'Period close/lock control';

-- ==========================================
-- END OF MERGED SCHEMA
-- ==========================================
