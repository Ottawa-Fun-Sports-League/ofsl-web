-- Add no_games flag to weekly_schedules table
-- This flag indicates that no games will be played this week
ALTER TABLE weekly_schedules 
ADD COLUMN IF NOT EXISTS no_games BOOLEAN DEFAULT FALSE;

-- Add comment explaining the flag
COMMENT ON COLUMN weekly_schedules.no_games IS 'When true, indicates no games will be played this week and teams should skip to the following week';

-- Create or replace function to get week settings (including no_games flag)
CREATE OR REPLACE FUNCTION get_week_settings(p_league_id INTEGER, p_week_number INTEGER)
RETURNS TABLE (
    no_games BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(
        (SELECT ws.no_games 
         FROM weekly_schedules ws 
         WHERE ws.league_id = p_league_id 
         AND ws.week_number = p_week_number 
         LIMIT 1),
        FALSE
    ) as no_games;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to set no_games flag for a week
CREATE OR REPLACE FUNCTION set_week_no_games(p_league_id INTEGER, p_week_number INTEGER, p_no_games BOOLEAN)
RETURNS VOID AS $$
BEGIN
    -- Update all tiers for this week with the no_games flag
    UPDATE weekly_schedules 
    SET no_games = p_no_games,
        updated_at = NOW()
    WHERE league_id = p_league_id 
    AND week_number = p_week_number;
    
    -- If no rows exist for this week yet, create placeholder entries
    IF NOT FOUND AND p_no_games = TRUE THEN
        -- Get tier structure from week 1
        INSERT INTO weekly_schedules (
            league_id, week_number, tier_number, 
            location, time_slot, court, format, 
            no_games, created_at, updated_at
        )
        SELECT 
            league_id, p_week_number, tier_number,
            location, time_slot, court, format,
            TRUE, NOW(), NOW()
        FROM weekly_schedules
        WHERE league_id = p_league_id AND week_number = 1;
    END IF;
END;
$$ LANGUAGE plpgsql;