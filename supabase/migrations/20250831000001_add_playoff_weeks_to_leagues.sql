-- Add playoff_weeks column to leagues table
-- This defines how many additional weeks after the regular season are used for playoffs
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS playoff_weeks INTEGER DEFAULT 2;

-- Add check constraint to ensure playoff_weeks is reasonable (0-6 weeks)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leagues_playoff_weeks_check'
          AND conrelid = 'public.leagues'::regclass
    ) THEN
        ALTER TABLE leagues 
        ADD CONSTRAINT leagues_playoff_weeks_check CHECK (playoff_weeks >= 0 AND playoff_weeks <= 6);
    END IF;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN leagues.playoff_weeks IS 'Number of additional weeks after the regular season for playoffs (typically 2-4 weeks)';

-- Update existing leagues to have default playoff weeks
UPDATE leagues 
SET playoff_weeks = 2 
WHERE playoff_weeks IS NULL;

-- Add is_playoff column to weekly_schedules table to identify playoff weeks
ALTER TABLE weekly_schedules 
ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN DEFAULT FALSE;

ALTER TABLE weekly_schedules
ALTER COLUMN is_playoff SET DEFAULT FALSE;

-- Add comment explaining the playoff flag
COMMENT ON COLUMN weekly_schedules.is_playoff IS 'True if this week is part of the playoff period (after regular season)';
