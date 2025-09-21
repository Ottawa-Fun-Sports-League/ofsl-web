-- Fix standings position recalculation to avoid set-returning functions in WHERE clauses
-- and align with PostgreSQL 15 behaviour (set-returning functions must be in FROM/CROSS JOIN).

CREATE OR REPLACE FUNCTION recalculate_standings_positions(p_league_id INTEGER)
RETURNS VOID AS $$
DECLARE
    team_record RECORD;
    position_counter INTEGER := 1;
BEGIN
    FOR team_record IN (
        WITH team_rankings AS (
            SELECT
                team_attrs.value->>'name' AS team_name,
                MIN(
                    CASE
                        WHEN (team_attrs.value->>'ranking') ~ '^-?\\d+$'
                            THEN (team_attrs.value->>'ranking')::INTEGER
                        ELSE NULL
                    END
                ) AS schedule_ranking
            FROM league_schedules ls
            CROSS JOIN LATERAL jsonb_array_elements(ls.schedule_data->'tiers') AS tier(tier_json)
            CROSS JOIN LATERAL jsonb_each(tier.tier_json->'teams') AS team_attrs(key, value)
            WHERE ls.league_id = p_league_id
            GROUP BY team_attrs.value->>'name'
        )
        SELECT
            s.id,
            s.team_id,
            t.name AS team_name,
            s.points + COALESCE(s.manual_points_adjustment, 0) AS total_points,
            s.wins + COALESCE(s.manual_wins_adjustment, 0) AS total_wins,
            s.point_differential + COALESCE(s.manual_differential_adjustment, 0) AS total_differential,
            t.created_at,
            COALESCE(tr.schedule_ranking, 999) AS schedule_ranking
        FROM standings s
        JOIN teams t ON t.id = s.team_id
        LEFT JOIN team_rankings tr ON tr.team_name = t.name
        WHERE s.league_id = p_league_id
        ORDER BY
            total_points DESC,
            total_wins DESC,
            total_differential DESC,
            COALESCE(tr.schedule_ranking, 999) ASC,
            t.created_at ASC
    ) LOOP
        UPDATE standings
        SET current_position = position_counter
        WHERE id = team_record.id;

        position_counter := position_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_standings_positions IS 'Recalculates current_position for all teams in a league based on performance (Points > Wins > Differential > Initial Standing).';
