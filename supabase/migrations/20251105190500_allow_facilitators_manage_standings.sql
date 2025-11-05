-- Allow facilitators to manage standings alongside admins

ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage standings" ON standings;

CREATE POLICY "Admins or facilitators can manage standings" ON standings
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid()
        AND (users.is_admin = true OR users.is_facilitator = true)
    )
  );

