-- =============================================
-- Volleyball Schedule & Standings Management Migration
-- =============================================
-- This migration adds comprehensive scheduling and standings tracking
-- for volleyball leagues with dynamic tier management
-- =============================================

-- =============================================
-- ENUMS AND TYPES
-- =============================================

-- Match status tracking
CREATE TYPE match_status_enum AS ENUM (
    'scheduled',      -- Match is scheduled but not started
    'in_progress',    -- Match is currently being played
    'completed',      -- Match completed with all scores entered
    'postponed',      -- Match postponed to another date
    'cancelled'       -- Match cancelled
);

-- Match format types (7 different formats mentioned in requirements)
CREATE TYPE match_format_enum AS ENUM (
    'round_robin_3',     -- 3-team round robin (A vs B, B vs C, A vs C)
    'round_robin_4',     -- 4-team round robin
    'elimination_3',     -- 3-team elimination
    'king_court',        -- King of the court format
    'pool_play',         -- Pool play format
    'bracket_single',    -- Single elimination bracket
    'bracket_double'     -- Double elimination bracket
);

-- Score entry permission levels
CREATE TYPE score_permission_enum AS ENUM (
    'admin',          -- Full admin access
    'facilitator',    -- League facilitator
    'captain',        -- Team captain (limited)
    'none'           -- No score entry permission
);

-- =============================================
-- SEQUENCES
-- =============================================

CREATE SEQUENCE matches_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE match_sets_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE league_standings_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE schedule_templates_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE tier_history_id_seq START 1 INCREMENT 1;

-- =============================================
-- MAIN TABLES
-- =============================================

-- Schedule Templates: Define match formats and scheduling rules
CREATE TABLE schedule_templates (
    id BIGINT NOT NULL DEFAULT nextval('schedule_templates_id_seq'::regclass),
    name TEXT NOT NULL,
    description TEXT,
    match_format match_format_enum NOT NULL,
    teams_per_match INTEGER NOT NULL DEFAULT 3,
    sets_per_match INTEGER NOT NULL DEFAULT 3,
    points_per_set INTEGER NOT NULL DEFAULT 25,
    min_point_difference INTEGER NOT NULL DEFAULT 2,
    max_sets INTEGER,
    tie_break_points INTEGER DEFAULT 15,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT schedule_templates_pkey PRIMARY KEY (id)
);

