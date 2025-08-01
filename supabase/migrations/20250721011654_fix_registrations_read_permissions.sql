-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own invites" ON team_invites;

-- Create a more permissive policy that allows newly registered users to see their invites
-- This uses a case-insensitive comparison and checks both auth.users and the JWT claims
CREATE POLICY "Users can view their own invites" ON team_invites
  FOR SELECT
  USING (
    LOWER(email) = LOWER(COALESCE(
      auth.jwt() ->> 'email',
      (SELECT email FROM auth.users WHERE id = auth.uid())
    ))
    AND status = 'pending'
    AND expires_at > NOW()
  );

-- Also create a policy that allows authenticated users to update invites for their email
CREATE POLICY "Users can accept their own invites" ON team_invites
  FOR UPDATE
  USING (
    LOWER(email) = LOWER(COALESCE(
      auth.jwt() ->> 'email',
      (SELECT email FROM auth.users WHERE id = auth.uid())
    ))
    AND status = 'pending'
    AND expires_at > NOW()
  )
  WITH CHECK (
    LOWER(email) = LOWER(COALESCE(
      auth.jwt() ->> 'email',
      (SELECT email FROM auth.users WHERE id = auth.uid())
    ))
  );

-- Add a function to help debug email matching issues
CREATE OR REPLACE FUNCTION debug_invite_access(user_email TEXT)
RETURNS TABLE (
  invite_id UUID,
  team_name TEXT,
  league_name TEXT,
  invite_email TEXT,
  auth_email TEXT,
  jwt_email TEXT,
  emails_match BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.team_name,
    ti.league_name,
    ti.email,
    au.email,
    auth.jwt() ->> 'email',
    LOWER(ti.email) = LOWER(COALESCE(auth.jwt() ->> 'email', au.email))
  FROM team_invites ti
  LEFT JOIN auth.users au ON au.id = auth.uid()
  WHERE LOWER(ti.email) = LOWER(user_email)
    AND ti.status = 'pending'
    AND ti.expires_at > NOW();
END;
$$;