-- First, identify and remove any duplicate payment records
-- Keep only the oldest record for each user-league-team combination
WITH duplicates AS (
    SELECT 
        id,
        user_id,
        league_id,
        team_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, league_id, COALESCE(team_id, -1) 
            ORDER BY created_at
        ) as row_num
    FROM league_payments
)
DELETE FROM league_payments
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- Add a unique constraint to prevent future duplicates
-- Use a unique index that handles NULL team_id values properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_league_payment 
ON league_payments (user_id, league_id, COALESCE(team_id, -1));

-- Also fix any duplicate league_ids in the users table
-- This removes duplicate entries from the league_ids array
UPDATE users
SET league_ids = (
    SELECT array_agg(DISTINCT elem ORDER BY elem) 
    FROM unnest(league_ids) elem
)
WHERE id IN (
    SELECT id
    FROM users
    WHERE cardinality(league_ids) > cardinality(
        (SELECT array_agg(DISTINCT elem) FROM unnest(league_ids) elem)
    )
);