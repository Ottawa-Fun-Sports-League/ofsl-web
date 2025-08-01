-- Create a function to check and fix missing user profiles
CREATE OR REPLACE FUNCTION check_and_fix_user_profile(
  p_auth_id UUID,
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
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE auth_id = p_auth_id
  ) INTO user_exists;
  
  -- If user doesn't exist, create it
  IF NOT user_exists THEN
    user_id := p_auth_id::TEXT;
    
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
      user_id,
      p_auth_id,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp,
      now_timestamp,
      false
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_and_fix_user_profile TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION check_and_fix_user_profile IS 'Checks if a user profile exists and creates it if needed';