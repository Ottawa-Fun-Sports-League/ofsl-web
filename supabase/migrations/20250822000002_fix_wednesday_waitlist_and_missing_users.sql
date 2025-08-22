-- Migration: Fix Wednesday league waitlist and add missing waitlisted users
-- Issue: Wednesday league has 28 registrations but only 26 spots
-- Also: Karthik Ramasubramanian and Surya Kiran should be registered as waitlisted

DO $$
DECLARE
    v_wednesday_league_id BIGINT;
    v_karthik_user_id TEXT := '1755552014.505247_e411e6a0';
    v_surya_user_id TEXT := '1755489673.900369_dbefcc46';
    v_active_count INTEGER;
    v_waitlisted_count INTEGER;
    v_capacity INTEGER;
BEGIN
    -- Find the Wednesday badminton league
    SELECT id INTO v_wednesday_league_id
    FROM leagues
    WHERE name LIKE '%Wednesday%'
      AND sport = 'badminton'
      AND team_registration = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Exit if league not found
    IF v_wednesday_league_id IS NULL THEN
        RAISE NOTICE 'Wednesday badminton league not found - skipping migration';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Wednesday badminton league with id: %', v_wednesday_league_id;
    
    -- 1. Mark oversubscribed registrants as waitlisted if they exist
    -- Check if these specific payment IDs exist before updating
    UPDATE league_payments
    SET is_waitlisted = true
    WHERE id IN (311, 313)
      AND league_id = v_wednesday_league_id
      AND EXISTS (SELECT 1 FROM league_payments WHERE id IN (311, 313));
    
    -- Alternatively, mark the last registrants as waitlisted based on capacity
    WITH league_info AS (
        SELECT max_teams
        FROM leagues
        WHERE id = v_wednesday_league_id
    ),
    ranked_registrations AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY created_at ASC) as registration_order
        FROM league_payments
        WHERE league_id = v_wednesday_league_id
          AND team_id IS NULL
    )
    UPDATE league_payments lp
    SET is_waitlisted = true
    FROM ranked_registrations rr, league_info li
    WHERE lp.id = rr.id
      AND rr.registration_order > li.max_teams
      AND li.max_teams IS NOT NULL;
    
    -- 2. Add Karthik to waitlist if not already registered
    INSERT INTO league_payments (
        user_id,
        league_id,
        team_id,
        amount_due,
        amount_paid,
        status,
        is_waitlisted,
        created_at
    )
    SELECT 
        v_karthik_user_id,
        v_wednesday_league_id,
        NULL, -- Individual registration
        0, -- No payment due for waitlist
        0,
        'pending',
        true, -- Waitlisted
        NOW()
    WHERE EXISTS (SELECT 1 FROM users WHERE id = v_karthik_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM league_payments 
        WHERE user_id = v_karthik_user_id 
        AND league_id = v_wednesday_league_id
    );
    
    -- 3. Add Surya to waitlist if not already registered
    INSERT INTO league_payments (
        user_id,
        league_id,
        team_id,
        amount_due,
        amount_paid,
        status,
        is_waitlisted,
        created_at
    )
    SELECT 
        v_surya_user_id,
        v_wednesday_league_id,
        NULL, -- Individual registration
        0, -- No payment due for waitlist
        0,
        'pending',
        true, -- Waitlisted
        NOW()
    WHERE EXISTS (SELECT 1 FROM users WHERE id = v_surya_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM league_payments 
        WHERE user_id = v_surya_user_id
        AND league_id = v_wednesday_league_id
    );
    
    -- 4. Verify the results
    SELECT 
        COUNT(*) FILTER (WHERE is_waitlisted = false OR is_waitlisted IS NULL),
        COUNT(*) FILTER (WHERE is_waitlisted = true)
    INTO v_active_count, v_waitlisted_count
    FROM league_payments
    WHERE league_id = v_wednesday_league_id
    AND team_id IS NULL;
    
    -- Get capacity
    SELECT max_teams INTO v_capacity
    FROM leagues
    WHERE id = v_wednesday_league_id;
    
    RAISE NOTICE 'Wednesday league fixed: % active (capacity: %), % waitlisted', 
        v_active_count, v_capacity, v_waitlisted_count;
END $$;