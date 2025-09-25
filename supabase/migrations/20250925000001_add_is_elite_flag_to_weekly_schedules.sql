-- Add is_elite flag to weekly_schedules table
-- Indicates whether this tier is designated as Elite level for that week
ALTER TABLE weekly_schedules 
ADD COLUMN IF NOT EXISTS is_elite BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN weekly_schedules.is_elite IS 'When true, indicates this tier is at the Elite level for this week';

