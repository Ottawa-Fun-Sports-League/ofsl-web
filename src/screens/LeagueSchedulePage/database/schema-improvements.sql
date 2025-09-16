-- =============================================================================
-- LEAGUE SCHEDULING DATABASE SCHEMA IMPROVEMENTS
-- =============================================================================
-- 
-- This file contains schema improvements to support:
-- 1. Better performance for schedule operations
-- 2. Future scoring and standings features
-- 3. Cleaner data structure and relationships
-- 4. Enhanced indexing for complex queries
--
-- All changes maintain backward compatibility with existing functionality
-- =============================================================================

-- Add helpful indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_league_week_tier 
ON weekly_schedules(league_id, week_number, tier_number);

CREATE INDEX IF NOT EXISTS idx_weekly_schedules_format 
ON weekly_schedules(format);

CREATE INDEX IF NOT EXISTS idx_weekly_schedules_playoff_status 
ON weekly_schedules(is_playoff) WHERE is_playoff = true;

CREATE INDEX IF NOT EXISTS idx_weekly_schedules_completion_status 
ON weekly_schedules(is_completed, week_number);

-- Add constraint to ensure tier numbers are sequential and start from 1
-- This will help with future tier management features
ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_tier_number_positive 
CHECK (tier_number > 0);

-- Add constraint to ensure valid team position data consistency
-- If team_x_name is provided, team_x_ranking should also be provided
ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_team_a_consistency 
CHECK (
  (team_a_name IS NULL AND team_a_ranking IS NULL) OR 
  (team_a_name IS NOT NULL AND team_a_ranking IS NOT NULL)
);

ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_team_b_consistency 
CHECK (
  (team_b_name IS NULL AND team_b_ranking IS NULL) OR 
  (team_b_name IS NOT NULL AND team_b_ranking IS NOT NULL)
);

ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_team_c_consistency 
CHECK (
  (team_c_name IS NULL AND team_c_ranking IS NULL) OR 
  (team_c_name IS NOT NULL AND team_c_ranking IS NOT NULL)
);

ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_team_d_consistency 
CHECK (
  (team_d_name IS NULL AND team_d_ranking IS NULL) OR 
  (team_d_name IS NOT NULL AND team_d_ranking IS NOT NULL)
);

ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_team_e_consistency 
CHECK (
  (team_e_name IS NULL AND team_e_ranking IS NULL) OR 
  (team_e_name IS NOT NULL AND team_e_ranking IS NOT NULL)
);

ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_team_f_consistency 
CHECK (
  (team_f_name IS NULL AND team_f_ranking IS NULL) OR 
  (team_f_name IS NOT NULL AND team_f_ranking IS NOT NULL)
);

-- Add constraint to ensure valid format values
ALTER TABLE weekly_schedules 
ADD CONSTRAINT check_valid_format 
CHECK (
  format IN (
    '2-teams-4-sets',
    '2-teams-best-of-3',
    '2-teams-best-of-5', 
    '2-teams-elite',
    '3-teams-6-sets',
    '3-teams-elite-6-sets',
    '3-teams-elite-9-sets',
    '4-teams-head-to-head',
    '6-teams-head-to-head'
  )
);

-- =============================================================================
-- FUTURE SCORING SYSTEM PREPARATION
-- =============================================================================

-- Enhance game_results table for future scoring features
-- Add columns that will be needed for comprehensive scoring system

-- Add set-by-set scoring capability (for detailed match results)
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS match_details JSONB;

-- Add columns for tracking game duration and completion time
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS game_start_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS game_end_time TIMESTAMP WITH TIME ZONE;

-- Add column for referee/scorekeeper information
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS recorded_by TEXT;

-- Add column for match notes (fouls, incidents, etc.)
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS match_notes TEXT;

-- Create index for game results performance
CREATE INDEX IF NOT EXISTS idx_game_results_completion_time 
ON game_results(game_end_time) WHERE game_end_time IS NOT NULL;

