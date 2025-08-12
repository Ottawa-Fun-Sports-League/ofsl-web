-- Add is_facilitator column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_facilitator BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.is_facilitator IS 'Indicates if the user has facilitator privileges for managing leagues and games';

-- Create index for performance when filtering by facilitator status
CREATE INDEX IF NOT EXISTS idx_users_is_facilitator ON users(is_facilitator) WHERE is_facilitator = true;