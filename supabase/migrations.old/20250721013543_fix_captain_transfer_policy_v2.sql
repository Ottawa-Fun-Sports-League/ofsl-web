/*
  # Allow team captains to transfer captain role

  1. Changes
    - Drop the existing "Team captains can manage their teams" policy
    - Create a new policy that allows captains to update their teams
    - The new policy allows updates where either:
      - The user is the current captain (for general updates)
      - The user is the old captain AND they're changing the captain_id (for captain transfers)

  2. Security
    - Captains can still manage their teams
    - Captains can transfer captain role to another team member
    - Admins retain full control
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Team captains can manage their teams" ON teams;

-- Create new policy for team captains that allows captain transfers
CREATE POLICY "Team captains can manage their teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    -- User is the current captain
    captain_id = get_current_user_id()
    OR
    -- User is in the team roster (for viewing)
    get_current_user_id() = ANY(roster)
  )
  WITH CHECK (
    -- User is the current captain (for general updates)
    captain_id = get_current_user_id()
    OR
    -- User was the captain before this update (allows captain transfer)
    (
      get_current_user_id() = (SELECT captain_id FROM teams WHERE id = teams.id)
      AND
      -- Ensure the new captain is a team member
      NEW.captain_id = ANY(roster)
    )
  );

-- Add a comment explaining the policy
COMMENT ON POLICY "Team captains can manage their teams" ON teams IS 
'Allows team captains to manage their teams including transferring captain role to another team member';