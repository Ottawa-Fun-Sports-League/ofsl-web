-- Refresh schedule template for league 12 to match latest weekly schedule data
DO $$
DECLARE
  defaults_json jsonb;
  schedule_date text;
BEGIN
  SELECT defaults::jsonb INTO defaults_json
  FROM league_schedules
  WHERE league_id = 12;

  SELECT to_char(start_date, 'FMMonth DD, YYYY') INTO schedule_date
  FROM leagues
  WHERE id = 12;

  UPDATE league_schedules ls
  SET schedule_data = jsonb_build_object(
        'date', schedule_date,
        'week', 1,
        'tiers', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'time', COALESCE(ws.time_slot, defaults_json -> ws.tier_number::text ->> 'time', 'SET_TIME'),
              'court', COALESCE(ws.court, defaults_json -> ws.tier_number::text ->> 'court', 'SET_COURT'),
              'teams', jsonb_build_object(
                'A', CASE WHEN ws.team_a_name IS NOT NULL THEN jsonb_build_object('name', ws.team_a_name, 'ranking', ws.team_a_ranking) ELSE 'null'::jsonb END,
                'B', CASE WHEN ws.team_b_name IS NOT NULL THEN jsonb_build_object('name', ws.team_b_name, 'ranking', ws.team_b_ranking) ELSE 'null'::jsonb END,
                'C', CASE WHEN ws.team_c_name IS NOT NULL THEN jsonb_build_object('name', ws.team_c_name, 'ranking', ws.team_c_ranking) ELSE 'null'::jsonb END,
                'D', CASE WHEN ws.team_d_name IS NOT NULL THEN jsonb_build_object('name', ws.team_d_name, 'ranking', ws.team_d_ranking) ELSE 'null'::jsonb END,
                'E', CASE WHEN ws.team_e_name IS NOT NULL THEN jsonb_build_object('name', ws.team_e_name, 'ranking', ws.team_e_ranking) ELSE 'null'::jsonb END,
                'F', CASE WHEN ws.team_f_name IS NOT NULL THEN jsonb_build_object('name', ws.team_f_name, 'ranking', ws.team_f_ranking) ELSE 'null'::jsonb END
              ),
              'location', COALESCE(ws.location, defaults_json -> ws.tier_number::text ->> 'location', 'SET_LOCATION'),
              'format', ws.format,
              'tierNumber', ws.tier_number,
              'displayLabel', ws.tier_number::text
            )
            ORDER BY ws.tier_number
          )
          FROM weekly_schedules ws
          WHERE ws.league_id = 12
            AND ws.week_number = 1
        )
      )
  WHERE ls.league_id = 12;
END $$;
