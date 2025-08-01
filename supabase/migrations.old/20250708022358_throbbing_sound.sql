/*
  # Create user profile management functions

  1. New Functions
    - `check_and_fix_user_profile_v3` - Enhanced version for handling user profile creation/updates
    - `check_and_fix_user_profile_v2` - Backup version for compatibility
    - `get_current_user_id` - Helper function to get current user ID

  2. Security
    - Functions are security definer to allow proper access
    - Proper error handling and validation
*/

-- Helper function to get current user ID from users table
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id TEXT;
BEGIN
  SELECT id INTO user_id
  FROM users
  WHERE auth_id = auth.uid();
  
  RETURN user_id;
END;
$$;

-- Function to check and fix user profile (v2 for compatibility)
CREATE OR REPLACE FUNCTION check_and_fix_user_profile_v2(
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
  existing_user RECORD;
  new_user_id TEXT;
BEGIN
  -- Check if user already exists
  SELECT * INTO existing_user
  FROM users
  WHERE auth_id = p_auth_id;
  
  -- If user doesn't exist, create them
  IF NOT FOUND THEN
    -- Generate a new user ID (using timestamp + random for uniqueness)
    new_user_id := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    INSERT INTO users (
      id,
      auth_id,
      email,
      name,
      phone,
      date_created,
      date_modified,
      is_admin,
      team_ids,
      user_sports_skills
    ) VALUES (
      new_user_id,
      p_auth_id,
      COALESCE(p_email, ''),
      COALESCE(p_name, ''),
      COALESCE(p_phone, ''),
      NOW()::TEXT,
      NOW()::TEXT,
      FALSE,
      '{}',
      '[]'::JSONB
    );
    
    RETURN TRUE;
  ELSE
    -- User exists, update if needed
    UPDATE users
    SET 
      email = COALESCE(NULLIF(p_email, ''), email),
      name = COALESCE(NULLIF(p_name, ''), name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      date_modified = NOW()::TEXT
    WHERE auth_id = p_auth_id
    AND (
      (p_email IS NOT NULL AND p_email != '' AND email != p_email) OR
      (p_name IS NOT NULL AND p_name != '' AND name != p_name) OR
      (p_phone IS NOT NULL AND p_phone != '' AND phone != p_phone)
    );
    
    RETURN TRUE;
  END IF;
END;
$$;

-- Enhanced function to check and fix user profile (v3)
CREATE OR REPLACE FUNCTION check_and_fix_user_profile_v3(
  p_auth_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user RECORD;
  new_user_id TEXT;
  auth_uuid UUID;
  result JSONB;
BEGIN
  -- Convert string auth_id to UUID
  BEGIN
    auth_uuid := p_auth_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid auth_id format',
      'action', 'none'
    );
  END;
  
  -- Check if user already exists
  SELECT * INTO existing_user
  FROM users
  WHERE auth_id = auth_uuid;
  
  -- If user doesn't exist, create them
  IF NOT FOUND THEN
    -- Generate a new user ID (using timestamp + random for uniqueness)
    new_user_id := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    INSERT INTO users (
      id,
      auth_id,
      email,
      name,
      phone,
      date_created,
      date_modified,
      is_admin,
      team_ids,
      user_sports_skills
    ) VALUES (
      new_user_id,
      auth_uuid,
      COALESCE(p_email, ''),
      COALESCE(p_name, ''),
      COALESCE(p_phone, ''),
      NOW()::TEXT,
      NOW()::TEXT,
      FALSE,
      '{}',
      '[]'::JSONB
    );
    
    result := jsonb_build_object(
      'success', true,
      'action', 'created',
      'user_id', new_user_id,
      'message', 'User profile created successfully'
    );
  ELSE
    -- User exists, check if update is needed
    IF (p_email IS NOT NULL AND p_email != '' AND (existing_user.email IS NULL OR existing_user.email = '' OR existing_user.email != p_email)) OR
       (p_name IS NOT NULL AND p_name != '' AND (existing_user.name IS NULL OR existing_user.name = '' OR existing_user.name != p_name)) OR
       (p_phone IS NOT NULL AND p_phone != '' AND (existing_user.phone IS NULL OR existing_user.phone = '' OR existing_user.phone != p_phone)) THEN
      
      UPDATE users
      SET 
        email = COALESCE(NULLIF(p_email, ''), email),
        name = COALESCE(NULLIF(p_name, ''), name),
        phone = COALESCE(NULLIF(p_phone, ''), phone),
        date_modified = NOW()::TEXT
      WHERE auth_id = auth_uuid;
      
      result := jsonb_build_object(
        'success', true,
        'action', 'updated',
        'user_id', existing_user.id,
        'message', 'User profile updated successfully'
      );
    ELSE
      result := jsonb_build_object(
        'success', true,
        'action', 'no_change',
        'user_id', existing_user.id,
        'message', 'User profile already up to date'
      );
    END IF;
  END IF;
  
  RETURN result;
END;
$$;