-- =============================================================================
-- TIER MANAGEMENT OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Function to get all teams in a specific tier across all weeks
-- This will be useful for team movement tracking and statistics
CREATE OR REPLACE FUNCTION get_tier_team_history(
  p_league_id INTEGER,
  p_tier_number INTEGER
)
RETURNS TABLE (
  week_number INTEGER,
  team_name TEXT,
  team_ranking INTEGER,
  "position" TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.week_number,
    team.name::TEXT,
    team.ranking::INTEGER,
    team."position"::TEXT
  FROM weekly_schedules ws
  CROSS JOIN LATERAL (
    VALUES 
      (ws.team_a_name, ws.team_a_ranking, 'A'),
      (ws.team_b_name, ws.team_b_ranking, 'B'),
      (ws.team_c_name, ws.team_c_ranking, 'C'),
      (ws.team_d_name, ws.team_d_ranking, 'D'),
      (ws.team_e_name, ws.team_e_ranking, 'E'),
      (ws.team_f_name, ws.team_f_ranking, 'F')
  ) AS team(name, ranking, "position")
  WHERE ws.league_id = p_league_id
    AND ws.tier_number = p_tier_number
    AND team.name IS NOT NULL
  ORDER BY ws.week_number, team."position";
END;
$$;

-- Function to validate tier team capacity based on format
-- This will be used for format validation before changes are applied
CREATE OR REPLACE FUNCTION validate_tier_team_capacity(
  p_tier_id INTEGER,
  p_new_format TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_team_count INTEGER,
  max_allowed_teams INTEGER,
  teams_that_would_be_removed TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_teams TEXT[];
  format_capacity INTEGER;
BEGIN
  -- Get current teams
  SELECT ARRAY[
    team_a_name, team_b_name, team_c_name,
    team_d_name, team_e_name, team_f_name
  ]
  INTO current_teams
  FROM weekly_schedules
  WHERE id = p_tier_id;
  
  -- Remove null values
  current_teams := ARRAY(SELECT unnest(current_teams) WHERE unnest IS NOT NULL);
  
  -- Get format capacity
  format_capacity := CASE 
    WHEN p_new_format IN ('2-teams-4-sets', '2-teams-best-of-3', '2-teams-best-of-5', '2-teams-elite') THEN 2
    WHEN p_new_format IN ('3-teams-6-sets', '3-teams-elite-6-sets', '3-teams-elite-9-sets') THEN 3
    WHEN p_new_format = '4-teams-head-to-head' THEN 4
    WHEN p_new_format = '6-teams-head-to-head' THEN 6
    ELSE 3
  END;
  
  RETURN QUERY
  SELECT 
    array_length(current_teams, 1) <= format_capacity,
    COALESCE(array_length(current_teams, 1), 0),
    format_capacity,
    CASE 
      WHEN array_length(current_teams, 1) > format_capacity 
      THEN current_teams[format_capacity + 1 : array_length(current_teams, 1)]
      ELSE ARRAY[]::TEXT[]
    END;
END;
$$;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION VIEWS
-- =============================================================================

-- Materialized view for quick access to league schedule summaries
-- This will speed up dashboard and overview queries
CREATE MATERIALIZED VIEW IF NOT EXISTS league_schedule_summary AS
SELECT 
  league_id,
  week_number,
  COUNT(*) as total_tiers,
  COUNT(CASE WHEN is_completed THEN 1 END) as completed_tiers,
  COUNT(CASE WHEN no_games = true THEN 1 END) as no_game_tiers,
  COUNT(CASE WHEN is_playoff = true THEN 1 END) as playoff_tiers,
  ARRAY_AGG(DISTINCT format) as formats_used,
  MIN(tier_number) as min_tier,
  MAX(tier_number) as max_tier,
  MAX(updated_at) as last_updated
FROM weekly_schedules
GROUP BY league_id, week_number;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_league_schedule_summary_unique
ON league_schedule_summary(league_id, week_number);

-- Function to refresh the materialized view (to be called after schedule changes)
CREATE OR REPLACE FUNCTION refresh_league_schedule_summary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY league_schedule_summary;
END;
$$;

-- =============================================================================
-- DATA INTEGRITY AND CLEANUP
-- =============================================================================

-- Function to clean up orphaned or invalid schedule entries
CREATE OR REPLACE FUNCTION cleanup_invalid_schedule_entries()
RETURNS TABLE (
  cleaned_entries INTEGER,
  issues_found TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  cleanup_count INTEGER := 0;
  found_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check for tiers with invalid team/ranking combinations
  WITH invalid_teams AS (
    SELECT id, 'Inconsistent team/ranking data' as issue
    FROM weekly_schedules 
    WHERE (
      (team_a_name IS NULL) != (team_a_ranking IS NULL) OR
      (team_b_name IS NULL) != (team_b_ranking IS NULL) OR
      (team_c_name IS NULL) != (team_c_ranking IS NULL) OR
      (team_d_name IS NULL) != (team_d_ranking IS NULL) OR
      (team_e_name IS NULL) != (team_e_ranking IS NULL) OR
      (team_f_name IS NULL) != (team_f_ranking IS NULL)
    )
  )
  SELECT array_agg(issue) INTO found_issues FROM invalid_teams;
  
  -- Additional integrity checks can be added here
  
  RETURN QUERY SELECT cleanup_count, COALESCE(found_issues, ARRAY[]::TEXT[]);
END;
$$;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE weekly_schedules IS 'Enhanced weekly schedule table with improved constraints and indexing for performance';
COMMENT ON FUNCTION get_tier_team_history IS 'Retrieves complete team movement history for a specific tier across all weeks';
COMMENT ON FUNCTION validate_tier_team_capacity IS 'Validates if a tier can accommodate a format change without losing teams';
COMMENT ON MATERIALIZED VIEW league_schedule_summary IS 'Performance-optimized summary view for league schedule dashboards';
COMMENT ON FUNCTION refresh_league_schedule_summary IS 'Refreshes the materialized view after schedule modifications';
COMMENT ON FUNCTION cleanup_invalid_schedule_entries IS 'Identifies and cleans up data integrity issues in schedule tables';

