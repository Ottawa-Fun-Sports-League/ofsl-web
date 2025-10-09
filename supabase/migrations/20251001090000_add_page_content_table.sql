-- Table to store CMS-managed page content
CREATE TABLE IF NOT EXISTS page_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

-- Keep updated_at current on modifications
CREATE OR REPLACE FUNCTION set_page_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_page_content_updated_at ON page_content;
CREATE TRIGGER trg_page_content_updated_at
BEFORE UPDATE ON page_content
FOR EACH ROW
EXECUTE FUNCTION set_page_content_updated_at();

-- Row Level Security
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read published content
CREATE POLICY "Page content readable by anyone" ON page_content
  FOR SELECT
  USING (true);

-- Only admins can insert or modify content
CREATE POLICY "Admins can manage page content" ON page_content
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

GRANT SELECT ON page_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON page_content TO authenticated;
