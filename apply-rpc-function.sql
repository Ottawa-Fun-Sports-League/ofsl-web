-- Execute this SQL in the Supabase Dashboard SQL Editor
-- This creates the get_all_users_admin function that properly returns league_ids

-- Drop the function if it exists (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS get_all_users_admin() CASCADE;

-- Create the function
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  profile_id UUID,
  auth_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  is_admin BOOLEAN,
  is_facilitator BOOLEAN,
  date_created TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  auth_created_at TIMESTAMP WITH TIME ZONE,
  team_ids TEXT[],
  league_ids BIGINT[],  -- Include league_ids for individual registrations
  user_sports_skills JSONB,
  status TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  preferred_position TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access this function';
  END IF;

  RETURN QUERY
  WITH auth_users AS (
    -- Get all auth users
    SELECT 
      au.id as auth_id,
      au.email,
      au.email_confirmed_at,
      au.created_at as auth_created_at,
      au.last_sign_in_at
    FROM auth.users au
  ),
  user_profiles AS (
    -- Get all user profiles
    SELECT 
      u.id as profile_id,
      u.auth_id,
      u.name,
      u.email,
      u.phone,
      u.is_admin,
      u.is_facilitator,
      u.date_created,
      u.date_modified,
      u.team_ids,
      u.league_ids,  -- Include league_ids from users table
      u.user_sports_skills,
      u.preferred_position,
      u.profile_completed
    FROM users u
  )
  -- Combine auth users with their profiles (if they exist)
  SELECT 
    up.profile_id,
    au.auth_id,
    up.name,
    COALESCE(up.email, au.email) as email,
    up.phone,
    up.is_admin,
    up.is_facilitator,
    COALESCE(up.date_created, au.auth_created_at) as date_created,
    up.date_modified,
    au.auth_created_at,
    up.team_ids,
    up.league_ids,  -- Return league_ids
    up.user_sports_skills,
    CASE 
      WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NULL THEN 'unconfirmed'
      WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NOT NULL THEN 'confirmed_no_profile'
      WHEN up.profile_completed = false THEN 'profile_incomplete'
      ELSE 'active'
    END as status,
    au.email_confirmed_at as confirmed_at,
    au.last_sign_in_at,
    up.preferred_position
  FROM auth_users au
  LEFT JOIN user_profiles up ON au.auth_id = up.auth_id
  ORDER BY date_created DESC;
END;
$$;

-- Grant execute permission to authenticated users (function will check admin status internally)
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_all_users_admin() IS 'Admin function to retrieve all users including auth-only users with their profile data and league registrations';

-- Test the function exists and returns data
SELECT COUNT(*) as user_count FROM get_all_users_admin();