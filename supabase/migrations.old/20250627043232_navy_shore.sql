/*
  # Update users table to add team_ids

  1. Changes
    - Add `team_ids` (bigint[]) - array of team IDs that the user belongs to
    - Add index for better query performance

  2. Security
    - No changes to existing RLS policies
*/

-- Add team_ids column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'team_ids'
  ) THEN
    ALTER TABLE users ADD COLUMN team_ids bigint[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for better query performance when searching by team membership
CREATE INDEX IF NOT EXISTS idx_users_team_ids ON users USING GIN(team_ids);

-- Create a function to get current user ID (used in RLS policies)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;