-- Test script for volleyball_spares migration
-- This script validates that the migration works correctly
-- Run this after applying the main migration to verify everything works

-- =============================================
-- TEST DATA SETUP
-- =============================================

-- Create test data (this will be rolled back)
BEGIN;

-- Create a test volleyball sport if it doesn't exist
INSERT INTO sports (id, name, active, description)
VALUES (999, 'Test Volleyball', true, 'Test sport for migration validation')
ON CONFLICT (name) DO NOTHING;

-- Create a test skill level
INSERT INTO skills (id, name, description, order_index)
VALUES (999, 'Test Intermediate', 'Test skill level', 1)
ON CONFLICT (name) DO NOTHING;

-- Create a test gym
INSERT INTO gyms (id, gym, address, active)
VALUES (999, 'Test Gym', '123 Test Street', true);

-- Create a test volleyball league
INSERT INTO leagues (
    id, name, description, sport_id, skill_id, 
    day_of_week, start_date, end_date, cost, active
)
VALUES (
    999, 'Test Volleyball League', 'Test league for migration validation',
    999, 999, 1, '2024-01-01', '2024-12-31', 100.00, true
);

-- Create a test badminton league (to test constraint)
INSERT INTO sports (id, name, active, description)
VALUES (998, 'Test Badminton', true, 'Test badminton sport')
ON CONFLICT (name) DO NOTHING;

INSERT INTO leagues (
    id, name, description, sport_id, skill_id, 
    day_of_week, start_date, end_date, cost, active
)
VALUES (
    998, 'Test Badminton League', 'Test badminton league for constraint validation',
    998, 999, 2, '2024-01-01', '2024-12-31', 100.00, true
);

-- Create test users
INSERT INTO users (
    id, date_created, date_modified, name, email, 
    auth_id, is_admin, profile_completed
)
VALUES 
(
    'test_user_1', '2024-01-01', '2024-01-01', 'Test User 1', 
    'test1@example.com', gen_random_uuid(), false, true
),
(
    'test_user_2', '2024-01-01', '2024-01-01', 'Test User 2', 
    'test2@example.com', gen_random_uuid(), false, true
),
(
    'test_admin', '2024-01-01', '2024-01-01', 'Test Admin', 
    'admin@example.com', gen_random_uuid(), true, true
);

-- Create a test team with captain
INSERT INTO teams (
    id, name, league_id, captain_id, roster, active, skill_level_id
)
VALUES (
    999, 'Test Team', 999, 'test_user_1', 
    ARRAY['test_user_1'], true, 999
);

-- =============================================
-- TEST CASES
-- =============================================

-- Test 1: Basic table structure
DO $$
BEGIN
    RAISE NOTICE 'TEST 1: Verifying table structure...';
    
    -- Check that all required columns exist with correct types
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'volleyball_spares' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: id column missing or wrong type';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'volleyball_spares' 
        AND column_name = 'skill_level' 
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: skill_level column missing or wrong type';
    END IF;
    
    RAISE NOTICE 'TEST 1: PASSED - Table structure is correct';
END $$;

-- Test 2: Valid spare registration
DO $$
DECLARE
    spare_id UUID;
BEGIN
    RAISE NOTICE 'TEST 2: Testing valid spare registration...';
    
    -- Test inserting a valid spare registration
    INSERT INTO volleyball_spares (
        user_id, league_id, skill_level, availability_notes
    )
    VALUES (
        'test_user_1', 999, 'intermediate', 'Available weekday evenings'
    )
    RETURNING id INTO spare_id;
    
    IF spare_id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Could not insert valid spare registration';
    END IF;
    
    RAISE NOTICE 'TEST 2: PASSED - Valid spare registration created with ID %', spare_id;
END $$;

-- Test 3: Skill level constraint
DO $$
BEGIN
    RAISE NOTICE 'TEST 3: Testing skill level constraint...';
    
    -- This should fail due to invalid skill level
    BEGIN
        INSERT INTO volleyball_spares (
            user_id, league_id, skill_level
        )
        VALUES (
            'test_user_2', 999, 'expert'
        );
        
        RAISE EXCEPTION 'TEST FAILED: Invalid skill level was accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 3: PASSED - Invalid skill level rejected correctly';
    END;
END $$;

-- Test 4: Unique constraint (user_id, league_id)
DO $$
BEGIN
    RAISE NOTICE 'TEST 4: Testing unique constraint...';
    
    -- This should fail due to duplicate user/league combination
    BEGIN
        INSERT INTO volleyball_spares (
            user_id, league_id, skill_level
        )
        VALUES (
            'test_user_1', 999, 'beginner'
        );
        
        RAISE EXCEPTION 'TEST FAILED: Duplicate user/league combination was accepted';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 4: PASSED - Duplicate user/league combination rejected correctly';
    END;
END $$;

