/*
  # Add ON DELETE CASCADE to team_ids in users table

  1. Changes
    - Create a function to safely remove team IDs from users.team_ids array
    - This ensures that when a team is deleted, it's properly removed from all users' team_ids arrays
    - Helps maintain data integrity when teams are deleted

  2. Security
    - No changes to existing RLS policies
*/

-- Create a function to remove a team ID from all users' team_ids arrays
CREATE OR REPLACE FUNCTION remove_team_from_users_team_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all users who have this team in their team_ids array
  UPDATE users
  SET team_ids = array_remove(team_ids, OLD.id)
  WHERE team_ids @> ARRAY[OLD.id];
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the function before a team is deleted
DROP TRIGGER IF EXISTS remove_team_from_users_team_ids_trigger ON teams;
CREATE TRIGGER remove_team_from_users_team_ids_trigger
  BEFORE DELETE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION remove_team_from_users_team_ids();