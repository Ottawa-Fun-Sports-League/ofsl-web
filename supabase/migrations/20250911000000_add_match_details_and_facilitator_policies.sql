-- Add JSONB details to store scorecard data including spares notes
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS match_details JSONB;

COMMENT ON COLUMN game_results.match_details IS 'Raw match details JSON (e.g., per-set scores, spares notes) for audit/history';

-- Update RLS policies to include facilitators in manage permissions
-- Weekly schedules
DROP POLICY IF EXISTS "Admins can manage weekly schedules" ON weekly_schedules;
CREATE POLICY "Admins and facilitators can manage weekly schedules" ON weekly_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND (users.is_admin = true OR users.is_facilitator = true)
    )
  );

-- Game results
DROP POLICY IF EXISTS "Admins can manage game results" ON game_results;
CREATE POLICY "Admins and facilitators can manage game results" ON game_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND (users.is_admin = true OR users.is_facilitator = true)
    )
  );

