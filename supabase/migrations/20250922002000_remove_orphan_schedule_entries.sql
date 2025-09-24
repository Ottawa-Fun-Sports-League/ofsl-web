-- Remove schedule entries for teams that no longer belong to a league
WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
UPDATE weekly_schedules ws
SET team_a_name = NULL,
    team_a_ranking = NULL
WHERE team_a_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM normalized_teams t
    WHERE t.league_id = ws.league_id
      AND t.normalized_name = LOWER(TRIM(ws.team_a_name))
  );

WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
UPDATE weekly_schedules ws
SET team_b_name = NULL,
    team_b_ranking = NULL
WHERE team_b_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM normalized_teams t
    WHERE t.league_id = ws.league_id
      AND t.normalized_name = LOWER(TRIM(ws.team_b_name))
  );

WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
UPDATE weekly_schedules ws
SET team_c_name = NULL,
    team_c_ranking = NULL
WHERE team_c_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM normalized_teams t
    WHERE t.league_id = ws.league_id
      AND t.normalized_name = LOWER(TRIM(ws.team_c_name))
  );

WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
UPDATE weekly_schedules ws
SET team_d_name = NULL,
    team_d_ranking = NULL
WHERE team_d_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM normalized_teams t
    WHERE t.league_id = ws.league_id
      AND t.normalized_name = LOWER(TRIM(ws.team_d_name))
  );

WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
UPDATE weekly_schedules ws
SET team_e_name = NULL,
    team_e_ranking = NULL
WHERE team_e_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM normalized_teams t
    WHERE t.league_id = ws.league_id
      AND t.normalized_name = LOWER(TRIM(ws.team_e_name))
  );

WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
UPDATE weekly_schedules ws
SET team_f_name = NULL,
    team_f_ranking = NULL
WHERE team_f_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM normalized_teams t
    WHERE t.league_id = ws.league_id
      AND t.normalized_name = LOWER(TRIM(ws.team_f_name))
  );

-- Remove orphaned game results for teams no longer in the league
WITH normalized_teams AS (
  SELECT id, league_id, LOWER(TRIM(name)) AS normalized_name
  FROM teams
)
DELETE FROM game_results gr
WHERE NOT EXISTS (
  SELECT 1
  FROM normalized_teams t
  WHERE t.league_id = gr.league_id
    AND t.normalized_name = LOWER(TRIM(gr.team_name))
);
