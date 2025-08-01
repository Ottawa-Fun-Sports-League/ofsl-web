/*
  # Fix Google Sign-in User Creation

  1. Changes
    - Create a function to handle user profile creation for Google sign-ins
    - Improve metadata extraction for different authentication providers
    - Add better error handling and logging
    - Use a different approach that doesn't require direct auth.users access

  2. Security
    - No changes to existing RLS policies
*/

-- Create a function to create or update a user profile
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
  p_id TEXT,
  p_auth_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Check if user already exists by auth_id
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = p_auth_id) THEN
    -- Update existing user
    UPDATE public.users
    SET 
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      date_modified = now_timestamp
    WHERE auth_id = p_auth_id;
    
    RAISE NOTICE 'Updated existing user profile for %', p_email;
  ELSE
    -- Also check by email as a fallback
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email AND email != '') THEN
      -- Update existing user with auth_id if found by email
      UPDATE public.users
      SET 
        auth_id = p_auth_id,
        name = COALESCE(p_name, name),
        phone = COALESCE(p_phone, phone),
        date_modified = now_timestamp
      WHERE email = p_email AND email != '';
      
      RAISE NOTICE 'Updated existing user by email with auth_id for %', p_email;
    ELSE
      -- Insert a new record into public.users
      INSERT INTO public.users (
        id,
        auth_id,
        name,
        email,
        phone,
        date_created,
        date_modified,
        is_admin
      ) VALUES (
        p_id,
        p_auth_id,
        p_name,
        p_email,
        p_phone,
        now_timestamp,
        now_timestamp,
        false
      );
      
      RAISE NOTICE 'Created new user profile for %', p_email;
    END IF;
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violations gracefully
    RAISE NOTICE 'User profile already exists (unique violation) for %', p_email;
  WHEN others THEN
    -- Log other errors but don't fail the transaction
    RAISE NOTICE 'Error creating/updating user profile: %', SQLERRM;
END;
$$;

-- Create a function to check and fix missing user profiles
-- This can be called manually or from application code
CREATE OR REPLACE FUNCTION check_and_fix_user_profile(
  p_auth_id UUID,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
BEGIN
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = p_auth_id
  ) INTO user_exists;
  
  -- If user doesn't exist, create it
  IF NOT user_exists THEN
    user_id := p_auth_id::TEXT;
    
    PERFORM create_or_update_user_profile(
      user_id,
      p_auth_id,
      p_name,
      p_email,
      p_phone
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission on the functions
GRANT EXECUTE ON FUNCTION create_or_update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_fix_user_profile TO authenticated;

-- Add comments explaining the functions
COMMENT ON FUNCTION create_or_update_user_profile IS 'Creates or updates a user profile in the public.users table';
COMMENT ON FUNCTION check_and_fix_user_profile IS 'Checks if a user profile exists and creates it if needed';