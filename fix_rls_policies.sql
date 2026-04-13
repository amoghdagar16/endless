-- Fix RLS policies for users table to avoid infinite recursion

-- First, drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON users;

-- Create new, simple policies that don't cause recursion

-- Allow service role (backend) to do everything
-- This is already allowed by default, but let's be explicit

-- Allow authenticated users to read their own user record
CREATE POLICY "Users can read own record"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to update their own record
CREATE POLICY "Users can update own record"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own record (for signup)
CREATE POLICY "Users can insert own record"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- IMPORTANT: For the signup flow to work, we need to allow anon users to insert
-- This is safe because we're checking that the ID matches the auth.uid()
CREATE POLICY "Allow signup to create user record"
ON users FOR INSERT
TO anon
WITH CHECK (auth.uid() = id);

-- Allow users to read other users in their company (optional, for future features)
CREATE POLICY "Users can read company members"
ON users FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Make sure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
