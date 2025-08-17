-- Add team_registration column to leagues table
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS team_registration BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN leagues.team_registration IS 'If true, users register as teams with captains. If false, users register individually.';

-- Update existing data based on sport
-- Set volleyball leagues to team registration
UPDATE leagues 
SET team_registration = true 
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Volleyball');

-- Set badminton leagues to individual registration
UPDATE leagues 
SET team_registration = false 
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Badminton');

-- For any other sports, default to team registration
UPDATE leagues 
SET team_registration = true 
WHERE team_registration IS NULL;