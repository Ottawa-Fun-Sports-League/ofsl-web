-- Add optimized RPC functions for tier management operations
-- These functions use single transactions and pure SQL for maximum performance

-- Function to add a tier efficiently
CREATE OR REPLACE FUNCTION add_tier_optimized(
  p_league_id INTEGER,
  p_current_week INTEGER,
  p_after_tier INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_week INTEGER;
  v_new_tier INTEGER;
BEGIN
  -- Start transaction
  -- Get max week for the league
  SELECT COALESCE(MAX(week_number), p_current_week)
  INTO v_max_week
  FROM weekly_schedules
  WHERE league_id = p_league_id;
  
  v_new_tier := p_after_tier + 1;
  
  -- Step 1: Shift existing tier numbers up by adding 1000 to avoid conflicts
  UPDATE weekly_schedules 
  SET tier_number = tier_number + 1000
  WHERE league_id = p_league_id 
    AND week_number >= p_current_week 
    AND tier_number > p_after_tier;
  
  -- Step 2: Insert new tier records for current week and all future weeks
  INSERT INTO weekly_schedules (
    league_id, week_number, tier_number, location, time_slot, court,
    team_a_name, team_b_name, team_c_name, team_a_ranking, team_b_ranking, team_c_ranking,
    is_completed, no_games, format
  )
  SELECT 
    p_league_id,
    generate_series(p_current_week, v_max_week) AS week_number,
    v_new_tier,
    'SET_LOCATION',
    'SET_TIME', 
    'SET_COURT',
    NULL, NULL, NULL, NULL, NULL, NULL,
    FALSE, FALSE, '3-teams-6-sets';
  
  -- Step 3: Shift the temporarily offset tiers back to correct positions
  UPDATE weekly_schedules 
  SET tier_number = tier_number - 1000 + 1
  WHERE league_id = p_league_id 
    AND week_number >= p_current_week 
    AND tier_number > 1000;
    
END;
$$;

-- Function to remove a tier efficiently  
CREATE OR REPLACE FUNCTION remove_tier_optimized(
  p_league_id INTEGER,
  p_current_week INTEGER,
  p_tier_number INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Start transaction
  -- Step 1: Delete the tier from current week and all future weeks
  DELETE FROM weekly_schedules
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number = p_tier_number;
  
  -- Step 2: Shift remaining tier numbers down by 1 (single UPDATE)
  UPDATE weekly_schedules
  SET tier_number = tier_number - 1
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > p_tier_number;
    
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION add_tier_optimized IS 'Optimized function to add a tier using single transaction with pure SQL for leagues with up to 35 weeks and 30 tiers';
COMMENT ON FUNCTION remove_tier_optimized IS 'Optimized function to remove a tier using single transaction with pure SQL for leagues with up to 35 weeks and 30 tiers';