-- Matches: Core match scheduling and tracking
CREATE TABLE matches (
    id BIGINT NOT NULL DEFAULT nextval('matches_id_seq'::regclass),
    league_id BIGINT NOT NULL,
    week_number INTEGER NOT NULL,
    match_date DATE NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1,
    
    -- Team positions (A, B, C) - references teams table
    position_a BIGINT,  -- Team in position A
    position_b BIGINT,  -- Team in position B  
    position_c BIGINT,  -- Team in position C (nullable for 2-team matches)
    
    -- Venue details
    gym_id BIGINT,
    court TEXT,
    time_slot TIME,
    
    -- Match configuration
    match_format match_format_enum DEFAULT 'round_robin_3',
    template_id BIGINT,
    
    -- Match state
    status match_status_enum DEFAULT 'scheduled',
    facilitator_id TEXT, -- User ID of assigned facilitator
    
    -- Scoring summary (calculated from match_sets)
    team_a_total_points INTEGER DEFAULT 0,
    team_b_total_points INTEGER DEFAULT 0,
    team_c_total_points INTEGER DEFAULT 0,
    team_a_sets_won INTEGER DEFAULT 0,
    team_b_sets_won INTEGER DEFAULT 0,
    team_c_sets_won INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT matches_pkey PRIMARY KEY (id),
    CONSTRAINT matches_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    CONSTRAINT matches_position_a_fkey FOREIGN KEY (position_a) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT matches_position_b_fkey FOREIGN KEY (position_b) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT matches_position_c_fkey FOREIGN KEY (position_c) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT matches_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL,
    CONSTRAINT matches_facilitator_id_fkey FOREIGN KEY (facilitator_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT matches_template_id_fkey FOREIGN KEY (template_id) REFERENCES schedule_templates(id) ON DELETE SET NULL
);

-- Match Sets: Set-by-set scoring details
CREATE TABLE match_sets (
    id BIGINT NOT NULL DEFAULT nextval('match_sets_id_seq'::regclass),
    match_id BIGINT NOT NULL,
    set_number INTEGER NOT NULL,
    
    -- Set scores
    team_a_score INTEGER DEFAULT 0,
    team_b_score INTEGER DEFAULT 0,
    team_c_score INTEGER DEFAULT 0,
    
    -- Set metadata
    duration_minutes INTEGER, -- How long the set took
    is_tie_break BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT match_sets_pkey PRIMARY KEY (id),
    CONSTRAINT match_sets_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT match_sets_unique_set UNIQUE (match_id, set_number)
);

-- League Standings: Calculated standings cache for performance
CREATE TABLE league_standings (
    id BIGINT NOT NULL DEFAULT nextval('league_standings_id_seq'::regclass),
    league_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    week_number INTEGER NOT NULL,
    
    -- Current tier placement
    current_tier INTEGER NOT NULL DEFAULT 1,
    tier_rank INTEGER NOT NULL DEFAULT 1, -- Rank within tier
    
    -- Match statistics
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    
    -- Set statistics  
    sets_played INTEGER DEFAULT 0,
    sets_won INTEGER DEFAULT 0,
    sets_lost INTEGER DEFAULT 0,
    
    -- Point statistics
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    point_differential INTEGER DEFAULT 0,
    
    -- Win percentages (calculated fields)
    match_win_percentage DECIMAL(5,3) DEFAULT 0.000,
    set_win_percentage DECIMAL(5,3) DEFAULT 0.000,
    
    -- Tier movement tracking
    previous_tier INTEGER,
    tier_movement INTEGER DEFAULT 0, -- -1 (down), 0 (same), +1 (up)
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT league_standings_pkey PRIMARY KEY (id),
    CONSTRAINT league_standings_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    CONSTRAINT league_standings_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT league_standings_unique_team_week UNIQUE (league_id, team_id, week_number)
);

-- Tier History: Track team tier movements over time
CREATE TABLE tier_history (
    id BIGINT NOT NULL DEFAULT nextval('tier_history_id_seq'::regclass),
    league_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    week_number INTEGER NOT NULL,
    
    -- Tier movement details
    previous_tier INTEGER,
    new_tier INTEGER NOT NULL,
    movement_type TEXT, -- 'promotion', 'relegation', 'manual', 'initial'
    
    -- Performance metrics that triggered the movement
    final_rank INTEGER,
    win_percentage DECIMAL(5,3),
    point_differential INTEGER,
    
    -- Movement metadata
    reason TEXT,
    moved_by TEXT, -- User ID who made manual changes
    automated BOOLEAN DEFAULT true,
    
    -- Timestamps
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT tier_history_pkey PRIMARY KEY (id),
    CONSTRAINT tier_history_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    CONSTRAINT tier_history_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT tier_history_moved_by_fkey FOREIGN KEY (moved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Matches indexes
CREATE INDEX matches_league_week_idx ON matches(league_id, week_number);
CREATE INDEX matches_date_idx ON matches(match_date);
CREATE INDEX matches_status_idx ON matches(status);
CREATE INDEX matches_tier_idx ON matches(tier);
CREATE INDEX matches_facilitator_idx ON matches(facilitator_id);

-- Match sets indexes
CREATE INDEX match_sets_match_id_idx ON match_sets(match_id);

-- League standings indexes
CREATE INDEX league_standings_league_week_idx ON league_standings(league_id, week_number);
CREATE INDEX league_standings_tier_rank_idx ON league_standings(current_tier, tier_rank);
CREATE INDEX league_standings_team_idx ON league_standings(team_id);

-- Tier history indexes
CREATE INDEX tier_history_league_team_idx ON tier_history(league_id, team_id);
CREATE INDEX tier_history_week_idx ON tier_history(week_number);
CREATE INDEX tier_history_effective_date_idx ON tier_history(effective_date);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update match totals when sets are modified
CREATE OR REPLACE FUNCTION update_match_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate match totals from all sets
    UPDATE matches SET
        team_a_total_points = COALESCE((
            SELECT SUM(team_a_score) FROM match_sets WHERE match_id = NEW.match_id
        ), 0),
        team_b_total_points = COALESCE((
            SELECT SUM(team_b_score) FROM match_sets WHERE match_id = NEW.match_id
        ), 0),
        team_c_total_points = COALESCE((
            SELECT SUM(team_c_score) FROM match_sets WHERE match_id = NEW.match_id
        ), 0),
        team_a_sets_won = COALESCE((
            SELECT COUNT(*) FROM match_sets 
            WHERE match_id = NEW.match_id 
            AND team_a_score > team_b_score 
            AND team_a_score > COALESCE(team_c_score, 0)
        ), 0),
        team_b_sets_won = COALESCE((
            SELECT COUNT(*) FROM match_sets 
            WHERE match_id = NEW.match_id 
            AND team_b_score > team_a_score 
            AND team_b_score > COALESCE(team_c_score, 0)
        ), 0),
        team_c_sets_won = COALESCE((
            SELECT COUNT(*) FROM match_sets 
            WHERE match_id = NEW.match_id 
            AND team_c_score > team_a_score 
            AND team_c_score > COALESCE(team_b_score, 0)
        ), 0),
        updated_at = now()
    WHERE id = NEW.match_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update match totals
CREATE TRIGGER trigger_update_match_totals
    AFTER INSERT OR UPDATE OR DELETE ON match_sets
    FOR EACH ROW EXECUTE FUNCTION update_match_totals();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INSERT DEFAULT SCHEDULE TEMPLATES
-- =============================================

-- Insert default match format templates
INSERT INTO schedule_templates (name, description, match_format, teams_per_match, sets_per_match, points_per_set, min_point_difference, tie_break_points) VALUES
('Standard 3-Team Round Robin', 'Traditional volleyball format with 3 teams playing round robin', 'round_robin_3', 3, 3, 25, 2, 15),
('4-Team Round Robin', 'Extended format with 4 teams in rotation', 'round_robin_4', 4, 3, 25, 2, 15),
('3-Team Elimination', 'Single elimination with 3 teams', 'elimination_3', 3, 3, 25, 2, 15),
('King of the Court', 'Winner stays format', 'king_court', 3, 3, 25, 2, 15),
('Pool Play Format', 'Pool-based competition', 'pool_play', 3, 3, 25, 2, 15),
('Single Elimination', 'Standard single elimination bracket', 'bracket_single', 2, 3, 25, 2, 15),
('Double Elimination', 'Double elimination tournament format', 'bracket_double', 2, 3, 25, 2, 15);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_history ENABLE ROW LEVEL SECURITY;

-- Schedule templates: Read access for all authenticated users
CREATE POLICY "Schedule templates are viewable by authenticated users" ON schedule_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Matches: Read access for all, write access for facilitators and admins
CREATE POLICY "Matches are viewable by all authenticated users" ON matches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Matches can be modified by facilitators and admins" ON matches
    FOR ALL USING (
        auth.role() = 'authenticated' AND (
            -- User is an admin
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true) OR
            -- User is the assigned facilitator
            facilitator_id = auth.uid()::text OR
            -- User is a facilitator (if is_facilitator column exists)
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_facilitator = true)
        )
    );

-- Match sets: Read access for all, write access for facilitators and admins
CREATE POLICY "Match sets are viewable by all authenticated users" ON match_sets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Match sets can be modified by facilitators and admins" ON match_sets
    FOR ALL USING (
        auth.role() = 'authenticated' AND (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true) OR
            EXISTS (
                SELECT 1 FROM matches m 
                WHERE m.id = match_id 
                AND (m.facilitator_id = auth.uid()::text OR 
                     EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_facilitator = true))
            )
        )
    );

