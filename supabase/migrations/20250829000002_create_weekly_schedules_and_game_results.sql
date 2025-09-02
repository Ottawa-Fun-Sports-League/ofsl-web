-- Create table for storing weekly schedule data (replaces single schedule_data)
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    tier_number INTEGER NOT NULL,
    location TEXT NOT NULL DEFAULT 'TBD',
    time_slot TEXT NOT NULL DEFAULT 'TBD',
    court TEXT NOT NULL DEFAULT 'TBD',
    format TEXT NOT NULL DEFAULT '3-teams-6-sets',
    team_a_name TEXT,
    team_a_ranking INTEGER,
    team_b_name TEXT,
    team_b_ranking INTEGER,
    team_c_name TEXT,
    team_c_ranking INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for storing game results
CREATE TABLE IF NOT EXISTS game_results (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    tier_number INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    sets_won INTEGER DEFAULT 0,
    sets_lost INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    tier_position INTEGER, -- 1st, 2nd, 3rd in that tier for that week
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraints
ALTER TABLE weekly_schedules ADD CONSTRAINT unique_league_week_tier UNIQUE (league_id, week_number, tier_number);
ALTER TABLE game_results ADD CONSTRAINT unique_league_week_tier_team UNIQUE (league_id, week_number, tier_number, team_name);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_league_week ON weekly_schedules(league_id, week_number);
CREATE INDEX IF NOT EXISTS idx_game_results_league_week ON game_results(league_id, week_number);

-- Add RLS policies for weekly_schedules
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage weekly schedules" ON weekly_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Authenticated users can view weekly schedules" ON weekly_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add RLS policies for game_results
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage game results" ON game_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Authenticated users can view game results" ON game_results
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create trigger functions for updating updated_at
CREATE OR REPLACE FUNCTION update_weekly_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_game_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER weekly_schedules_updated_at
    BEFORE UPDATE ON weekly_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_weekly_schedules_updated_at();

CREATE TRIGGER game_results_updated_at
    BEFORE UPDATE ON game_results
    FOR EACH ROW
    EXECUTE FUNCTION update_game_results_updated_at();

-- Add comment explaining the new structure
COMMENT ON TABLE weekly_schedules IS 'Stores schedule data per week/tier instead of single schedule_data JSON. Supports dynamic weekly schedules.';
COMMENT ON TABLE game_results IS 'Stores game results for each team per week/tier. Used to calculate team placement for following weeks.';