/*
  # Fix User Profile Function and Add Refresh Support

  1. Changes
    - Create a more robust function to check and fix user profiles
    - Make the function work with both UUID and TEXT parameters
    - Add better error handling and logging
    - Ensure the function can be called by authenticated users

  2. Security
    - Function is accessible to authenticated users
    - Uses proper error handling to prevent failures
*/

-- Create a function to check and fix missing user profiles
CREATE OR REPLACE FUNCTION check_and_fix_user_profile(
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
BEGIN
  -- Convert auth_id to text if it's a UUID
  user_id := p_auth_id;
  
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = user_id::uuid
  ) INTO user_exists;
  
  -- If user doesn't exist, create it
  IF NOT user_exists THEN
    -- Insert a new record into public.users
    BEGIN
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
      
      RETURN TRUE;
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a unique violation, try to update the existing record
        UPDATE public.users
        SET 
          auth_id = user_id::uuid,
          name = COALESCE(p_name, name),
          email = COALESCE(p_email, email),
          phone = COALESCE(p_phone, phone),
          date_modified = now_timestamp
        WHERE id = user_id OR email = p_email;
        
        RETURN TRUE;
      WHEN others THEN
        -- Log errors but don't fail
        RAISE WARNING 'Error in check_and_fix_user_profile: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  RETURN FALSE;
EXCEPTION
  WHEN others THEN
    -- Log errors but don't fail
    RAISE WARNING 'Error in check_and_fix_user_profile: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_and_fix_user_profile TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION check_and_fix_user_profile IS 'Checks if a user profile exists and creates it if needed';