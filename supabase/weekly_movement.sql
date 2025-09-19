-- Weekly movement helpers: compute next playable week and apply bump/rewind transactionally

CREATE OR REPLACE FUNCTION get_next_playable_week(
  p_league_id integer,
  p_start_week integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate integer := p_start_week;
  v_all_no_games boolean;
  v_count integer;
  i integer := 0;
BEGIN
  LOOP
    i := i + 1;
    IF i > 104 THEN RETURN v_candidate; END IF; -- safety

    SELECT COUNT(*), BOOL_AND(COALESCE(no_games,false))
    INTO v_count, v_all_no_games
    FROM weekly_schedules
    WHERE league_id = p_league_id AND week_number = v_candidate;

    IF v_count = 0 THEN
      RETURN v_candidate; -- no rows: treat as playable
    ELSIF v_all_no_games = FALSE THEN
      RETURN v_candidate; -- has at least one tier playable
    ELSE
      v_candidate := v_candidate + 1; -- skip
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_first_future_week_with_rows(
  p_league_id integer,
  p_after_week integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate integer := p_after_week + 1;
  v_count integer;
  i integer := 0;
BEGIN
  LOOP
    i := i + 1;
    IF i > 104 THEN RETURN p_after_week + 1; END IF; -- fallback
    SELECT COUNT(*) INTO v_count FROM weekly_schedules WHERE league_id = p_league_id AND week_number = v_candidate;
    IF v_count > 0 THEN RETURN v_candidate; END IF;
    v_candidate := v_candidate + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION apply_week_bump_auto(
  p_league_id integer,
  p_from_week integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_to_week integer;
BEGIN
  v_to_week := get_next_playable_week(p_league_id, p_from_week + 1);
  PERFORM apply_week_bump(p_league_id, p_from_week, v_to_week);
END;
$$;

CREATE OR REPLACE FUNCTION apply_week_rewind_auto(
  p_league_id integer,
  p_to_week integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_week integer;
BEGIN
  v_from_week := get_first_future_week_with_rows(p_league_id, p_to_week);
  PERFORM apply_week_bump(p_league_id, v_from_week, p_to_week);
END;
$$;

