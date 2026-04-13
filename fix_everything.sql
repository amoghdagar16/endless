-- ============================================
-- COMPLETE FIX FOR ACCOUNTS AND RLS
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Disable RLS temporarily
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_conversations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname
              FROM pg_policies
              WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 3: Create simple RLS policies

-- USERS TABLE
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
ON users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_delete_own"
ON users FOR DELETE
USING (id = auth.uid());

-- COMPANIES TABLE
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_all_authenticated"
ON companies FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ACCOUNTS TABLE
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_all_authenticated"
ON accounts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- JOURNAL ENTRIES TABLE
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_all_authenticated"
ON journal_entries FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- JOURNAL LINES TABLE
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_lines_all_authenticated"
ON journal_lines FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CONTACTS TABLE
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_all_authenticated"
ON contacts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- DOCUMENTS TABLE
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_all_authenticated"
ON documents FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- AI INSIGHTS TABLE
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_all_authenticated"
ON ai_insights FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- AI CONVERSATIONS TABLE
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_all_authenticated"
ON ai_conversations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 4: Verify RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'companies', 'accounts', 'journal_entries', 'journal_lines', 'contacts', 'documents', 'ai_insights', 'ai_conversations')
ORDER BY tablename;

-- Step 5: Count policies
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
