-- Add defaults column to league_schedules table for storing default location, time, and court settings

ALTER TABLE league_schedules 
ADD COLUMN defaults JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the defaults column structure
COMMENT ON COLUMN league_schedules.defaults IS 'Default values for location, time, and court that can be applied when schedules are generated. Structure: {"location": "string", "time": "string", "court": "string"}';