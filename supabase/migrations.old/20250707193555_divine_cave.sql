/*
  # Fix Google Sign-up Flow

  1. Changes
    - Create an improved function to handle Google sign-ups
    - Ensure proper profile creation for Google users
    - Fix issues with missing phone numbers for Google users
    - Add better error handling and logging

  2. Security
    - Function is accessible to authenticated users
    - Uses proper error handling to prevent failures
*/

-- Create an enhanced function to check and fix user profiles with better Google support
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
  rows_affected INTEGER;
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
    
    -- Update the existing user with any new information
    UPDATE public.users
    SET 
      name = CASE WHEN p_name IS NOT NULL AND p_name != '' AND (name IS NULL OR name = '') THEN p_name ELSE name END,
      email = CASE WHEN p_email IS NOT NULL AND p_email != '' AND (email IS NULL OR email = '') THEN p_email ELSE email END,
      phone = CASE WHEN p_phone IS NOT NULL AND p_phone != '' AND (phone IS NULL OR phone = '') THEN p_phone ELSE phone END,
      date_modified = now_timestamp
    WHERE auth_id = user_id::uuid;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RAISE NOTICE 'Updated existing user, rows affected: %', rows_affected;
    
    RETURN TRUE;
  END IF;
  
  -- Check if user exists by email (for linking existing accounts)
  IF p_email IS NOT NULL AND p_email != '' THEN
    DECLARE
      existing_user_id TEXT;
    BEGIN
      SELECT id INTO existing_user_id FROM public.users 
      WHERE email = p_email AND email != ''
      LIMIT 1;
      
      IF existing_user_id IS NOT NULL THEN
        -- Update existing user with auth_id
        RAISE NOTICE 'Found existing user by email, updating auth_id. Email: %, ID: %', p_email, existing_user_id;
        
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = CASE WHEN p_name IS NOT NULL AND p_name != '' AND (name IS NULL OR name = '') THEN p_name ELSE name END,
          phone = CASE WHEN p_phone IS NOT NULL AND p_phone != '' AND (phone IS NULL OR phone = '') THEN p_phone ELSE phone END,
          date_modified = now_timestamp
        WHERE id = existing_user_id;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        RAISE NOTICE 'Updated existing user by email, rows affected: %', rows_affected;
        
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
      is_admin,
      team_ids
    ) VALUES (
      user_id,
      user_id::uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp,
      now_timestamp,
      false,
      '{}'::bigint[]
    );
    
    v_result := TRUE;
    RAISE NOTICE 'Successfully created new user profile for %', p_email;
  EXCEPTION
    WHEN unique_violation THEN
      -- If there's a unique violation, try to update the existing record
      RAISE NOTICE 'Unique violation when creating user, attempting to update. Auth ID: %', user_id;
      
      BEGIN
        -- Try to update by ID first
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = CASE WHEN p_name IS NOT NULL AND p_name != '' THEN p_name ELSE name END,
          email = CASE WHEN p_email IS NOT NULL AND p_email != '' THEN p_email ELSE email END,
          phone = CASE WHEN p_phone IS NOT NULL AND p_phone != '' THEN p_phone ELSE phone END,
          date_modified = now_timestamp
        WHERE id = user_id;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        
        -- If no rows affected, try by email
        IF rows_affected = 0 AND p_email IS NOT NULL AND p_email != '' THEN
          UPDATE public.users
          SET 
            auth_id = user_id::uuid,
            name = CASE WHEN p_name IS NOT NULL AND p_name != '' THEN p_name ELSE name END,
            phone = CASE WHEN p_phone IS NOT NULL AND p_phone != '' THEN p_phone ELSE phone END,
            date_modified = now_timestamp
          WHERE email = p_email AND email != '';
          
          GET DIAGNOSTICS rows_affected = ROW_COUNT;
        END IF;
        
        v_result := rows_affected > 0;
        RAISE NOTICE 'Update result: %, rows affected: %', v_result, rows_affected;
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