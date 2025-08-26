-- Fix invalid reference to combined_data table alias
-- Error: invalid reference to FROM-clause entry for table "combined_data"

-- Drop the existing function
DROP FUNCTION IF EXISTS get_users_paginated_admin(
    INTEGER, INTEGER, TEXT, TEXT, TEXT, 
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
);

-- Recreate with correct table alias references
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
    -- Check if the calling user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid() 
        AND u.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can access this function';
    END IF;

    -- Build WHERE conditions based on filters
    -- FIXED: Changed 'combined_data' to 'cd' which is the actual alias in filtered_data
    IF p_search != '' THEN
        v_where_conditions := array_append(v_where_conditions, 
            '(LOWER(cd.name) LIKE ''' || v_search_term || ''' OR LOWER(cd.email) LIKE ''' || v_search_term || ''')');
    END IF;
    
    IF p_administrator THEN
        v_where_conditions := array_append(v_where_conditions, 'cd.is_admin = true');
    END IF;
    
    IF p_facilitator THEN
        v_where_conditions := array_append(v_where_conditions, 'cd.is_facilitator = true');
    END IF;
    
    IF p_pending_users THEN
        v_where_conditions := array_append(v_where_conditions, 'cd.status IN (''unconfirmed'', ''confirmed_no_profile'', ''profile_incomplete'')');
    END IF;
    
    IF p_active_player THEN
        v_where_conditions := array_append(v_where_conditions, 'cd.status = ''active''');
    END IF;
    
    -- Sport-specific filters - FIXED: changed combined_data to cd
    IF p_volleyball_players_in_league THEN
        v_where_conditions := array_append(v_where_conditions, 
            'EXISTS (SELECT 1 FROM league_payments lp JOIN leagues l ON lp.league_id = l.id JOIN sports s ON l.sport_id = s.id WHERE lp.user_id = cd.profile_id AND s.name = ''Volleyball'' AND lp.is_waitlisted = false)');
    END IF;
    
    IF p_badminton_players_in_league THEN
        v_where_conditions := array_append(v_where_conditions, 
            'EXISTS (SELECT 1 FROM league_payments lp JOIN leagues l ON lp.league_id = l.id JOIN sports s ON l.sport_id = s.id WHERE lp.user_id = cd.profile_id AND s.name = ''Badminton'' AND lp.is_waitlisted = false)');
    END IF;
    
    IF p_volleyball_players_all THEN
        v_where_conditions := array_append(v_where_conditions, 
            'cd.user_sports_skills::text LIKE ''%"sport":"Volleyball"%''');
    END IF;
    
    IF p_badminton_players_all THEN
        v_where_conditions := array_append(v_where_conditions, 
            'cd.user_sports_skills::text LIKE ''%"sport":"Badminton"%''');
    END IF;
    
    IF p_players_not_in_league THEN
        v_where_conditions := array_append(v_where_conditions, 
            'NOT EXISTS (SELECT 1 FROM league_payments lp WHERE lp.user_id = cd.profile_id AND lp.is_waitlisted = false)');
    END IF;

    -- Build sort clause - FIXED: changed combined_data to use direct column names
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

    -- Build the final query
    v_final_query := '
    WITH auth_users AS (
        SELECT 
            au.id as auth_user_id,
            au.email as auth_email,
            au.email_confirmed_at,
            au.created_at as auth_created_at,
            au.last_sign_in_at
        FROM auth.users au
    ),
    user_profiles AS (
        SELECT 
            u.id as profile_id,
            u.auth_id as profile_auth_id,
            u.name,
            u.email as profile_email,
            u.phone,
            u.is_admin,
            u.is_facilitator,
            u.date_created::timestamp with time zone as date_created,
            u.date_modified::timestamp with time zone as date_modified,
            u.team_ids::text[] as team_ids,
            u.league_ids,
            u.user_sports_skills,
            u.profile_completed
        FROM users u
    ),
    combined_data AS (
        SELECT 
            up.profile_id,
            COALESCE(up.profile_auth_id, au.auth_user_id) as combined_auth_id,
            up.name,
            COALESCE(up.profile_email, au.auth_email) as email,
            up.phone,
            up.is_admin,
            up.is_facilitator,
            COALESCE(up.date_created, au.auth_created_at) as date_created,
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
            END as status,
            au.email_confirmed_at as confirmed_at,
            au.last_sign_in_at
        FROM auth_users au
        LEFT JOIN user_profiles up ON au.auth_user_id = up.profile_auth_id
    ),
    payment_totals AS (
        SELECT 
            lp.user_id,
            SUM(lp.amount_due) as total_owed,
            SUM(lp.amount_paid) as total_paid,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    ''league_name'', l.name,
                    ''amount_due'', lp.amount_due,
                    ''amount_paid'', lp.amount_paid,
                    ''status'', lp.status,
                    ''is_waitlisted'', lp.is_waitlisted
                )
            ) as current_registrations
        FROM league_payments lp
        JOIN leagues l ON lp.league_id = l.id
        GROUP BY lp.user_id
    ),
    filtered_data AS (
        SELECT 
            cd.profile_id,
            cd.combined_auth_id as auth_id,
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
            COALESCE(pt.total_owed, 0) as total_owed,
            COALESCE(pt.total_paid, 0) as total_paid,
            COALESCE(pt.current_registrations, ''[]''::jsonb) as current_registrations,
            COUNT(*) OVER() as total_count
        FROM combined_data cd
        LEFT JOIN payment_totals pt ON cd.profile_id = pt.user_id';
        
    -- Add WHERE clause if there are conditions
    IF array_length(v_where_conditions, 1) > 0 THEN
        v_final_query := v_final_query || ' WHERE ' || array_to_string(v_where_conditions, ' AND ');
    END IF;
    
    -- Add ORDER BY and LIMIT
    v_final_query := v_final_query || ' ORDER BY ' || v_sort_sql || ' LIMIT ' || p_limit || ' OFFSET ' || p_offset || ')';
    
    v_final_query := v_final_query || '
    SELECT 
        profile_id,
        auth_id,
        name,
        email,
        phone,
        is_admin,
        is_facilitator,
        date_created,
        date_modified,
        team_ids,
        league_ids,
        user_sports_skills,
        status,
        confirmed_at,
        last_sign_in_at,
        auth_created_at,
        total_count,
        total_owed,
        total_paid,
        current_registrations
    FROM filtered_data';

    -- Execute the dynamic query
    RETURN QUERY EXECUTE v_final_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (function will check admin status internally)
GRANT EXECUTE ON FUNCTION get_users_paginated_admin(
    INTEGER, INTEGER, TEXT, TEXT, TEXT, 
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_users_paginated_admin IS 'Admin function to retrieve paginated users. Fixed table alias references - changed combined_data to cd in WHERE clauses.';