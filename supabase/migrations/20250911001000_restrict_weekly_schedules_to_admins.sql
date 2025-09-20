-- Restrict weekly_schedules management to admins only; facilitators may still manage game_results

-- Replace the prior policy that allowed facilitators on weekly_schedules
DROP POLICY IF EXISTS "Admins can manage weekly schedules" ON weekly_schedules;
DROP POLICY IF EXISTS "Admins and facilitators can manage weekly schedules" ON weekly_schedules;

CREATE POLICY "Admins can manage weekly schedules" ON weekly_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Keep view access as-is (authenticated users can view)
-- (No change to game_results policy: admins and facilitators can manage)
