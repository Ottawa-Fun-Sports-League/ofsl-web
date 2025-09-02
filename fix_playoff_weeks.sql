-- Fix playoff weeks default to 0
-- Run this script directly in the Supabase SQL editor

-- Change default for new leagues
ALTER TABLE leagues 
ALTER COLUMN playoff_weeks SET DEFAULT 0;

-- Update existing leagues that have the old default of 2
UPDATE leagues 
SET playoff_weeks = 0 
WHERE playoff_weeks = 2;

-- Verify the changes
SELECT id, name, playoff_weeks FROM leagues ORDER BY id;