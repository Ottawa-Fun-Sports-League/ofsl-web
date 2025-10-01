-- Ensure all helper functions from staging exist in main

-- Optimized tier management helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION add_tier_optimized(
  p_league_id INTEGER,
  p_current_week INTEGER,
  p_after_tier INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_week INTEGER;
  v_new_tier INTEGER;
BEGIN
  SELECT COALESCE(MAX(week_number), p_current_week)
  INTO v_max_week
  FROM weekly_schedules
  WHERE league_id = p_league_id;

  v_new_tier := p_after_tier + 1;

  UPDATE weekly_schedules
  SET tier_number = tier_number + 1000
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > p_after_tier;

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

  UPDATE weekly_schedules
  SET tier_number = tier_number - 1000 + 1
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > 1000;
END;
$$;

CREATE OR REPLACE FUNCTION remove_tier_optimized(
  p_league_id INTEGER,
  p_current_week INTEGER,
  p_tier_number INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM weekly_schedules
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number = p_tier_number;

  UPDATE weekly_schedules
  SET tier_number = tier_number - 1
  WHERE league_id = p_league_id
    AND week_number >= p_current_week
    AND tier_number > p_tier_number;
END;
$$;

COMMENT ON FUNCTION add_tier_optimized IS 'Optimized function to add a tier using a single transaction with pure SQL for leagues with up to 35 weeks and 30 tiers';
COMMENT ON FUNCTION remove_tier_optimized IS 'Optimized function to remove a tier using a single transaction with pure SQL for leagues with up to 35 weeks and 30 tiers';

-- Weekly schedule navigation helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION get_next_playable_week(
  p_league_id INTEGER,
  p_start_week INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate INTEGER := p_start_week;
  v_all_no_games BOOLEAN;
  v_count INTEGER;
  i INTEGER := 0;
BEGIN
  LOOP
    i := i + 1;
    IF i > 104 THEN
      RETURN v_candidate;
    END IF;

    SELECT COUNT(*), BOOL_AND(COALESCE(no_games, FALSE))
    INTO v_count, v_all_no_games
    FROM weekly_schedules
    WHERE league_id = p_league_id
      AND week_number = v_candidate;

    IF v_count = 0 THEN
      RETURN v_candidate;
    ELSIF v_all_no_games = FALSE THEN
      RETURN v_candidate;
    ELSE
      v_candidate := v_candidate + 1;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_first_future_week_with_rows(
  p_league_id INTEGER,
  p_after_week INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate INTEGER := p_after_week + 1;
  v_count INTEGER;
  i INTEGER := 0;
BEGIN
  LOOP
    i := i + 1;
    IF i > 104 THEN
      RETURN p_after_week + 1;
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM weekly_schedules
    WHERE league_id = p_league_id
      AND week_number = v_candidate;

    IF v_count > 0 THEN
      RETURN v_candidate;
    END IF;

    v_candidate := v_candidate + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION apply_week_bump_auto(
  p_league_id INTEGER,
  p_from_week INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_to_week INTEGER;
BEGIN
  v_to_week := get_next_playable_week(p_league_id, p_from_week + 1);
  PERFORM apply_week_bump(p_league_id, p_from_week, v_to_week);
END;
$$;

CREATE OR REPLACE FUNCTION apply_week_rewind_auto(
  p_league_id INTEGER,
  p_to_week INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_week INTEGER;
BEGIN
  v_from_week := get_first_future_week_with_rows(p_league_id, p_to_week);
  PERFORM apply_week_bump(p_league_id, v_from_week, p_to_week);
END;
$$;

-- League schedule analytics helpers --------------------------------------------------
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

CREATE MATERIALIZED VIEW IF NOT EXISTS league_schedule_summary AS
SELECT
  league_id,
  week_number,
  COUNT(*) AS total_tiers,
  COUNT(CASE WHEN is_completed THEN 1 END) AS completed_tiers,
  COUNT(CASE WHEN no_games = TRUE THEN 1 END) AS no_game_tiers,
  COUNT(CASE WHEN is_playoff = TRUE THEN 1 END) AS playoff_tiers,
  ARRAY_AGG(DISTINCT format) AS formats_used,
  MIN(tier_number) AS min_tier,
  MAX(tier_number) AS max_tier,
  MAX(updated_at) AS last_updated
FROM weekly_schedules
GROUP BY league_id, week_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_schedule_summary_unique
ON league_schedule_summary (league_id, week_number);

CREATE OR REPLACE FUNCTION refresh_league_schedule_summary()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY league_schedule_summary;
END;
$$;

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
  WITH invalid_teams AS (
    SELECT id, 'Inconsistent team/ranking data' AS issue
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

  RETURN QUERY SELECT cleanup_count, COALESCE(found_issues, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION get_tier_team_history(INTEGER, INTEGER) IS 'Retrieves complete team movement history for a specific tier across all weeks';
COMMENT ON FUNCTION refresh_league_schedule_summary() IS 'Refreshes the league_schedule_summary materialized view after schedule modifications';
COMMENT ON FUNCTION cleanup_invalid_schedule_entries() IS 'Identifies and reports potential data integrity issues within weekly schedules';

-- User profile utilities ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_and_fix_user_profile_v3(
  p_auth_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
  user_id TEXT;
  now_timestamp TIMESTAMPTZ := now();
  v_result BOOLEAN := FALSE;
BEGIN
  user_id := p_auth_id;

  SELECT EXISTS(
    SELECT 1
    FROM public.users
    WHERE auth_id = user_id::uuid
  )
  INTO user_exists;

  IF user_exists THEN
    RETURN FALSE;
  END IF;

  IF p_email IS NOT NULL AND p_email != '' THEN
    DECLARE
      existing_user_id TEXT;
    BEGIN
      SELECT id
      INTO existing_user_id
      FROM public.users
      WHERE email = p_email
        AND email != ''
        AND auth_id IS NULL
      LIMIT 1;

      IF existing_user_id IS NOT NULL THEN
        UPDATE public.users
        SET
          auth_id = user_id::uuid,
          name = COALESCE(NULLIF(p_name, ''), name),
          phone = COALESCE(NULLIF(p_phone, ''), phone),
          date_modified = now_timestamp
        WHERE id = existing_user_id;

        RETURN TRUE;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error checking for existing user by email: %', SQLERRM;
    END;
  END IF;

  BEGIN
    INSERT INTO public.users (
      id,
      auth_id,
      name,
      email,
      phone,
      date_created,
      date_modified,
      is_admin
    ) VALUES (
      user_id,
      user_id::uuid,
      COALESCE(p_name, ''),
      COALESCE(p_email, ''),
      COALESCE(p_phone, ''),
      now_timestamp,
      now_timestamp,
      FALSE
    );

    v_result := TRUE;
  EXCEPTION
    WHEN unique_violation THEN
      BEGIN
        UPDATE public.users
        SET
          auth_id = user_id::uuid,
          name = COALESCE(NULLIF(p_name, ''), name),
          email = COALESCE(NULLIF(p_email, ''), email),
          phone = COALESCE(NULLIF(p_phone, ''), phone),
          date_modified = now_timestamp
        WHERE id = user_id
           OR (email = p_email AND email != '');

        v_result := TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error updating existing user: %', SQLERRM;
          v_result := FALSE;
      END;
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating user profile: %', SQLERRM;
      v_result := FALSE;
  END;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_and_fix_user_profile_v3(TEXT, TEXT, TEXT, TEXT) TO authenticated;
COMMENT ON FUNCTION check_and_fix_user_profile_v3(TEXT, TEXT, TEXT, TEXT) IS 'Enhanced helper that ensures a public.users profile exists for a given auth user, creating or updating records as needed';
