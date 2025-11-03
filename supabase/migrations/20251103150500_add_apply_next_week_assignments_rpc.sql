-- Apply next-week team placements with elevated privileges (admins/facilitators)
-- Performs: optional mark current tier completed, ensure dest tiers exist, clear duplicates, and place teams.

CREATE OR REPLACE FUNCTION public.apply_next_week_assignments(
  p_league_id integer,
  p_current_week integer,
  p_tier_number integer,
  p_dest_week integer,
  p_assignments jsonb, -- array of { target_tier:int, target_pos:text (A-F), team_name:text }
  p_mark_completed boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean := false;
  v_is_facilitator boolean := false;
  v_uid uuid := auth.uid();
  rec jsonb;
  v_target_tier int;
  v_target_pos text;
  v_team_name text;
  v_id int;
  v_tmpl record;
  v_row record;
BEGIN
  -- Authorization: only admins or facilitators may invoke
  SELECT COALESCE(is_admin,false), COALESCE(is_facilitator,false)
    INTO v_is_admin, v_is_facilitator
  FROM public.users
  WHERE users.auth_id = v_uid::text
  LIMIT 1;

  IF NOT (v_is_admin OR v_is_facilitator) THEN
    RAISE EXCEPTION 'apply_next_week_assignments: unauthorized';
  END IF;

  -- Optionally mark the current tier as completed
  IF p_mark_completed THEN
    UPDATE public.weekly_schedules
      SET is_completed = true,
          updated_at = NOW()
      WHERE league_id = p_league_id
        AND week_number = p_current_week
        AND tier_number = p_tier_number;
  END IF;

  -- Ensure destination rows exist for each target tier; copy template from current week if possible
  FOR rec IN SELECT jsonb_array_elements(COALESCE(p_assignments, '[]'::jsonb)) AS item LOOP
    v_target_tier := NULLIF(rec->>'target_tier','')::int;
    IF v_target_tier IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_id
    FROM public.weekly_schedules
    WHERE league_id = p_league_id AND week_number = p_dest_week AND tier_number = v_target_tier
    LIMIT 1;

    IF v_id IS NULL THEN
      SELECT location, time_slot, court, format
        INTO v_tmpl
      FROM public.weekly_schedules
      WHERE league_id = p_league_id AND week_number = p_current_week AND tier_number = v_target_tier
      LIMIT 1;

      INSERT INTO public.weekly_schedules (
        league_id, week_number, tier_number,
        location, time_slot, court, format,
        team_a_name, team_a_ranking,
        team_b_name, team_b_ranking,
        team_c_name, team_c_ranking,
        team_d_name, team_d_ranking,
        team_e_name, team_e_ranking,
        team_f_name, team_f_ranking,
        is_completed, no_games, is_playoff
      ) VALUES (
        p_league_id, p_dest_week, v_target_tier,
        COALESCE(v_tmpl.location, 'TBD'), COALESCE(v_tmpl.time_slot, 'TBD'), COALESCE(v_tmpl.court, 'TBD'), COALESCE(v_tmpl.format, '3-teams-6-sets'),
        NULL, NULL,
        NULL, NULL,
        NULL, NULL,
        NULL, NULL,
        NULL, NULL,
        NULL, NULL,
        false, false, false
      );
    END IF;
  END LOOP;

  -- Collect unique names to clear from destination week
  CREATE TEMP TABLE IF NOT EXISTS _tmp_names(name text) ON COMMIT DROP;
  TRUNCATE TABLE _tmp_names;
  FOR rec IN SELECT DISTINCT jsonb_array_elements(COALESCE(p_assignments, '[]'::jsonb)) AS item LOOP
    v_team_name := NULLIF(btrim(rec->>'team_name'),'');
    IF v_team_name IS NOT NULL THEN
      INSERT INTO _tmp_names(name) VALUES (v_team_name) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Clear existing occurrences across all dest-week tiers to avoid duplicates
  FOR v_row IN
    SELECT id, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name
    FROM public.weekly_schedules
    WHERE league_id = p_league_id AND week_number = p_dest_week
  LOOP
    UPDATE public.weekly_schedules
    SET
      team_a_ranking = CASE WHEN team_a_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_a_ranking END,
      team_b_ranking = CASE WHEN team_b_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_b_ranking END,
      team_c_ranking = CASE WHEN team_c_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_c_ranking END,
      team_d_ranking = CASE WHEN team_d_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_d_ranking END,
      team_e_ranking = CASE WHEN team_e_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_e_ranking END,
      team_f_ranking = CASE WHEN team_f_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_f_ranking END,
      team_a_name = CASE WHEN team_a_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_a_name END,
      team_b_name = CASE WHEN team_b_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_b_name END,
      team_c_name = CASE WHEN team_c_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_c_name END,
      team_d_name = CASE WHEN team_d_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_d_name END,
      team_e_name = CASE WHEN team_e_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_e_name END,
      team_f_name = CASE WHEN team_f_name IN (SELECT name FROM _tmp_names) THEN NULL ELSE team_f_name END,
      updated_at = NOW()
    WHERE id = v_row.id;
  END LOOP;

  -- Apply assignments
  FOR rec IN SELECT jsonb_array_elements(COALESCE(p_assignments, '[]'::jsonb)) AS item LOOP
    v_target_tier := NULLIF(rec->>'target_tier','')::int;
    v_target_pos := lower(rec->>'target_pos');
    v_team_name := NULLIF(rec->>'team_name','');
    IF v_target_tier IS NULL OR v_target_pos IS NULL OR v_team_name IS NULL THEN CONTINUE; END IF;

    EXECUTE format(
      'UPDATE public.weekly_schedules
         SET team_%1$s_name = $1,
             team_%1$s_ranking = NULL,
             updated_at = NOW()
       WHERE league_id = $2 AND week_number = $3 AND tier_number = $4',
      v_target_pos
    ) USING v_team_name, p_league_id, p_dest_week, v_target_tier;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_next_week_assignments(integer, integer, integer, integer, jsonb, boolean) TO authenticated;

