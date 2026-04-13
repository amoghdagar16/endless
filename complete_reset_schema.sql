-- ============================================
-- COMPLETE DATABASE RESET AND SETUP
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- First, disable RLS on all tables to clean up
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_conversations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Allow signup to create user record" ON users;
DROP POLICY IF EXISTS "Users can read company members" ON users;

DROP POLICY IF EXISTS "Companies are viewable by users in the company" ON companies;
DROP POLICY IF EXISTS "Companies are editable by admins" ON companies;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON companies;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON companies;

-- ============================================
-- USERS TABLE - Simple, no recursion policies
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to read their own record using auth.uid()
CREATE POLICY "users_select_own"
ON users FOR SELECT
USING (id = auth.uid());

-- Policy 2: Allow users to insert their own record during signup
CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (id = auth.uid());

-- Policy 3: Allow users to update their own record
CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 4: Allow users to delete their own record
CREATE POLICY "users_delete_own"
ON users FOR DELETE
USING (id = auth.uid());

-- ============================================
-- COMPANIES TABLE - Simple policies
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read any company (you can restrict this later)
CREATE POLICY "companies_select_all"
ON companies FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert companies
CREATE POLICY "companies_insert_authenticated"
ON companies FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update companies (you can add company_id checks later)
CREATE POLICY "companies_update_all"
ON companies FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- ACCOUNTS TABLE - Company-based access
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Allow users to read accounts (no user table lookup needed)
CREATE POLICY "accounts_select_all"
ON accounts FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert accounts
CREATE POLICY "accounts_insert_authenticated"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update accounts
CREATE POLICY "accounts_update_authenticated"
ON accounts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow users to delete accounts
CREATE POLICY "accounts_delete_authenticated"
ON accounts FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- JOURNAL ENTRIES TABLE
-- ============================================

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_select_all"
ON journal_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "journal_entries_insert_authenticated"
ON journal_entries FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "journal_entries_update_authenticated"
ON journal_entries FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "journal_entries_delete_authenticated"
ON journal_entries FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- JOURNAL LINES TABLE
-- ============================================

ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_lines_select_all"
ON journal_lines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "journal_lines_insert_authenticated"
ON journal_lines FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "journal_lines_update_authenticated"
ON journal_lines FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "journal_lines_delete_authenticated"
ON journal_lines FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- CONTACTS TABLE
-- ============================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_all"
ON contacts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "contacts_insert_authenticated"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "contacts_update_authenticated"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "contacts_delete_authenticated"
ON contacts FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_all"
ON documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "documents_insert_authenticated"
ON documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "documents_update_authenticated"
ON documents FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "documents_delete_authenticated"
ON documents FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- AI INSIGHTS TABLE
-- ============================================

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_select_all"
ON ai_insights FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ai_insights_insert_authenticated"
ON ai_insights FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "ai_insights_update_authenticated"
ON ai_insights FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "ai_insights_delete_authenticated"
ON ai_insights FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- AI CONVERSATIONS TABLE
-- ============================================

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_select_all"
ON ai_conversations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ai_conversations_insert_authenticated"
ON ai_conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "ai_conversations_update_authenticated"
ON ai_conversations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "ai_conversations_delete_authenticated"
ON ai_conversations FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify that RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'companies', 'accounts', 'journal_entries', 'journal_lines', 'contacts', 'documents', 'ai_insights', 'ai_conversations')
ORDER BY tablename;

-- Count policies on each table
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
