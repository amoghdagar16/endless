# How to Apply Database Schema to Supabase

## ⚠️ IMPORTANT: Read Before Proceeding

This guide will help you apply the complete database schema to your Supabase project. Choose the appropriate method based on your situation:

- **Option A**: Fresh start (no existing data) - RECOMMENDED for development
- **Option B**: Preserve existing data (production) - More complex
- **Option C**: Incremental updates only - Safest for production

---

## 🔍 Pre-Flight Checklist

Before you begin:

- [ ] You have access to Supabase Dashboard
- [ ] You have SQL Editor access (Project Settings → Database → SQL Editor)
- [ ] You understand this will modify your database structure
- [ ] You have backed up important data (if any exists)

---

## 📊 OPTION A: Fresh Start (Recommended for Development)

**Use this if**: You're in development and don't have important data, OR you've just created a new Supabase project.

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Drop Existing Tables (DANGEROUS!)

**⚠️ WARNING: This deletes ALL data! Skip if you have important data.**

```sql
-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS public.expense_audit_log CASCADE;
DROP TABLE IF EXISTS public.journal_lines CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payroll CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.ai_logs CASCADE;
DROP TABLE IF EXISTS public.reports_cache CASCADE;
DROP TABLE IF EXISTS public.migrations_imports CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

### Step 3: Apply Complete Schema

1. Open the file: `database/schema.sql`
2. Copy the ENTIRE contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected result**: "Success. No rows returned"

### Step 4: Verify Schema

Run this query to check all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected tables** (should see 25+ tables):
- ai_logs
- bills
- budgets
- categories
- chart_of_accounts
- chat_sessions
- companies
- customers
- expense_audit_log
- expenses
- invoices
- journal_entries
- journal_lines
- migrations_imports
- payment_methods
- payments
- payroll
- reports_cache
- users
- vendors

### Step 5: Verify Indexes

```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected**: Should see indexes like:
- idx_categories_company_id
- idx_expenses_company_id
- idx_bills_company_id
- etc.

### Step 6: Verify RLS Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected policies**:
- "Users can view own company" on companies
- "Company scoped vendors" on vendors
- "Company scoped categories" on categories
- etc.

---

## 📦 OPTION B: Preserve Existing Data (Production)

**Use this if**: You have production data you need to keep.

### Step 1: Backup Existing Data

```sql
-- Export companies
COPY (SELECT * FROM public.companies) TO '/tmp/companies_backup.csv' CSV HEADER;

-- Export users
COPY (SELECT * FROM public.users) TO '/tmp/users_backup.csv' CSV HEADER;

-- Export vendors
COPY (SELECT * FROM public.vendors) TO '/tmp/vendors_backup.csv' CSV HEADER;

-- Export bills/expenses
COPY (SELECT * FROM public.bills) TO '/tmp/bills_backup.csv' CSV HEADER;

-- Save as JSON (alternative method)
SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM public.companies) t;
```

**Note**: Supabase SQL Editor doesn't support COPY TO file. Instead:
1. Run `SELECT * FROM table_name;`
2. Click **Export** → Download as CSV
3. Repeat for each important table

### Step 2: Document Current Schema

```sql
-- Get current table structures
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Save this output for reference.

### Step 3: Create Migration Script

Instead of dropping everything, create an incremental migration:

```sql
-- Add missing columns to existing tables
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id);

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_category_id UUID REFERENCES public.categories(id);

-- Create missing tables
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

CREATE TABLE IF NOT EXISTS public.expense_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'approved', 'rejected')),
  changed_by UUID REFERENCES public.users(id),
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON public.bills(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);

-- Add RLS policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company scoped categories" ON public.categories;
CREATE POLICY "Company scoped categories" ON public.categories
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company scoped bills" ON public.bills;
CREATE POLICY "Company scoped bills" ON public.bills
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );
```

### Step 4: Restore Data (if needed)

After applying migrations, restore data using Table Editor or:

```sql
-- Re-import using Supabase Dashboard → Table Editor → Insert rows
-- Or use SQL INSERT statements
```

---

## 🔧 OPTION C: Incremental Updates Only (Safest)

**Use this if**: You only want to add new features without touching existing data.

### Minimal Required Changes

Run ONLY these statements to support new features we built:

```sql
-- 1. Enhance categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Add receipt storage to bills
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_name TEXT;

-- 3. Create payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'bank_account', 'cash', 'check', 'paypal', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Add critical indexes
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON public.bills(company_id);

-- 5. Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company scoped categories" ON public.categories;
CREATE POLICY "Company scoped categories" ON public.categories
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- 6. Create unique constraint on categories
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_company_name_unique;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_company_name_unique UNIQUE(company_id, name);
```

---

## ✅ Post-Migration Verification

After applying schema changes, verify everything works:

### Test 1: Categories CRUD

```sql
-- Test category creation (replace with your actual company_id)
INSERT INTO public.categories (company_id, name, description, budget_amount)
VALUES ('YOUR_COMPANY_ID', 'Test Category', 'Test description', 500.00);

-- Verify it was created
SELECT * FROM public.categories WHERE name = 'Test Category';

-- Clean up
DELETE FROM public.categories WHERE name = 'Test Category';
```

### Test 2: Check RLS Policies

```sql
-- Should only return policies for your tables
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('companies', 'users', 'vendors', 'categories', 'bills');
```

### Test 3: Verify Indexes

```sql
-- Check if indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('categories', 'bills', 'expenses')
ORDER BY tablename;
```

### Test 4: Check Foreign Keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "relation already exists"

**Cause**: Table already exists
**Fix**: Use `CREATE TABLE IF NOT EXISTS` or skip creation

### Issue 2: "column already exists"

**Cause**: Column was already added
**Fix**: Use `ADD COLUMN IF NOT EXISTS`

### Issue 3: "constraint already exists"

**Fix**:
```sql
-- Drop constraint first
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;
-- Then add it
ALTER TABLE table_name ADD CONSTRAINT constraint_name ...;
```

### Issue 4: Foreign key violation

**Cause**: Trying to reference non-existent data
**Fix**: Create parent records first, or temporarily disable constraints:
```sql
ALTER TABLE table_name DISABLE TRIGGER ALL;
-- Your operations
ALTER TABLE table_name ENABLE TRIGGER ALL;
```

### Issue 5: RLS policy blocks operations

**Temporary fix** (development only):
```sql
-- Disable RLS temporarily
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Re-enable after testing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Issue 6: Permission denied

**Fix**: Run in SQL Editor (authenticated as service_role) or:
```sql
GRANT ALL ON table_name TO authenticated;
```

---

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs/guides/database
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🎯 Recommended Approach

**For Development**:
1. Use **Option A** (Fresh Start)
2. Test thoroughly
3. Seed test data

**For Production**:
1. Use **Option C** (Incremental Updates)
2. Test in staging first
3. Apply during low-traffic window
4. Have rollback plan ready

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Look for foreign key violations
3. Verify table/column names match exactly
4. Check RLS policies aren't blocking operations
5. Try running commands one at a time

**Next Steps**:
After applying schema → Update backend code → Test frontend → Deploy!
