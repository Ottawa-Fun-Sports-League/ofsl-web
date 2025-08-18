-- Create table for tracking contact form submissions (for rate limiting)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_contact_submissions_ip_created 
ON contact_submissions(ip_address, created_at DESC);

-- Add cleanup policy to remove old records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_contact_submissions()
RETURNS void AS $$
BEGIN
  DELETE FROM contact_submissions 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- Note: pg_cron must be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-contact-submissions', '0 2 * * *', 'SELECT cleanup_old_contact_submissions();');