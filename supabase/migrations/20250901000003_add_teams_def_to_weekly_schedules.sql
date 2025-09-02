-- Add support for 6-team formats by adding team positions D, E, F to weekly_schedules table
ALTER TABLE weekly_schedules 
ADD COLUMN IF NOT EXISTS team_d_name TEXT,
ADD COLUMN IF NOT EXISTS team_d_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team_e_name TEXT,
ADD COLUMN IF NOT EXISTS team_e_ranking INTEGER,
ADD COLUMN IF NOT EXISTS team_f_name TEXT,
ADD COLUMN IF NOT EXISTS team_f_ranking INTEGER;

-- Add comment explaining the extended support
COMMENT ON TABLE weekly_schedules IS 'Stores schedule data per week/tier. Supports 2-6 team formats with positions A-F.';