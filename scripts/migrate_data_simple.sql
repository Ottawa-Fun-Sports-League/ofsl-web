-- Simple Data Migration Script for OFSL
-- This script can be run directly in the Supabase SQL Editor on your staging database
-- 
-- Prerequisites:
-- 1. You need to temporarily create a database link between staging and main
-- 2. This requires the postgres_fdw extension (already enabled)

-- =============================================
-- STEP 1: Set up the connection to main database
-- =============================================

-- Create the foreign data wrapper connection
CREATE SERVER IF NOT EXISTS main_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'db.aijuhalowwjbccyjrlgf.supabase.co',
    port '5432',
    dbname 'postgres'
);

-- Create user mapping - You'll need to update the password
CREATE USER MAPPING IF NOT EXISTS FOR postgres
SERVER main_server
OPTIONS (
    user 'postgres',
    password 'YOUR_MAIN_DATABASE_PASSWORD_HERE'
);

-- =============================================
-- STEP 2: Import the foreign schema
-- =============================================

-- Create a schema to hold the foreign tables
CREATE SCHEMA IF NOT EXISTS main_import;

-- Import all tables from main
IMPORT FOREIGN SCHEMA public
FROM SERVER main_server
INTO main_import;

-- =============================================
-- STEP 3: Copy data with conflict handling
-- =============================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Clear existing data (optional - remove if you want to merge data)
-- TRUNCATE TABLE sports, skills, gyms, waivers, users, leagues, seasons, teams, 
--     stripe_customers, stripe_products, stripe_orders, stripe_subscriptions,
--     league_payments, team_invites, team_registration_notifications,
--     attendance, balances, registrations, waiver_acceptances CASCADE;

-- Copy data in dependency order
DO $$
BEGIN
    -- Sports
    INSERT INTO sports SELECT * FROM main_import.sports ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % sports', (SELECT COUNT(*) FROM main_import.sports);
    
    -- Skills
    INSERT INTO skills SELECT * FROM main_import.skills ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % skills', (SELECT COUNT(*) FROM main_import.skills);
    
    -- Gyms
    INSERT INTO gyms SELECT * FROM main_import.gyms ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % gyms', (SELECT COUNT(*) FROM main_import.gyms);
    
    -- Waivers
    INSERT INTO waivers SELECT * FROM main_import.waivers ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % waivers', (SELECT COUNT(*) FROM main_import.waivers);
    
    -- Users
    INSERT INTO users SELECT * FROM main_import.users ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % users', (SELECT COUNT(*) FROM main_import.users);
    
    -- Leagues
    INSERT INTO leagues SELECT * FROM main_import.leagues ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % leagues', (SELECT COUNT(*) FROM main_import.leagues);
    
    -- Seasons
    INSERT INTO seasons SELECT * FROM main_import.seasons ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % seasons', (SELECT COUNT(*) FROM main_import.seasons);
    
    -- Teams
    INSERT INTO teams SELECT * FROM main_import.teams ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % teams', (SELECT COUNT(*) FROM main_import.teams);
    
    -- Stripe tables
    INSERT INTO stripe_customers SELECT * FROM main_import.stripe_customers ON CONFLICT (id) DO NOTHING;
    INSERT INTO stripe_products SELECT * FROM main_import.stripe_products ON CONFLICT (id) DO NOTHING;
    INSERT INTO stripe_orders SELECT * FROM main_import.stripe_orders ON CONFLICT (id) DO NOTHING;
    INSERT INTO stripe_subscriptions SELECT * FROM main_import.stripe_subscriptions ON CONFLICT (id) DO NOTHING;
    
    -- League payments
    INSERT INTO league_payments SELECT * FROM main_import.league_payments ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % league payments', (SELECT COUNT(*) FROM main_import.league_payments);
    
    -- Team invites
    INSERT INTO team_invites SELECT * FROM main_import.team_invites ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Copied % team invites', (SELECT COUNT(*) FROM main_import.team_invites);
    
    -- Team registration notifications
    INSERT INTO team_registration_notifications SELECT * FROM main_import.team_registration_notifications ON CONFLICT (id) DO NOTHING;
    
    -- Attendance
    INSERT INTO attendance SELECT * FROM main_import.attendance ON CONFLICT (id) DO NOTHING;
    
    -- Balances
    INSERT INTO balances SELECT * FROM main_import.balances ON CONFLICT (id) DO NOTHING;
    
    -- Registrations
    INSERT INTO registrations SELECT * FROM main_import.registrations ON CONFLICT (id) DO NOTHING;
    
    -- Waiver acceptances
    INSERT INTO waiver_acceptances SELECT * FROM main_import.waiver_acceptances ON CONFLICT (id) DO NOTHING;
    
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =============================================
-- STEP 4: Update sequences
-- =============================================

SELECT setval('sports_id_seq', COALESCE((SELECT MAX(id) FROM sports), 1), true);
SELECT setval('skills_id_seq', COALESCE((SELECT MAX(id) FROM skills), 1), true);
SELECT setval('gyms_id_seq', COALESCE((SELECT MAX(id) FROM gyms), 1), true);
SELECT setval('waivers_id_seq', COALESCE((SELECT MAX(id) FROM waivers), 1), true);
SELECT setval('leagues_id_seq', COALESCE((SELECT MAX(id) FROM leagues), 1), true);
SELECT setval('seasons_id_seq', COALESCE((SELECT MAX(id) FROM seasons), 1), true);
SELECT setval('teams_id_seq', COALESCE((SELECT MAX(id) FROM teams), 1), true);
SELECT setval('stripe_customers_id_seq', COALESCE((SELECT MAX(id) FROM stripe_customers), 1), true);
SELECT setval('stripe_orders_id_seq', COALESCE((SELECT MAX(id) FROM stripe_orders), 1), true);
SELECT setval('stripe_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM stripe_subscriptions), 1), true);
SELECT setval('league_payments_id_seq', COALESCE((SELECT MAX(id) FROM league_payments), 1), true);
SELECT setval('team_invites_id_seq', COALESCE((SELECT MAX(id) FROM team_invites), 1), true);
SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 1), true);
SELECT setval('balances_id_seq', COALESCE((SELECT MAX(id) FROM balances), 1), true);
SELECT setval('registrations_id_seq', COALESCE((SELECT MAX(id) FROM registrations), 1), true);
SELECT setval('waiver_acceptances_id_seq', COALESCE((SELECT MAX(id) FROM waiver_acceptances), 1), true);

-- =============================================
-- STEP 5: Verify the migration
-- =============================================

SELECT 
    'Data Migration Complete!' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM leagues) as total_leagues,
    (SELECT COUNT(*) FROM gyms) as total_gyms;

-- =============================================
-- STEP 6: Clean up (optional)
-- =============================================

-- Uncomment these lines to remove the foreign connection after migration
-- DROP SCHEMA main_import CASCADE;
-- DROP USER MAPPING FOR postgres SERVER main_server;
-- DROP SERVER main_server CASCADE;