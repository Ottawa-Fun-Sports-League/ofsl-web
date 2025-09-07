-- Create individual transfer history table for audit trail
CREATE TABLE IF NOT EXISTS individual_transfer_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_league_id BIGINT NOT NULL REFERENCES leagues(id),
  to_league_id BIGINT NOT NULL REFERENCES leagues(id),
  transferred_by UUID NOT NULL REFERENCES auth.users(id),
  transfer_reason TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_indiv_transfer_user_id ON individual_transfer_history(user_id);
CREATE INDEX IF NOT EXISTS idx_indiv_transfer_from ON individual_transfer_history(from_league_id);
CREATE INDEX IF NOT EXISTS idx_indiv_transfer_to ON individual_transfer_history(to_league_id);
CREATE INDEX IF NOT EXISTS idx_indiv_transfer_date ON individual_transfer_history(transferred_at DESC);

-- Enable RLS and admin-only policies
ALTER TABLE individual_transfer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can view individual transfers" ON individual_transfer_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()::text
      AND public.users.is_admin = true
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can insert individual transfers" ON individual_transfer_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()::text
      AND public.users.is_admin = true
    )
  );

GRANT SELECT, INSERT ON individual_transfer_history TO authenticated;

