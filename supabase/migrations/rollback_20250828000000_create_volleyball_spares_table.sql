-- Rollback migration for volleyball_spares table
-- This script safely removes all components created by the main migration
-- Run this if you need to completely undo the volleyball spares feature

-- =============================================
-- SAFETY CHECK
-- =============================================

-- Prevent accidental execution in production
DO $$
BEGIN
    IF current_database() = 'production' OR current_database() LIKE '%prod%' THEN
        RAISE EXCEPTION 'ROLLBACK BLOCKED: This appears to be a production database. Please review carefully before rolling back.';
    END IF;
    
    RAISE NOTICE 'Starting rollback of volleyball_spares migration...';
END $$;

-- =============================================
-- BACKUP EXISTING DATA (Optional)
-- =============================================

-- Uncomment the following block if you want to backup existing data before rollback
/*
CREATE TABLE IF NOT EXISTS volleyball_spares_backup AS
SELECT 
    id,
    user_id,
    league_id,
    skill_level,
    availability_notes,
    is_active,
    created_at,
    updated_at,
    now() as backup_created_at
FROM volleyball_spares;

RAISE NOTICE 'Data backed up to volleyball_spares_backup table';
*/

-- =============================================
-- DROP HELPER FUNCTIONS
-- =============================================

-- Drop helper functions in reverse order of creation
DROP FUNCTION IF EXISTS deactivate_volleyball_spare(BIGINT, TEXT);
DROP FUNCTION IF EXISTS register_volleyball_spare(BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_volleyball_spares_for_league(BIGINT, TEXT, BOOLEAN);

-- =============================================
-- DROP TRIGGERS AND TRIGGER FUNCTIONS
-- =============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS validate_volleyball_spares_league_trigger ON volleyball_spares;
DROP TRIGGER IF EXISTS update_volleyball_spares_updated_at_trigger ON volleyball_spares;

-- Drop trigger functions
DROP FUNCTION IF EXISTS validate_volleyball_spares_league();
DROP FUNCTION IF EXISTS update_volleyball_spares_updated_at();

-- =============================================
-- DROP RLS POLICIES
-- =============================================

-- Drop all RLS policies on the table
DROP POLICY IF EXISTS "Admins can manage all spare registrations" ON volleyball_spares;
DROP POLICY IF EXISTS "Co-captains can view spares for their leagues" ON volleyball_spares;
DROP POLICY IF EXISTS "Team captains can view spares for their leagues" ON volleyball_spares;
DROP POLICY IF EXISTS "Users can manage own spare registrations" ON volleyball_spares;
DROP POLICY IF EXISTS "Users can insert own spare registrations" ON volleyball_spares;

-- =============================================
-- DROP INDEXES
-- =============================================

-- Drop all indexes created for the table
DROP INDEX IF EXISTS idx_volleyball_spares_league_skill_active;
DROP INDEX IF EXISTS idx_volleyball_spares_skill_level;
DROP INDEX IF EXISTS idx_volleyball_spares_league_active;
DROP INDEX IF EXISTS idx_volleyball_spares_user_id;
DROP INDEX IF EXISTS idx_volleyball_spares_league_id;

-- =============================================
-- DROP TABLE
-- =============================================

-- Drop the main table (this will also drop any remaining constraints)
DROP TABLE IF EXISTS volleyball_spares CASCADE;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify that everything was cleaned up properly
DO $$
DECLARE
    table_exists BOOLEAN;
    function_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    RAISE NOTICE 'Verifying rollback completion...';
    
    -- Check table was dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'volleyball_spares'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: volleyball_spares table still exists';
    END IF;
    
    -- Check functions were dropped
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE proname LIKE '%volleyball_spare%';
    
    IF function_count > 0 THEN
        RAISE WARNING 'ROLLBACK WARNING: % volleyball spare functions still exist', function_count;
    END IF;
    
    -- Check policies were dropped
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'volleyball_spares';
    
    IF policy_count > 0 THEN
        RAISE WARNING 'ROLLBACK WARNING: % RLS policies still exist for volleyball_spares', policy_count;
    END IF;
    
    -- Check indexes were dropped
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'volleyball_spares';
    
    IF index_count > 0 THEN
        RAISE WARNING 'ROLLBACK WARNING: % indexes still exist for volleyball_spares', index_count;
    END IF;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VOLLEYBALL SPARES ROLLBACK COMPLETED';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Successfully removed:';
    RAISE NOTICE '✓ volleyball_spares table';
    RAISE NOTICE '✓ All associated indexes';
    RAISE NOTICE '✓ All RLS policies';
    RAISE NOTICE '✓ All trigger functions';
    RAISE NOTICE '✓ All helper functions';
    RAISE NOTICE '';
    
    IF function_count = 0 AND policy_count = 0 AND index_count = 0 THEN
        RAISE NOTICE 'Rollback completed successfully with no remaining artifacts.';
    ELSE
        RAISE NOTICE 'Rollback completed with some artifacts remaining (see warnings above).';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;