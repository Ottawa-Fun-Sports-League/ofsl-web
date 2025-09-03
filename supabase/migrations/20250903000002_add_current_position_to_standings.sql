-- Add current_position field to standings table for database-level ordering
ALTER TABLE standings ADD COLUMN current_position INTEGER DEFAULT 1;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_standings_position ON standings(league_id, current_position);

-- Update existing records to set initial positions based on current performance
-- This will be a one-time data migration for existing leagues
DO $$
DECLARE
    league_record RECORD;
    team_record RECORD;
    position_counter INTEGER;
BEGIN
    -- Process each league separately
    FOR league_record IN (SELECT DISTINCT league_id FROM standings) LOOP
        position_counter := 1;
        
        -- Order teams by performance and assign positions
        FOR team_record IN (
            SELECT 
                s.id,
                s.team_id,
                t.name as team_name,
                s.points + COALESCE(s.manual_points_adjustment, 0) as total_points,
                s.wins + COALESCE(s.manual_wins_adjustment, 0) as total_wins,
                s.point_differential + COALESCE(s.manual_differential_adjustment, 0) as total_differential,
                t.created_at,
                -- Try to get schedule ranking from league_schedules
                COALESCE(
                    (
                        SELECT 
                            (jsonb_each(tier_data.value->'teams')).value->>'ranking'
                        FROM 
                            league_schedules ls,
                            jsonb_array_elements(ls.schedule_data->'tiers') tier_data
                        WHERE 
                            ls.league_id = league_record.league_id
                            AND (jsonb_each(tier_data.value->'teams')).value->>'name' = t.name
                        LIMIT 1
                    )::INTEGER,
                    999 -- Default high value if no schedule ranking found
                ) as schedule_ranking
            FROM standings s
            JOIN teams t ON t.id = s.team_id
            WHERE s.league_id = league_record.league_id
            ORDER BY 
                -- Performance-based sorting (Points > Wins > Differential > Initial Standing)
                (s.points + COALESCE(s.manual_points_adjustment, 0)) DESC,
                (s.wins + COALESCE(s.manual_wins_adjustment, 0)) DESC,
                (s.point_differential + COALESCE(s.manual_differential_adjustment, 0)) DESC,
                COALESCE(
                    (
                        SELECT 
                            (jsonb_each(tier_data.value->'teams')).value->>'ranking'
                        FROM 
                            league_schedules ls,
                            jsonb_array_elements(ls.schedule_data->'tiers') tier_data
                        WHERE 
                            ls.league_id = league_record.league_id
                            AND (jsonb_each(tier_data.value->'teams')).value->>'name' = t.name
                        LIMIT 1
                    )::INTEGER,
                    999
                ) ASC,
                t.created_at ASC
        ) LOOP
            -- Update the current_position for this team
            UPDATE standings 
            SET current_position = position_counter 
            WHERE id = team_record.id;
            
            position_counter := position_counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN standings.current_position IS 'Current competitive position in league (1=1st place, 2=2nd place, etc.) calculated from performance stats';

-- Create function to recalculate positions for a league
CREATE OR REPLACE FUNCTION recalculate_standings_positions(p_league_id INTEGER)
RETURNS VOID AS $$
DECLARE
    team_record RECORD;
    position_counter INTEGER := 1;
BEGIN
    -- Order teams by performance and update positions
    FOR team_record IN (
        SELECT 
            s.id,
            s.team_id,
            t.name as team_name,
            s.points + COALESCE(s.manual_points_adjustment, 0) as total_points,
            s.wins + COALESCE(s.manual_wins_adjustment, 0) as total_wins,
            s.point_differential + COALESCE(s.manual_differential_adjustment, 0) as total_differential,
            t.created_at,
            -- Try to get schedule ranking from league_schedules
            COALESCE(
                (
                    SELECT 
                        (jsonb_each(tier_data.value->'teams')).value->>'ranking'
                    FROM 
                        league_schedules ls,
                        jsonb_array_elements(ls.schedule_data->'tiers') tier_data
                    WHERE 
                        ls.league_id = p_league_id
                        AND (jsonb_each(tier_data.value->'teams')).value->>'name' = t.name
                    LIMIT 1
                )::INTEGER,
                999 -- Default high value if no schedule ranking found
            ) as schedule_ranking
        FROM standings s
        JOIN teams t ON t.id = s.team_id
        WHERE s.league_id = p_league_id
        ORDER BY 
            -- Performance-based sorting (Points > Wins > Differential > Initial Standing)
            (s.points + COALESCE(s.manual_points_adjustment, 0)) DESC,
            (s.wins + COALESCE(s.manual_wins_adjustment, 0)) DESC,
            (s.point_differential + COALESCE(s.manual_differential_adjustment, 0)) DESC,
            COALESCE(
                (
                    SELECT 
                        (jsonb_each(tier_data.value->'teams')).value->>'ranking'
                    FROM 
                        league_schedules ls,
                        jsonb_array_elements(ls.schedule_data->'tiers') tier_data
                    WHERE 
                        ls.league_id = p_league_id
                        AND (jsonb_each(tier_data.value->'teams')).value->>'name' = t.name
                    LIMIT 1
                )::INTEGER,
                999
            ) ASC,
            t.created_at ASC
    ) LOOP
        -- Update the current_position for this team
        UPDATE standings 
        SET current_position = position_counter 
        WHERE id = team_record.id;
        
        position_counter := position_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for the function
COMMENT ON FUNCTION recalculate_standings_positions IS 'Recalculates current_position for all teams in a league based on performance (Points > Wins > Differential > Initial Standing)';