-- Restore user capabilities on My Leagues page
-- 1) Allow users to view and manage their own individual league_payments (skill updates + cancellation)
-- 2) Allow team captains/co-captains to update their team's skill level (teams table)

-- League payments policies
DO $$ BEGIN
  -- Enable RLS (no-op if already enabled)
  EXECUTE 'ALTER TABLE league_payments ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

-- Clean up existing potentially conflicting policies
DROP POLICY IF EXISTS "Users can view their own league payments" ON league_payments;
DROP POLICY IF EXISTS "Users can update their own individual league payments" ON league_payments;
DROP POLICY IF EXISTS "Users can delete their own individual league payments" ON league_payments;

-- Allow users to select their own league_payments
CREATE POLICY "Users can view their own league payments"
ON league_payments
FOR SELECT
TO authenticated
USING (user_id = get_current_user_id());

-- Allow users to update their own individual league payments (e.g., set skill_level_id)
CREATE POLICY "Users can update their own individual league payments"
ON league_payments
FOR UPDATE
TO authenticated
USING (user_id = get_current_user_id() AND team_id IS NULL)
WITH CHECK (user_id = get_current_user_id() AND team_id IS NULL);

-- Allow users to delete their own individual league payments (cancel individual registration)
CREATE POLICY "Users can delete their own individual league payments"
ON league_payments
FOR DELETE
TO authenticated
USING (user_id = get_current_user_id() AND team_id IS NULL);

-- Teams policies for skill updates by captains/co-captains
DO $$ BEGIN
  EXECUTE 'ALTER TABLE teams ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "Team captains/co-captains can update team" ON teams;

CREATE POLICY "Team captains/co-captains can update team"
ON teams
FOR UPDATE
TO authenticated
USING (
  captain_id = get_current_user_id()
  OR get_current_user_id() = ANY(COALESCE(co_captains, ARRAY[]::text[]))
)
WITH CHECK (
  captain_id = get_current_user_id()
  OR get_current_user_id() = ANY(COALESCE(co_captains, ARRAY[]::text[]))
);

-- Optional: allow SELECT on teams to all authenticated users (safe if already open via other policies)
-- DROP POLICY IF EXISTS "Enable read access for all users" ON teams;
-- CREATE POLICY "Enable read access for all users" ON teams FOR SELECT TO authenticated USING (true);

