-- Applies a weekly bump of A/B/C placements from p_from_week to p_to_week for a league, transactionally.
-- Ensures destination rows exist, clears duplicates, copies A/B/C same tier, then clears source.

CREATE OR REPLACE FUNCTION apply_week_bump(
  p_league_id integer,
  p_from_week integer,
  p_to_week integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  IF p_from_week = p_to_week THEN
    RETURN;
  END IF;

  PERFORM 1;
  -- Clear duplicates in destination for any names that will be copied
  -- Collect names first
  CREATE TEMP TABLE tmp_names(name text) ON COMMIT DROP;
  INSERT INTO tmp_names(name)
  SELECT DISTINCT unnest(ARRAY[ws.team_a_name, ws.team_b_name, ws.team_c_name])
  FROM weekly_schedules ws
  WHERE ws.league_id = p_league_id AND ws.week_number = p_from_week;

  -- Remove nulls
  DELETE FROM tmp_names WHERE name IS NULL;

  -- Clear any matching names in destination week (A..F)
  UPDATE weekly_schedules d
  SET team_a_name = CASE WHEN d.team_a_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_a_name END,
      team_a_ranking = CASE WHEN d.team_a_name IS NULL THEN NULL ELSE d.team_a_ranking END,
      team_b_name = CASE WHEN d.team_b_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_b_name END,
      team_b_ranking = CASE WHEN d.team_b_name IS NULL THEN NULL ELSE d.team_b_ranking END,
      team_c_name = CASE WHEN d.team_c_name IN (SELECT name FROM tmp_names) THEN NULL ELSE d.team_c_name END,
      team_c_ranking = CASE WHEN d.team_c_name IS NULL THEN NULL ELSE d.team_c_ranking END
  WHERE d.league_id = p_league_id AND d.week_number = p_to_week;

  -- Ensure destination rows exist for all tiers present in source
  INSERT INTO weekly_schedules (
    league_id, week_number, tier_number,
    location, time_slot, court, format,
    team_a_name, team_a_ranking,
    team_b_name, team_b_ranking,
    team_c_name, team_c_ranking,
    team_d_name, team_d_ranking,
    team_e_name, team_e_ranking,
    team_f_name, team_f_ranking,
    is_completed, no_games, is_playoff
  )
  SELECT s.league_id, p_to_week, s.tier_number,
         s.location, s.time_slot, s.court, s.format,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         NULL, NULL,
         FALSE, FALSE, COALESCE(s.is_playoff, FALSE)
  FROM weekly_schedules s
  WHERE s.league_id = p_league_id AND s.week_number = p_from_week
    AND NOT EXISTS (
      SELECT 1 FROM weekly_schedules d
      WHERE d.league_id = p_league_id AND d.week_number = p_to_week AND d.tier_number = s.tier_number
    );

  -- Copy A/B/C to destination same tier
  UPDATE weekly_schedules d
  SET team_a_name = s.team_a_name,
      team_a_ranking = s.team_a_ranking,
      team_b_name = s.team_b_name,
      team_b_ranking = s.team_b_ranking,
      team_c_name = s.team_c_name,
      team_c_ranking = s.team_c_ranking
  FROM weekly_schedules s
  WHERE s.league_id = p_league_id AND s.week_number = p_from_week
    AND d.league_id = p_league_id AND d.week_number = p_to_week AND d.tier_number = s.tier_number;

  -- Clear A/B/C in source after copy
  UPDATE weekly_schedules s
  SET team_a_name = NULL, team_a_ranking = NULL,
      team_b_name = NULL, team_b_ranking = NULL,
      team_c_name = NULL, team_c_ranking = NULL
  WHERE s.league_id = p_league_id AND s.week_number = p_from_week;

END;
$$;

