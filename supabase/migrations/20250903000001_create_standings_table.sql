-- Create standings table for tracking team statistics with manual adjustment capability
CREATE TABLE IF NOT EXISTS standings (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    point_differential INTEGER DEFAULT 0, -- New field for +/- tracking
    -- Manual adjustment fields
    manual_wins_adjustment INTEGER DEFAULT 0,
    manual_losses_adjustment INTEGER DEFAULT 0,
    manual_points_adjustment INTEGER DEFAULT 0,
    manual_differential_adjustment INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one standing per team per league
ALTER TABLE standings ADD CONSTRAINT unique_league_team_standing UNIQUE (league_id, team_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_standings_league ON standings(league_id);
CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id);

-- Add RLS policies for standings
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage standings" ON standings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Authenticated users can view standings" ON standings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_standings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER standings_updated_at
    BEFORE UPDATE ON standings
    FOR EACH ROW
    EXECUTE FUNCTION update_standings_updated_at();

-- Function to calculate standings from game_results
CREATE OR REPLACE FUNCTION calculate_standings(p_league_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Insert or update standings for all teams in the league
    INSERT INTO standings (league_id, team_id, wins, losses, points, point_differential)
    SELECT 
        t.league_id,
        t.id as team_id,
        COALESCE(SUM(gr.wins), 0) as wins,
        COALESCE(SUM(gr.losses), 0) as losses,
        COALESCE(SUM(gr.wins * 2), 0) as points, -- 2 points per win
        COALESCE(SUM(gr.points_for - gr.points_against), 0) as point_differential
    FROM teams t
    LEFT JOIN game_results gr ON gr.league_id = t.league_id AND gr.team_name = t.name
    WHERE t.league_id = p_league_id AND t.active = true
    GROUP BY t.league_id, t.id
    ON CONFLICT (league_id, team_id) 
    DO UPDATE SET
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        points = EXCLUDED.points,
        point_differential = EXCLUDED.point_differential,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get final standings with manual adjustments
CREATE OR REPLACE FUNCTION get_standings_with_adjustments(p_league_id INTEGER)
RETURNS TABLE (
    team_id INTEGER,
    team_name TEXT,
    total_wins INTEGER,
    total_losses INTEGER,
    total_points INTEGER,
    total_differential INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.team_id,
        t.name as team_name,
        s.wins + s.manual_wins_adjustment as total_wins,
        s.losses + s.manual_losses_adjustment as total_losses,
        s.points + s.manual_points_adjustment as total_points,
        s.point_differential + s.manual_differential_adjustment as total_differential
    FROM standings s
    JOIN teams t ON t.id = s.team_id
    WHERE s.league_id = p_league_id
    ORDER BY 
        (s.points + s.manual_points_adjustment) DESC,
        (s.wins + s.manual_wins_adjustment) DESC,
        (s.point_differential + s.manual_differential_adjustment) DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment explaining the table
COMMENT ON TABLE standings IS 'Stores aggregated team standings with support for manual adjustments by admins';
COMMENT ON COLUMN standings.point_differential IS 'Point differential (+/-) calculated as points_for minus points_against';
COMMENT ON COLUMN standings.manual_wins_adjustment IS 'Manual adjustment to wins by admin (can be positive or negative)';
COMMENT ON COLUMN standings.manual_losses_adjustment IS 'Manual adjustment to losses by admin (can be positive or negative)';
COMMENT ON COLUMN standings.manual_points_adjustment IS 'Manual adjustment to points by admin (can be positive or negative)';
COMMENT ON COLUMN standings.manual_differential_adjustment IS 'Manual adjustment to point differential by admin (can be positive or negative)';