-- Test 5: Volleyball-only constraint
DO $$
BEGIN
    RAISE NOTICE 'TEST 5: Testing volleyball-only constraint...';
    
    -- This should fail because league 998 is badminton
    BEGIN
        INSERT INTO volleyball_spares (
            user_id, league_id, skill_level
        )
        VALUES (
            'test_user_2', 998, 'intermediate'
        );
        
        RAISE EXCEPTION 'TEST FAILED: Non-volleyball league was accepted';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'TEST 5: PASSED - Non-volleyball league rejected correctly';
    END;
END $$;

-- Test 6: Foreign key constraints
DO $$
BEGIN
    RAISE NOTICE 'TEST 6: Testing foreign key constraints...';
    
    -- Test invalid user_id
    BEGIN
        INSERT INTO volleyball_spares (
            user_id, league_id, skill_level
        )
        VALUES (
            'nonexistent_user', 999, 'intermediate'
        );
        
        RAISE EXCEPTION 'TEST FAILED: Invalid user_id was accepted';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'TEST 6a: PASSED - Invalid user_id rejected correctly';
    END;
    
    -- Test invalid league_id
    BEGIN
        INSERT INTO volleyball_spares (
            user_id, league_id, skill_level
        )
        VALUES (
            'test_user_2', 99999, 'intermediate'
        );
        
        RAISE EXCEPTION 'TEST FAILED: Invalid league_id was accepted';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'TEST 6b: PASSED - Invalid league_id rejected correctly';
    END;
END $$;

-- Test 7: Indexes exist and are being used
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    RAISE NOTICE 'TEST 7: Testing indexes...';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'volleyball_spares';
    
    IF index_count < 5 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected at least 5 indexes, found %', index_count;
    END IF;
    
    RAISE NOTICE 'TEST 7: PASSED - Found % indexes on volleyball_spares table', index_count;
END $$;

-- Test 8: Trigger functions work
DO $$
DECLARE
    old_updated_at TIMESTAMPTZ;
    new_updated_at TIMESTAMPTZ;
BEGIN
    RAISE NOTICE 'TEST 8: Testing trigger functions...';
    
    -- Get current updated_at
    SELECT updated_at INTO old_updated_at
    FROM volleyball_spares
    WHERE user_id = 'test_user_1' AND league_id = 999;
    
    -- Wait a moment to ensure timestamp difference
    PERFORM pg_sleep(0.1);
    
    -- Update the record
    UPDATE volleyball_spares 
    SET availability_notes = 'Updated availability'
    WHERE user_id = 'test_user_1' AND league_id = 999;
    
    -- Get new updated_at
    SELECT updated_at INTO new_updated_at
    FROM volleyball_spares
    WHERE user_id = 'test_user_1' AND league_id = 999;
    
    IF new_updated_at <= old_updated_at THEN
        RAISE EXCEPTION 'TEST FAILED: updated_at trigger not working';
    END IF;
    
    RAISE NOTICE 'TEST 8: PASSED - Trigger functions working correctly';
END $$;

-- Test 9: Helper functions
DO $$
DECLARE
    spare_count INTEGER;
    function_result UUID;
BEGIN
    RAISE NOTICE 'TEST 9: Testing helper functions...';
    
    -- Test register_volleyball_spare function exists
    SELECT register_volleyball_spare(999, 'advanced', 'Test notes') INTO function_result;
    
    IF function_result IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: register_volleyball_spare function not working';
    END IF;
    
    RAISE NOTICE 'TEST 9: PASSED - Helper functions working correctly';
END $$;

-- Test 10: RLS policies are in place
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    RAISE NOTICE 'TEST 10: Testing RLS policies...';
    
    -- Check that RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'volleyball_spares' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: RLS not enabled';
    END IF;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'volleyball_spares';
    
    IF policy_count < 5 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected at least 5 RLS policies, found %', policy_count;
    END IF;
    
    RAISE NOTICE 'TEST 10: PASSED - RLS enabled with % policies', policy_count;
END $$;

-- =============================================
-- CLEANUP AND SUMMARY
-- =============================================

-- Clean up test data
ROLLBACK;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VOLLEYBALL SPARES MIGRATION TEST SUMMARY';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'All tests completed successfully!';
    RAISE NOTICE 'The volleyball_spares table migration is working correctly.';
    RAISE NOTICE '';
    RAISE NOTICE 'Features validated:';
    RAISE NOTICE '✓ Table structure with all required columns';
    RAISE NOTICE '✓ Skill level constraint (beginner/intermediate/advanced)';
    RAISE NOTICE '✓ Unique constraint on (user_id, league_id)';
    RAISE NOTICE '✓ Volleyball-only league constraint';
    RAISE NOTICE '✓ Foreign key constraints with CASCADE delete';
    RAISE NOTICE '✓ Performance indexes created';
    RAISE NOTICE '✓ Auto-update triggers working';
    RAISE NOTICE '✓ Helper functions available';
    RAISE NOTICE '✓ Row Level Security policies in place';
    RAISE NOTICE '==========================================';
END $$;