-- Add league_type column to leagues table
-- This migration adds the league_type field to support filtering by Regular Season, Tournament, or Skills and Drills

-- Add the league_type column with proper constraints
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS league_type text 
CHECK (league_type IN ('regular_season', 'tournament', 'skills_drills'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leagues_league_type ON leagues(league_type);

-- Update existing leagues with default league_type based on naming patterns
-- Set default to 'regular_season' for most leagues
UPDATE leagues 
SET league_type = 'regular_season' 
WHERE league_type IS NULL 
  AND active = true;

-- You can manually update specific leagues to 'tournament' or 'skills_drills' as needed
-- Examples:
-- UPDATE leagues SET league_type = 'tournament' WHERE name ILIKE '%tournament%';
-- UPDATE leagues SET league_type = 'skills_drills' WHERE name ILIKE '%skill%' OR name ILIKE '%drill%';

-- Add comment to the column for documentation
COMMENT ON COLUMN leagues.league_type IS 'Type of league: regular_season, tournament, or skills_drills';