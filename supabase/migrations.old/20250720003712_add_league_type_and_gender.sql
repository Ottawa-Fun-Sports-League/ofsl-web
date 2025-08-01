-- Add league_type and gender columns to leagues table
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS league_type TEXT CHECK (league_type IN ('regular_season', 'tournament', 'skills_drills')),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Mixed', 'Female', 'Male'));

-- Update existing leagues to have default values
UPDATE leagues 
SET 
  league_type = 'regular_season',
  gender = 'Mixed'
WHERE 
  league_type IS NULL OR gender IS NULL;