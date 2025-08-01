/*
  # Fix Critical Users Table RLS Policy Vulnerability

  This migration fixes critical security vulnerabilities in the users table RLS policies
  that allow unauthorized access to user data.

  ## Critical Issues Fixed:
  1. "Enable read access for all users" policy allows ANY user to read ALL user data
  2. "Users can update their own data" policy allows ANY authenticated user to modify ANY user
  3. Missing proper auth_id-based access controls

  ## Security Impact:
  - Data leak: Users can see other users' personal information
  - Data corruption: Users can modify other users' profiles
  - Privacy violation: Unauthorized access to emails, phones, names

  ## Changes:
  1. Drop all existing insecure policies
  2. Add secure policies that restrict access to own data only
  3. Maintain admin access for administrative functions
*/

-- Drop all existing insecure policies on users table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert a new user" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create secure SELECT policy - users can only read their own data
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

-- Create secure INSERT policy - users can only create their own profile
CREATE POLICY "Users can create own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth_id = auth.uid());

-- Create secure UPDATE policy - users can only update their own data
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- Create admin override policies for administrative access
CREATE POLICY "Admins can read all users"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND is_admin = true
  )
);

-- Create system access policy for functions that need to access users table
-- This allows SECURITY DEFINER functions to access the table
CREATE POLICY "System functions can access users"
ON public.users
FOR ALL
TO authenticated
USING (
  -- Only allow if called from within a SECURITY DEFINER function
  -- or if the user is accessing their own data
  auth_id = auth.uid() OR 
  current_setting('role', true) = 'postgres'
);

-- Add comment explaining the security fix
COMMENT ON TABLE public.users IS 'Users table with secure RLS policies - users can only access their own data, admins have full access';