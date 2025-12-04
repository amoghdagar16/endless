-- ==========================================
-- ENDLESS ACCOUNTING SYSTEM
-- Comprehensive Supabase PostgreSQL Schema
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. AUTHENTICATION & ORGANIZATION
-- ==========================================

-- Companies/Organizations
CREATE TABLE companies (
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
    fiscal_year_end DATE,
    tax_id TEXT, -- EIN or tax identification number
    logo_url TEXT,
    settings JSONB DEFAULT '{}', -- Company-specific settings
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin', 'accountant', 'user', 'viewer'
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}', -- User preferences like theme, notifications
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CHART OF ACCOUNTS (COA)
-- ==========================================

-- Account Types: Asset, Liability, Equity, Revenue, Expense
CREATE TYPE account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);

-- Account Sub-Types for better classification
CREATE TYPE account_subtype AS ENUM (
    -- Assets
    'current_asset',
    'fixed_asset',
    'other_asset',
    'accounts_receivable',
    'bank',
    'cash',
    'inventory',

    -- Liabilities
    'current_liability',
    'long_term_liability',
    'accounts_payable',
    'credit_card',

    -- Equity
    'equity',
    'retained_earnings',
    'owner_equity',

    -- Revenue
    'income',
    'other_income',

    -- Expenses
    'cost_of_goods_sold',
    'operating_expense',
    'other_expense'
);

-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL, -- e.g., "1000", "4000"
    account_name TEXT NOT NULL, -- e.g., "Cash", "Sales Revenue"
    account_type account_type NOT NULL,
    account_subtype account_subtype,
    parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- For hierarchical COA
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System accounts that can't be deleted
    opening_balance NUMERIC(15, 2) DEFAULT 0,
    current_balance NUMERIC(15, 2) DEFAULT 0, -- Updated automatically from journal entries
    balance_as_of DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, account_code)
);

-- Create index for faster lookups
CREATE INDEX idx_accounts_company ON accounts(company_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);

-- ==========================================
-- 3. CONTACTS (Vendors, Customers)
-- ==========================================

CREATE TYPE contact_type AS ENUM ('vendor', 'customer', 'both');

CREATE TABLE contacts (
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

CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_type ON contacts(contact_type);

-- ==========================================
-- 4. JOURNAL ENTRIES (Core Accounting)
-- ==========================================

CREATE TYPE journal_status AS ENUM ('draft', 'posted', 'void');
CREATE TYPE journal_source AS ENUM ('manual', 'ocr', 'import', 'system');

-- Journal Entry Header
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    journal_number TEXT, -- Auto-generated: JE-2024-0001
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source journal_source DEFAULT 'manual',
    status journal_status DEFAULT 'draft',
    reference_number TEXT, -- Invoice #, Receipt #, etc.
    memo TEXT,
    total_debit NUMERIC(15, 2) DEFAULT 0,
    total_credit NUMERIC(15, 2) DEFAULT 0,
    is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
    attached_document_url TEXT, -- Receipt/invoice image URL
    ocr_data JSONB, -- Raw OCR extraction data
    ai_suggestions JSONB, -- AI-generated suggestions
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    posted_at TIMESTAMPTZ,
    voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entry Lines (Debit/Credit)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Optional: link to vendor/customer
    line_number INTEGER NOT NULL, -- Order of lines
    description TEXT,
    debit NUMERIC(15, 2) DEFAULT 0,
    credit NUMERIC(15, 2) DEFAULT 0,
    tags TEXT[], -- For categorization
    metadata JSONB DEFAULT '{}', -- Additional data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0)) -- Line can't have both debit and credit
);

CREATE INDEX idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_lines_journal ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);

-- ==========================================
-- 5. DOCUMENTS & OCR
-- ==========================================

CREATE TYPE document_type AS ENUM (
    'receipt',
    'invoice',
    'bank_statement',
    'tax_document',
    'contract',
    'other'
);

CREATE TYPE ocr_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    document_type document_type DEFAULT 'receipt',
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Supabase Storage URL
    file_size INTEGER, -- bytes
    mime_type TEXT,

    -- OCR Processing
    ocr_status ocr_status DEFAULT 'pending',
    ocr_raw_text TEXT, -- Raw OCR output
    ocr_confidence NUMERIC(3, 2), -- 0.00 to 1.00

    -- Extracted Fields
    extracted_vendor TEXT,
    extracted_amount NUMERIC(15, 2),
    extracted_date DATE,
    extracted_category TEXT,
    extracted_tax NUMERIC(15, 2),
    extracted_fields JSONB, -- Additional extracted data

    -- AI Enhancement
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_confidence TEXT, -- 'high', 'medium', 'low'
    ai_suggestions JSONB,

    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_journal ON documents(journal_entry_id);
CREATE INDEX idx_documents_status ON documents(ocr_status);

-- ==========================================
-- 6. CATEGORIES & TAGS
-- ==========================================

-- Predefined expense categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Hex color for UI
    icon TEXT, -- Icon name/class
    parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT FALSE, -- System categories can't be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Tags for flexible organization
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX idx_categories_company ON categories(company_id);
CREATE INDEX idx_tags_company ON tags(company_id);

-- ==========================================
-- 7. AI INSIGHTS & CONVERSATIONS
-- ==========================================

CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT, -- Auto-generated from first message
    context_type TEXT, -- 'general', 'journal', 'account', 'report'
    context_id UUID, -- ID of related entity
    messages JSONB NOT NULL DEFAULT '[]', -- Array of {role, content, timestamp}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated insights
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'prediction', 'anomaly', 'recommendation', 'summary'
    title TEXT NOT NULL,
    description TEXT,
    data JSONB, -- Supporting data
    severity TEXT, -- 'info', 'warning', 'critical'
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_company ON ai_conversations(company_id);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_insights_company ON ai_insights(company_id);

