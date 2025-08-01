/*
  # Improved User Profile Creation for Google Auth

  1. New Functions
    - `check_and_fix_user_profile_v3` - Enhanced version that better handles Google OAuth
    - Properly extracts user metadata from different auth providers
    - Handles edge cases like missing phone numbers for Google users
    - Includes better error handling and logging

  2. Security
    - Function is accessible to authenticated users
    - Includes proper error handling to prevent exposing sensitive information
*/

-- Create an improved function to check and fix user profiles
CREATE OR REPLACE FUNCTION check_and_fix_user_profile_v3(
  p_auth_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  v_result BOOLEAN := FALSE;
BEGIN
  -- Convert auth_id to text if it's a UUID
  user_id := p_auth_id;
  
  -- Log the function call for debugging
  RAISE NOTICE 'check_and_fix_user_profile_v3 called for auth_id: %, email: %', user_id, p_email;
  
  -- Check if user exists in public.users by auth_id
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = user_id::uuid
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'User already exists with auth_id: %', user_id;
    RETURN FALSE;
  END IF;
  
  -- Check if user exists by email (for linking existing accounts)
  IF p_email IS NOT NULL AND p_email != '' THEN
    DECLARE
      existing_user_id TEXT;
    BEGIN
      SELECT id INTO existing_user_id FROM public.users 
      WHERE email = p_email AND email != '' AND auth_id IS NULL
      LIMIT 1;
      
      IF existing_user_id IS NOT NULL THEN
        -- Update existing user with auth_id
        RAISE NOTICE 'Found existing user by email, updating auth_id. Email: %, ID: %', p_email, existing_user_id;
        
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = COALESCE(NULLIF(p_name, ''), name),
          phone = COALESCE(NULLIF(p_phone, ''), phone),
          date_modified = now_timestamp
        WHERE id = existing_user_id;
        
        RETURN TRUE;
      END IF;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Error checking for existing user by email: %', SQLERRM;
    END;
  END IF;
  
  -- Create new user if no existing user found
  BEGIN
    RAISE NOTICE 'Creating new user profile. Auth ID: %, Email: %, Name: %', user_id, p_email, p_name;
    
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
      user_id,
      user_id::uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp,
      now_timestamp,
      false
    );
    
    v_result := TRUE;
    RAISE NOTICE 'Successfully created new user profile for %', p_email;
  EXCEPTION
    WHEN unique_violation THEN
      -- If there's a unique violation, try to update the existing record
      RAISE NOTICE 'Unique violation when creating user, attempting to update. Auth ID: %', user_id;
      
      BEGIN
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = COALESCE(NULLIF(p_name, ''), name),
          email = COALESCE(NULLIF(p_email, ''), email),
          phone = COALESCE(NULLIF(p_phone, ''), phone),
          date_modified = now_timestamp
        WHERE id = user_id OR (email = p_email AND email != '');
        
        v_result := TRUE;
        RAISE NOTICE 'Successfully updated existing user for %', p_email;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error updating existing user: %', SQLERRM;
          v_result := FALSE;
      END;
    WHEN others THEN
      -- Log errors but don't fail
      RAISE NOTICE 'Error creating user profile: %', SQLERRM;
      v_result := FALSE;
  END;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_and_fix_user_profile_v3 TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION check_and_fix_user_profile_v3 IS 'Enhanced function to check if a user profile exists and create it if needed, with better support for Google OAuth';