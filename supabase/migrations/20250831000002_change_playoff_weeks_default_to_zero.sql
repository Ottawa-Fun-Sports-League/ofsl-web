-- Change default playoff_weeks to 0 instead of 2
-- Admins should explicitly add playoff weeks when needed

ALTER TABLE leagues 
ALTER COLUMN playoff_weeks SET DEFAULT 0;

-- Update existing leagues that have the old default to 0
-- Only change leagues that have exactly 2 playoff weeks (the old default)
UPDATE leagues 
SET playoff_weeks = 0 
WHERE playoff_weeks = 2;

-- Update comment to reflect new default
COMMENT ON COLUMN leagues.playoff_weeks IS 'Number of additional weeks after the regular season for playoffs (default 0, admins add as needed)';