-- ==========================================
-- 8. REPORTS & DASHBOARDS
-- ==========================================

-- Saved custom reports
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL, -- 'balance_sheet', 'income_statement', 'cash_flow', 'custom'
    name TEXT NOT NULL,
    description TEXT,
    filters JSONB, -- Date ranges, accounts, etc.
    schedule TEXT, -- 'daily', 'weekly', 'monthly' for automated reports
    is_favorite BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard widgets configuration
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL, -- 'kpi', 'chart', 'recent_transactions', 'ai_summary'
    title TEXT,
    position INTEGER,
    size TEXT, -- 'small', 'medium', 'large'
    config JSONB, -- Widget-specific configuration
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_company ON saved_reports(company_id);
CREATE INDEX idx_dashboard_widgets_user ON dashboard_widgets(user_id);

-- ==========================================
-- 9. AUDIT & ACTIVITY LOG
-- ==========================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'post', 'void'
    entity_type TEXT NOT NULL, -- 'journal_entry', 'account', 'contact', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ==========================================
-- 10. SYSTEM TABLES
-- ==========================================

-- Import history (for CSV uploads)
CREATE TABLE import_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL, -- 'coa', 'transactions', 'contacts'
    file_name TEXT NOT NULL,
    total_rows INTEGER,
    successful_rows INTEGER,
    failed_rows INTEGER,
    errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_lines_updated_at BEFORE UPDATE ON journal_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate journal entry totals
CREATE OR REPLACE FUNCTION calculate_journal_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE journal_entries
    SET
        total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_lines WHERE journal_entry_id = NEW.journal_entry_id),
        total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_lines WHERE journal_entry_id = NEW.journal_entry_id)
    WHERE id = NEW.journal_entry_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_journal_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION calculate_journal_totals();

-- Update account balances when journal is posted
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
        -- Update all affected account balances
        UPDATE accounts a
        SET current_balance = current_balance + COALESCE(
            (SELECT SUM(debit - credit)
             FROM journal_lines jl
             WHERE jl.account_id = a.id
               AND jl.journal_entry_id = NEW.id),
            0
        ),
        balance_as_of = NEW.entry_date
        WHERE a.id IN (
            SELECT DISTINCT account_id
            FROM journal_lines
            WHERE journal_entry_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_balances_on_post
AFTER UPDATE ON journal_entries
FOR EACH ROW
WHEN (NEW.status = 'posted')
EXECUTE FUNCTION update_account_balance();

-- Auto-generate journal numbers
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

CREATE TRIGGER auto_generate_journal_number
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION generate_journal_number();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
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

-- Policy: Users can only access data from their company
CREATE POLICY company_isolation_policy ON companies
    FOR ALL USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY company_isolation_policy ON users
    FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

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

-- User-specific policies
CREATE POLICY user_own_widgets_policy ON dashboard_widgets
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_own_notifications_policy ON notifications
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- SEED DATA: DEFAULT CHART OF ACCOUNTS
-- ==========================================

-- This will be populated via migration or first-time setup
-- Example structure (US GAAP):

/*
ASSETS (1000-1999)
├── Current Assets (1000-1499)
│   ├── Cash and Cash Equivalents (1000-1099)
│   ├── Accounts Receivable (1100-1199)
│   └── Inventory (1200-1299)
└── Fixed Assets (1500-1899)
    ├── Property, Plant & Equipment (1500-1699)
    └── Accumulated Depreciation (1700-1799)

LIABILITIES (2000-2999)
├── Current Liabilities (2000-2499)
│   ├── Accounts Payable (2000-2099)
│   └── Short-term Debt (2100-2199)
└── Long-term Liabilities (2500-2899)

EQUITY (3000-3999)
├── Owner's Equity (3000-3099)
└── Retained Earnings (3100-3199)

REVENUE (4000-4999)
├── Sales Revenue (4000-4499)
└── Other Income (4500-4999)

EXPENSES (5000-9999)
├── Cost of Goods Sold (5000-5999)
└── Operating Expenses (6000-8999)
    ├── Payroll (6000-6499)
    ├── Rent (6500-6599)
    ├── Utilities (6600-6699)
    └── Marketing (7000-7499)
*/

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Account balances with hierarchy
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

-- Journal entries with line details
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

-- Trial Balance
CREATE OR REPLACE VIEW trial_balance_view AS
SELECT
    company_id,
    account_code,
    account_name,
    account_type,
    SUM(CASE WHEN account_type IN ('asset', 'expense') THEN current_balance ELSE 0 END) as debit_balance,
    SUM(CASE WHEN account_type IN ('liability', 'equity', 'revenue') THEN current_balance ELSE 0 END) as credit_balance
FROM accounts
WHERE is_active = TRUE
GROUP BY company_id, account_code, account_name, account_type
ORDER BY account_code;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE companies IS 'Organization/company master table';
COMMENT ON TABLE users IS 'User accounts linked to Supabase Auth';
COMMENT ON TABLE accounts IS 'Chart of Accounts - all general ledger accounts';
COMMENT ON TABLE journal_entries IS 'Journal entry headers (double-entry bookkeeping)';
COMMENT ON TABLE journal_lines IS 'Individual debit/credit lines for journal entries';
COMMENT ON TABLE documents IS 'Uploaded documents with OCR extraction data';
COMMENT ON TABLE contacts IS 'Vendors and customers';
COMMENT ON TABLE ai_conversations IS 'AI chat history per user';
COMMENT ON TABLE ai_insights IS 'AI-generated financial insights and recommendations';

-- ==========================================
-- END OF SCHEMA
-- ==========================================
