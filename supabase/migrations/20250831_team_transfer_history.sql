-- Create team transfer history table for audit trail
CREATE TABLE IF NOT EXISTS team_transfer_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  from_league_id BIGINT NOT NULL REFERENCES leagues(id),
  to_league_id BIGINT NOT NULL REFERENCES leagues(id),
  transferred_by TEXT NOT NULL REFERENCES auth.users(id),
  transfer_reason TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Add indexes for performance
CREATE INDEX idx_team_transfer_history_team_id ON team_transfer_history(team_id);
CREATE INDEX idx_team_transfer_history_from_league ON team_transfer_history(from_league_id);
CREATE INDEX idx_team_transfer_history_to_league ON team_transfer_history(to_league_id);
CREATE INDEX idx_team_transfer_history_date ON team_transfer_history(transferred_at DESC);

-- Add RLS policies
ALTER TABLE team_transfer_history ENABLE ROW LEVEL SECURITY;

-- Admin users can view all transfer history
CREATE POLICY "Admin users can view transfer history" ON team_transfer_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admin users can insert transfer history
CREATE POLICY "Admin users can insert transfer history" ON team_transfer_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON team_transfer_history TO authenticated;