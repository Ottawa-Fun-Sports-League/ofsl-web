-- Create team_invites table to store pending team invitations
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  processed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_team_invites_email ON team_invites(email);
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX idx_team_invites_status ON team_invites(status);
CREATE INDEX idx_team_invites_expires_at ON team_invites(expires_at);

-- Enable RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Team captains and co-captains can view invites for their teams
CREATE POLICY "Team captains can view team invites" ON team_invites
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams 
      WHERE captain_id = auth.uid() 
         OR co_captain_ids @> ARRAY[auth.uid()]
    )
  );

-- Team captains and co-captains can create invites for their teams  
CREATE POLICY "Team captains can create team invites" ON team_invites
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams 
      WHERE captain_id = auth.uid() 
         OR co_captain_ids @> ARRAY[auth.uid()]
    )
  );

-- Team captains and co-captains can update invites for their teams
CREATE POLICY "Team captains can update team invites" ON team_invites
  FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM teams 
      WHERE captain_id = auth.uid() 
         OR co_captain_ids @> ARRAY[auth.uid()]
    )
  );

-- Team captains and co-captains can delete invites for their teams
CREATE POLICY "Team captains can delete team invites" ON team_invites
  FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM teams 
      WHERE captain_id = auth.uid() 
         OR co_captain_ids @> ARRAY[auth.uid()]
    )
  );

-- Users can view their own pending invites by email
CREATE POLICY "Users can view their own invites" ON team_invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > NOW()
  );