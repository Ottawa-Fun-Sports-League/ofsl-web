/*
  # Fix Google Sign-up User Creation

  This migration fixes the check_and_fix_user_profile_v4 function to properly handle
  Google OAuth sign-ups by generating unique IDs instead of trying to use auth_id
  as the primary key.

  ## Issues Fixed:
  1. Function was trying to use auth_id (UUID) as the primary key id (TEXT)
  2. Date conversion issues
  3. Proper error handling for user creation
  
  ## Security:
  - No changes to RLS policies
  - Function remains SECURITY DEFINER with proper access control
*/

-- Create the corrected function
CREATE OR REPLACE FUNCTION check_and_fix_user_profile_v4(
  p_auth_id TEXT,
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
  now_timestamp TIMESTAMP WITH TIME ZONE := now();
  v_result BOOLEAN := FALSE;
  rows_affected INTEGER;
  auth_uuid UUID;
BEGIN
  -- Convert auth_id to UUID
  BEGIN
    auth_uuid := p_auth_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Invalid auth_id format: %', p_auth_id;
    RETURN FALSE;
  END;
  
  -- Log the function call for debugging
  RAISE NOTICE 'check_and_fix_user_profile_v4 called for auth_id: %, email: %', p_auth_id, p_email;
  
  -- Check if user exists in public.users by auth_id
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = auth_uuid
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'User already exists with auth_id: %', p_auth_id;
    
    -- Update the existing user with any new information
    -- Only update fields if the provided value is not NULL and not empty
    UPDATE public.users
    SET 
      name = CASE 
        WHEN p_name IS NOT NULL AND p_name != '' AND (name IS NULL OR name = '') 
        THEN p_name 
        ELSE name 
      END,
      email = CASE 
        WHEN p_email IS NOT NULL AND p_email != '' AND (email IS NULL OR email = '') 
        THEN p_email 
        ELSE email 
      END,
      phone = CASE 
        WHEN p_phone IS NOT NULL AND p_phone != '' AND (phone IS NULL OR phone = '') 
        THEN p_phone 
        ELSE phone 
      END,
      date_modified = now_timestamp::TEXT
    WHERE auth_id = auth_uuid;
    
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
          auth_id = auth_uuid,
          name = CASE 
            WHEN p_name IS NOT NULL AND p_name != '' AND (name IS NULL OR name = '') 
            THEN p_name 
            ELSE name 
          END,
          phone = CASE 
            WHEN p_phone IS NOT NULL AND p_phone != '' AND (phone IS NULL OR phone = '') 
            THEN p_phone 
            ELSE phone 
          END,
          date_modified = now_timestamp::TEXT
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
    -- Generate a unique user ID (timestamp + random for uniqueness)
    user_id := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    RAISE NOTICE 'Creating new user profile. Auth ID: %, Email: %, Name: %, Generated ID: %', p_auth_id, p_email, p_name, user_id;
    
    INSERT INTO public.users (
      id,
      auth_id,
      name,
      email,
      phone,
      date_created,
      date_modified,
      is_admin,
      team_ids,
      user_sports_skills
    ) VALUES (
      user_id,  -- Use generated unique ID instead of auth_id
      auth_uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp::TEXT,
      now_timestamp::TEXT,
      false,
      '{}'::bigint[],
      '[]'::jsonb
    );
    
    v_result := TRUE;
    RAISE NOTICE 'Successfully created new user profile for % with ID %', p_email, user_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- If there's a unique violation, try to update the existing record
      RAISE NOTICE 'Unique violation when creating user, attempting to update. Auth ID: %', p_auth_id;
      
      BEGIN
        -- Try to update by auth_id
        UPDATE public.users
        SET 
          name = CASE 
            WHEN p_name IS NOT NULL AND p_name != '' 
            THEN p_name 
            ELSE name 
          END,
          email = CASE 
            WHEN p_email IS NOT NULL AND p_email != '' 
            THEN p_email 
            ELSE email 
          END,
          phone = CASE 
            WHEN p_phone IS NOT NULL AND p_phone != '' 
            THEN p_phone 
            ELSE phone 
          END,
          date_modified = now_timestamp::TEXT
        WHERE auth_id = auth_uuid;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        
        -- If no rows affected, try by email
        IF rows_affected = 0 AND p_email IS NOT NULL AND p_email != '' THEN
          UPDATE public.users
          SET 
            auth_id = auth_uuid,
            name = CASE 
              WHEN p_name IS NOT NULL AND p_name != '' 
              THEN p_name 
              ELSE name 
            END,
            phone = CASE 
              WHEN p_phone IS NOT NULL AND p_phone != '' 
              THEN p_phone 
              ELSE phone 
            END,
            date_modified = now_timestamp::TEXT
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
GRANT EXECUTE ON FUNCTION check_and_fix_user_profile_v4 TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION check_and_fix_user_profile_v4 IS 'Fixed function to properly handle Google OAuth sign-ups by generating unique IDs instead of using auth_id as primary key';