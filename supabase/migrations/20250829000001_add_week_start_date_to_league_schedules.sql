-- Add week_start_date column to league_schedules table for week management
ALTER TABLE league_schedules 
ADD COLUMN week_start_date DATE;

-- Add comment to explain the column purpose
COMMENT ON COLUMN league_schedules.week_start_date IS 'The date of week 1 of the league schedule. Used to calculate dates for subsequent weeks.';