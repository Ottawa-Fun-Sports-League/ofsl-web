-- Update get_users_paginated_admin to compute current_registrations
-- including team memberships (captain, co-captain, roster) and
-- individual registrations, limited to active/ongoing leagues.

DROP FUNCTION IF EXISTS get_users_paginated_admin(
    INTEGER, INTEGER, TEXT, TEXT, TEXT, 
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
);

CREATE OR REPLACE FUNCTION get_users_paginated_admin(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT '',
    p_sort_field TEXT DEFAULT 'date_created',
    p_sort_direction TEXT DEFAULT 'desc',
    p_administrator BOOLEAN DEFAULT FALSE,
    p_facilitator BOOLEAN DEFAULT FALSE,
    p_active_player BOOLEAN DEFAULT FALSE,
    p_pending_users BOOLEAN DEFAULT FALSE,
    p_volleyball_players_in_league BOOLEAN DEFAULT FALSE,
    p_badminton_players_in_league BOOLEAN DEFAULT FALSE,
    p_volleyball_players_all BOOLEAN DEFAULT FALSE,
    p_badminton_players_all BOOLEAN DEFAULT FALSE,
    p_players_not_in_league BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    profile_id TEXT,
    auth_id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    is_admin BOOLEAN,
    is_facilitator BOOLEAN,
    date_created TIMESTAMP WITH TIME ZONE,
    date_modified TIMESTAMP WITH TIME ZONE,
    team_ids TEXT[],
    league_ids BIGINT[],
    user_sports_skills JSONB,
    status TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    auth_created_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT,
    total_owed NUMERIC,
    total_paid NUMERIC,
    current_registrations JSONB
) AS $$
DECLARE
    v_search_term TEXT := LOWER('%' || p_search || '%');
    v_sort_sql TEXT;
    v_where_conditions TEXT[] := ARRAY[]::TEXT[];
    v_final_query TEXT;
