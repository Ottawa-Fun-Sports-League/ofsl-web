-- Add league_ids column to users table for tracking individual league registrations
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS league_ids BIGINT[] DEFAULT '{}'::bigint[];

-- Add comment for documentation
COMMENT ON COLUMN users.league_ids IS 'Array of league IDs for individual (non-team) league registrations';

-- Create index for performance when querying user league memberships
CREATE INDEX IF NOT EXISTS idx_users_league_ids ON users USING GIN (league_ids);