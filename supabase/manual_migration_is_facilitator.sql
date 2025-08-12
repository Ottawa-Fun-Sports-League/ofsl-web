-- Manual migration to add is_facilitator column
-- Run this script directly in the Supabase SQL editor when you have database access

-- Step 1: Add the is_facilitator column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_facilitator BOOLEAN DEFAULT false;

-- Step 2: Add documentation
COMMENT ON COLUMN users.is_facilitator IS 'Indicates if the user has facilitator privileges for managing leagues and games';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_facilitator ON users(is_facilitator) WHERE is_facilitator = true;

-- Step 4: Update the get_all_users_admin RPC function (if it exists) to include is_facilitator
-- Note: This assumes the function exists. If not, you may need to create it.
-- The function should include is_facilitator in its SELECT statement.

-- Step 5: Grant necessary permissions (if needed)
-- Uncomment and run if you need to grant permissions to the authenticated role
-- GRANT SELECT ON users TO authenticated;
-- GRANT UPDATE (is_facilitator) ON users TO authenticated;

-- Verification query - run this to confirm the column was added:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'is_facilitator';