-- League standings: Read access for all, write access for system/admins only
CREATE POLICY "League standings are viewable by all authenticated users" ON league_standings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "League standings can only be modified by admins" ON league_standings
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- Tier history: Read access for all, write access for system/admins only
CREATE POLICY "Tier history is viewable by all authenticated users" ON tier_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tier history can only be modified by admins" ON tier_history
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE schedule_templates IS 'Defines the 7 different match formats and their rules';
COMMENT ON TABLE matches IS 'Core match scheduling with tier assignments and venue details';
COMMENT ON TABLE match_sets IS 'Set-by-set scoring data for detailed volleyball tracking';
COMMENT ON TABLE league_standings IS 'Calculated standings cache updated after each match';
COMMENT ON TABLE tier_history IS 'Historical tracking of team movements between tiers';

COMMENT ON COLUMN matches.tier IS 'Tier number (1=highest, 2=second, etc.)';
COMMENT ON COLUMN matches.position_a IS 'Team assigned to position A in the match';
COMMENT ON COLUMN matches.position_b IS 'Team assigned to position B in the match';
COMMENT ON COLUMN matches.position_c IS 'Team assigned to position C (null for 2-team matches)';
COMMENT ON COLUMN league_standings.tier_movement IS 'Direction of tier movement: -1=down, 0=same, +1=up';
COMMENT ON COLUMN tier_history.movement_type IS 'Type of movement: promotion, relegation, manual, initial';