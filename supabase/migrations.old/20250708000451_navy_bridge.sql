/*
  # Add User Sports and Skills Preferences

  1. New Columns
    - `user_sports_skills` (jsonb) - Array of objects with sport_id and skill_id
    - This allows users to specify their skill level for each sport they're interested in
    - Used for better matching users with appropriate leagues and teams

  2. Functions
    - `update_user_sports_skills()` - Function to update a user's sports and skills preferences
    - Takes user_id and array of sport/skill objects as parameters
    - Handles validation and updates the user record

  3. Security
    - Function is accessible to authenticated users for their own profiles
    - Admins can update any user's preferences
*/

-- Add user_sports_skills column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_sports_skills'
  ) THEN
    ALTER TABLE users ADD COLUMN user_sports_skills JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create a function to update user sports and skills preferences
CREATE OR REPLACE FUNCTION update_user_sports_skills(
  p_user_id TEXT,
  p_sports_skills JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  SELECT id INTO v_current_user_id FROM users WHERE auth_id = auth.uid();
  
  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin FROM users WHERE auth_id = auth.uid();
  
  -- Verify permissions (user can only update their own preferences unless they're an admin)
  IF v_current_user_id != p_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: You can only update your own sports preferences';
    RETURN FALSE;
  END IF;
  
  -- Validate input format (should be an array of objects with sport_id and skill_id)
  IF jsonb_typeof(p_sports_skills) != 'array' THEN
    RAISE EXCEPTION 'Invalid format: sports_skills must be an array';
    RETURN FALSE;
  END IF;
  
  -- Update the user record
  UPDATE users
  SET 
    user_sports_skills = p_sports_skills,
    date_modified = now()
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error updating user sports and skills: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_user_sports_skills TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION update_user_sports_skills IS 'Updates a user''s sports interests and skill levels';

-- Create a function to get user sports and skills preferences
CREATE OR REPLACE FUNCTION get_user_sports_skills(
  p_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id TEXT;
  v_sports_skills JSONB;
BEGIN
  -- If no user_id provided, use the current user
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  ELSE
    v_user_id := p_user_id;
  END IF;
  
  -- Get the user's sports and skills preferences
  SELECT user_sports_skills INTO v_sports_skills
  FROM users
  WHERE id = v_user_id;
  
  RETURN COALESCE(v_sports_skills, '[]'::jsonb);
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error getting user sports and skills: %', SQLERRM;
    RETURN '[]'::jsonb;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_sports_skills TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_user_sports_skills IS 'Gets a user''s sports interests and skill levels';