-- Add co_captains field to teams table for co-captain functionality
-- This allows teams to have up to 2 co-captains in addition to the main captain
-- Co-captains have the same privileges as captains for team management

-- Add the co_captains column as an array of user IDs
ALTER TABLE teams ADD COLUMN co_captains TEXT[] DEFAULT '{}';

-- Create index for better query performance when searching by co-captain
CREATE INDEX IF NOT EXISTS idx_teams_co_captains ON teams USING GIN (co_captains);

-- Add comment to document the column purpose
COMMENT ON COLUMN teams.co_captains IS 'Array of user IDs who are co-captains for this team. Maximum of 2 co-captains allowed per team.';

-- Update RLS policies to include co-captains in team management permissions
-- This allows co-captains to have the same privileges as the main captain

-- Drop existing team management policies if they exist
DROP POLICY IF EXISTS "Team captains can manage their own teams" ON teams;
DROP POLICY IF EXISTS "Team captains can view their own teams" ON teams;

-- Create new policies that include co-captains
CREATE POLICY "Team captains and co-captains can manage their own teams"
ON teams
FOR ALL
TO authenticated
USING (
  captain_id = get_current_user_id() 
  OR get_current_user_id() = ANY(co_captains)
)
WITH CHECK (
  captain_id = get_current_user_id() 
  OR get_current_user_id() = ANY(co_captains)
);

-- Allow co-captains to view team details
CREATE POLICY "Team captains and co-captains can view their own teams"
ON teams
FOR SELECT
TO authenticated
USING (
  captain_id = get_current_user_id() 
  OR get_current_user_id() = ANY(co_captains)
  OR get_current_user_id() = ANY(roster)
);

-- Create a helper function to check if a user is a captain or co-captain of a team
CREATE OR REPLACE FUNCTION is_team_captain_or_co_captain(user_id TEXT, team_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_captain BOOLEAN := FALSE;
BEGIN
  SELECT 
    (captain_id = user_id OR user_id = ANY(co_captains))
  INTO is_captain
  FROM teams
  WHERE id = team_id;
  
  RETURN COALESCE(is_captain, FALSE);
END;
$$;

-- Add comment to document the helper function
COMMENT ON FUNCTION is_team_captain_or_co_captain IS 'Helper function to check if a user is either the captain or a co-captain of a specific team';