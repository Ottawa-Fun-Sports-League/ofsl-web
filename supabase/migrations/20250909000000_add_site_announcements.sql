-- Create table to manage the global site announcement bar content
CREATE TABLE IF NOT EXISTS site_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  link_text TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
-- Index to quickly find the latest active announcement
CREATE INDEX IF NOT EXISTS idx_site_announcements_active_updated
  ON site_announcements(is_active, updated_at DESC);
-- Keep updated_at current on modifications
CREATE OR REPLACE FUNCTION set_site_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_site_announcements_updated_at ON site_announcements;
CREATE TRIGGER trg_site_announcements_updated_at
BEFORE UPDATE ON site_announcements
FOR EACH ROW
EXECUTE FUNCTION set_site_announcements_updated_at();
-- Enable RLS and grant access
ALTER TABLE site_announcements ENABLE ROW LEVEL SECURITY;
-- Allow anyone (including anon) to read the announcement
CREATE POLICY "Site announcements readable by anyone" ON site_announcements
  FOR SELECT USING (true);
-- Admins manage announcements
CREATE POLICY "Admins can insert site announcements" ON site_announcements
  FOR INSERT WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can update site announcements" ON site_announcements
  FOR UPDATE USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can delete site announcements" ON site_announcements
  FOR DELETE USING (is_current_user_admin());
GRANT SELECT ON site_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON site_announcements TO authenticated;