BEGIN
    -- Admin check
    IF NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid() 
        AND u.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can access this function';
    END IF;

    -- WHERE conditions
    IF p_search != '' THEN
        v_where_conditions := array_append(v_where_conditions, 
            '(LOWER(cd.name) LIKE ''' || v_search_term || ''' OR LOWER(cd.email) LIKE ''' || v_search_term || ''')');
    END IF;
    IF p_administrator THEN v_where_conditions := array_append(v_where_conditions, 'cd.is_admin = true'); END IF;
    IF p_facilitator THEN v_where_conditions := array_append(v_where_conditions, 'cd.is_facilitator = true'); END IF;
    IF p_pending_users THEN v_where_conditions := array_append(v_where_conditions, 'cd.status IN (''unconfirmed'', ''confirmed_no_profile'', ''profile_incomplete'')'); END IF;
    IF p_active_player THEN v_where_conditions := array_append(v_where_conditions, 'cd.status = ''active'''); END IF;

    -- Sport-specific filters based on individual league_payments
    IF p_volleyball_players_in_league THEN
        v_where_conditions := array_append(v_where_conditions, 
            'EXISTS (SELECT 1 FROM league_payments lp JOIN leagues l ON lp.league_id = l.id JOIN sports s ON l.sport_id = s.id WHERE lp.user_id = cd.profile_id AND s.name = ''Volleyball'' AND lp.is_waitlisted = false)');
    END IF;
    IF p_badminton_players_in_league THEN
        v_where_conditions := array_append(v_where_conditions, 
            'EXISTS (SELECT 1 FROM league_payments lp JOIN leagues l ON lp.league_id = l.id JOIN sports s ON l.sport_id = s.id WHERE lp.user_id = cd.profile_id AND s.name = ''Badminton'' AND lp.is_waitlisted = false)');
    END IF;
    IF p_volleyball_players_all THEN
        v_where_conditions := array_append(v_where_conditions, 'cd.user_sports_skills::text LIKE ''%"sport":"Volleyball"%''');
    END IF;
    IF p_badminton_players_all THEN
        v_where_conditions := array_append(v_where_conditions, 'cd.user_sports_skills::text LIKE ''%"sport":"Badminton"%''');
    END IF;
    IF p_players_not_in_league THEN
        v_where_conditions := array_append(v_where_conditions, 'NOT EXISTS (SELECT 1 FROM league_payments lp WHERE lp.user_id = cd.profile_id AND lp.is_waitlisted = false)');
    END IF;

    -- Sort clause
    CASE p_sort_field
        WHEN 'name' THEN v_sort_sql := 'name';
        WHEN 'email' THEN v_sort_sql := 'email';
        WHEN 'date_created' THEN v_sort_sql := 'date_created';
        WHEN 'last_sign_in_at' THEN v_sort_sql := 'last_sign_in_at';
        WHEN 'status' THEN v_sort_sql := 'status';
        ELSE v_sort_sql := 'date_created';
    END CASE;
    IF UPPER(p_sort_direction) = 'ASC' THEN
        v_sort_sql := v_sort_sql || ' ASC NULLS LAST';
    ELSE
        v_sort_sql := v_sort_sql || ' DESC NULLS LAST';
    END IF;

    -- Final query with CTEs
    v_final_query := '
    WITH auth_users AS (
        SELECT au.id AS auth_user_id, au.email AS auth_email, au.email_confirmed_at, au.created_at AS auth_created_at, au.last_sign_in_at
        FROM auth.users au
    ),
    user_profiles AS (
        SELECT u.id AS profile_id, u.auth_id AS profile_auth_id, u.name, u.email AS profile_email, u.phone, u.is_admin, u.is_facilitator,
               u.date_created::timestamptz AS date_created, u.date_modified::timestamptz AS date_modified,
               u.team_ids::text[] AS team_ids, u.league_ids, u.user_sports_skills, u.profile_completed
        FROM users u
    ),
    combined_data AS (
        SELECT up.profile_id,
               COALESCE(up.profile_auth_id, au.auth_user_id) AS combined_auth_id,
               up.name,
               COALESCE(up.profile_email, au.auth_email) AS email,
               up.phone,
               up.is_admin,
               up.is_facilitator,
               COALESCE(up.date_created, au.auth_created_at) AS date_created,
               up.date_modified,
               au.auth_created_at,
               up.team_ids,
               up.league_ids,
               up.user_sports_skills,
               CASE 
                 WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NULL THEN ''unconfirmed''
                 WHEN up.profile_id IS NULL AND au.email_confirmed_at IS NOT NULL THEN ''confirmed_no_profile''
                 WHEN up.profile_completed = false THEN ''profile_incomplete''
                 ELSE ''active''
               END AS status,
               au.email_confirmed_at AS confirmed_at,
               au.last_sign_in_at
        FROM auth_users au
        LEFT JOIN user_profiles up ON au.auth_user_id = up.profile_auth_id
    ),
    payment_totals AS (
        SELECT lp.user_id,
               SUM(lp.amount_due) AS total_owed,
               SUM(lp.amount_paid) AS total_paid
        FROM league_payments lp
        GROUP BY lp.user_id
    ),
    -- Team memberships across active/ongoing leagues
    team_memberships AS (
        SELECT t.captain_id AS user_id, t.id AS team_id, l.id AS league_id, l.name AS league_name, ''captain''::text AS role
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        WHERE t.active = true AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        UNION ALL
        SELECT co_cap AS user_id, t.id, l.id, l.name, ''co_captain''::text AS role
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        CROSS JOIN LATERAL UNNEST(COALESCE(t.co_captains, ARRAY[]::text[])) AS co_cap
        WHERE t.active = true AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        UNION ALL
        SELECT roster_user AS user_id, t.id, l.id, l.name, ''player''::text AS role
        FROM teams t
        JOIN leagues l ON l.id = t.league_id
        CROSS JOIN LATERAL UNNEST(COALESCE(t.roster, ARRAY[]::text[])) AS roster_user
        WHERE t.active = true AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
    ),
    -- Individual active registrations (non-waitlist)
    individual_regs AS (
        SELECT lp.user_id, NULL::bigint AS team_id, l.id AS league_id, l.name AS league_name, ''individual''::text AS role
        FROM league_payments lp
        JOIN leagues l ON l.id = lp.league_id
        WHERE lp.team_id IS NULL AND COALESCE(lp.is_waitlisted, false) = false
          AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        GROUP BY lp.user_id, l.id, l.name
    ),
    combined_regs AS (
        SELECT user_id,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   ''league_id'', league_id,
                   ''league_name'', league_name,
                   ''team_id'', team_id,
                   ''role'', role,
                   ''registration_type'', CASE WHEN role = ''individual'' THEN ''individual'' ELSE ''team'' END
                 )
                 ORDER BY league_name
               ) AS current_registrations
        FROM (
          SELECT * FROM team_memberships
          UNION ALL
          SELECT * FROM individual_regs
        ) all_regs
        GROUP BY user_id
    ),
    filtered_data AS (
        SELECT cd.profile_id,
               cd.combined_auth_id AS auth_id,
               cd.name,
               cd.email,
               cd.phone,
               cd.is_admin,
               cd.is_facilitator,
               cd.date_created,
               cd.date_modified,
               cd.team_ids,
               cd.league_ids,
               cd.user_sports_skills,
               cd.status,
               cd.confirmed_at,
               cd.last_sign_in_at,
               cd.auth_created_at,
               COALESCE(pt.total_owed, 0) AS total_owed,
               COALESCE(pt.total_paid, 0) AS total_paid,
               COALESCE(cr.current_registrations, ''[]''::jsonb) AS current_registrations,
               COUNT(*) OVER() AS total_count
        FROM combined_data cd
        LEFT JOIN payment_totals pt ON cd.profile_id = pt.user_id
        LEFT JOIN combined_regs cr ON cd.profile_id = cr.user_id') ;

    IF array_length(v_where_conditions, 1) > 0 THEN
        v_final_query := v_final_query || ' WHERE ' || array_to_string(v_where_conditions, ' AND ');
    END IF;

    v_final_query := v_final_query || ' ORDER BY ' || v_sort_sql || ' LIMIT ' || p_limit || ' OFFSET ' || p_offset || ')';

    v_final_query := v_final_query || '
    SELECT profile_id, auth_id, name, email, phone, is_admin, is_facilitator, date_created, date_modified, team_ids, league_ids,
           user_sports_skills, status, confirmed_at, last_sign_in_at, auth_created_at, total_count, total_owed, total_paid, current_registrations
    FROM filtered_data';

    RETURN QUERY EXECUTE v_final_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_users_paginated_admin(
    INTEGER, INTEGER, TEXT, TEXT, TEXT, 
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;

COMMENT ON FUNCTION get_users_paginated_admin IS 'Admin function to retrieve paginated users with current_registrations including team memberships and individual registrations.';

