-- Helper function to clear schedule data for teams that leave a league
CREATE OR REPLACE FUNCTION cleanup_schedule_after_team_transfer(
  p_league_id BIGINT,
  p_team_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear the team from any weekly schedule entries in the source league
  UPDATE weekly_schedules
  SET
    team_a_name = CASE WHEN LOWER(team_a_name) = LOWER(p_team_name) THEN NULL ELSE team_a_name END,
    team_a_ranking = CASE WHEN LOWER(team_a_name) = LOWER(p_team_name) THEN NULL ELSE team_a_ranking END,
    team_b_name = CASE WHEN LOWER(team_b_name) = LOWER(p_team_name) THEN NULL ELSE team_b_name END,
    team_b_ranking = CASE WHEN LOWER(team_b_name) = LOWER(p_team_name) THEN NULL ELSE team_b_ranking END,
    team_c_name = CASE WHEN LOWER(team_c_name) = LOWER(p_team_name) THEN NULL ELSE team_c_name END,
    team_c_ranking = CASE WHEN LOWER(team_c_name) = LOWER(p_team_name) THEN NULL ELSE team_c_ranking END,
    team_d_name = CASE WHEN LOWER(team_d_name) = LOWER(p_team_name) THEN NULL ELSE team_d_name END,
    team_d_ranking = CASE WHEN LOWER(team_d_name) = LOWER(p_team_name) THEN NULL ELSE team_d_ranking END,
    team_e_name = CASE WHEN LOWER(team_e_name) = LOWER(p_team_name) THEN NULL ELSE team_e_name END,
    team_e_ranking = CASE WHEN LOWER(team_e_name) = LOWER(p_team_name) THEN NULL ELSE team_e_ranking END,
    team_f_name = CASE WHEN LOWER(team_f_name) = LOWER(p_team_name) THEN NULL ELSE team_f_name END,
    team_f_ranking = CASE WHEN LOWER(team_f_name) = LOWER(p_team_name) THEN NULL ELSE team_f_ranking END
  WHERE league_id = p_league_id
    AND (
      LOWER(team_a_name) = LOWER(p_team_name) OR
      LOWER(team_b_name) = LOWER(p_team_name) OR
      LOWER(team_c_name) = LOWER(p_team_name) OR
      LOWER(team_d_name) = LOWER(p_team_name) OR
      LOWER(team_e_name) = LOWER(p_team_name) OR
      LOWER(team_f_name) = LOWER(p_team_name)
    );

  -- Remove any cached results for the team in the source league
  DELETE FROM game_results
  WHERE league_id = p_league_id
    AND LOWER(team_name) = LOWER(p_team_name);
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_schedule_after_team_transfer(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_schedule_after_team_transfer(BIGINT, TEXT) TO service_role;
