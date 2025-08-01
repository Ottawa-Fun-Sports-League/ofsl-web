-- OFSL Data Migration Script
-- Migrates data from main to staging branch
-- 
-- Usage:
-- 1. Connect to your staging database
-- 2. Run this script to copy all data from main
--
-- Note: This uses postgres_fdw to connect to the main database

-- =============================================
-- SETUP FOREIGN DATA WRAPPER
-- =============================================

-- Create the foreign data wrapper extension if not exists
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create a foreign server connection to main database
-- You'll need to replace these with actual connection details
CREATE SERVER IF NOT EXISTS main_db_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (
        host 'aijuhalowwjbccyjrlgf.supabase.co',
        port '5432',
        dbname 'postgres'
    );

-- Create user mapping (replace with actual credentials)
-- You'll need to use service role credentials for full access
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
    SERVER main_db_server
    OPTIONS (
        user 'postgres',
        password 'YOUR_MAIN_DB_PASSWORD'
    );

-- =============================================
-- CREATE FOREIGN TABLES
-- =============================================

-- Create schema for foreign tables
CREATE SCHEMA IF NOT EXISTS main_data;

-- Import all tables from main public schema
IMPORT FOREIGN SCHEMA public
    FROM SERVER main_db_server
    INTO main_data;

-- =============================================
-- DISABLE TRIGGERS AND CONSTRAINTS
-- =============================================

-- Disable all triggers to avoid issues during data import
SET session_replication_role = 'replica';

-- =============================================
-- COPY DATA IN DEPENDENCY ORDER
-- =============================================

-- 1. Copy sports (no dependencies)
INSERT INTO public.sports (id, created_at, name, active, description)
SELECT id, created_at, name, active, description
FROM main_data.sports
ON CONFLICT (id) DO NOTHING;

-- 2. Copy skills (no dependencies)
INSERT INTO public.skills (id, name, description, order_index, created_at)
SELECT id, name, description, order_index, created_at
FROM main_data.skills
ON CONFLICT (id) DO NOTHING;

-- 3. Copy gyms (no dependencies)
INSERT INTO public.gyms (id, created_at, gym, address, instructions, active, available_days, available_sports, locations)
SELECT id, created_at, gym, address, instructions, active, available_days, available_sports, locations
FROM main_data.gyms
ON CONFLICT (id) DO NOTHING;

-- 4. Copy waivers (no dependencies)
INSERT INTO public.waivers (id, title, content, version, is_active, created_at, updated_at, created_by, updated_by)
SELECT id, title, content, version, is_active, created_at, updated_at, created_by, updated_by
FROM main_data.waivers
ON CONFLICT (id) DO NOTHING;

-- 5. Copy users (depends on waivers)
INSERT INTO public.users (
    id, date_created, date_modified, name, phone, email, password, 
    alt_phone, auth_id, profile_picture_url, preferred_position, 
    is_admin, team_ids, user_sports_skills, email_verified, 
    profile_completed, waiver_accepted, waiver_accepted_at, waiver_id
)
SELECT 
    id, date_created, date_modified, name, phone, email, password, 
    alt_phone, auth_id, profile_picture_url, preferred_position, 
    is_admin, team_ids, user_sports_skills, email_verified, 
    profile_completed, waiver_accepted, waiver_accepted_at, waiver_id
FROM main_data.users
ON CONFLICT (id) DO NOTHING;

-- 6. Copy leagues (depends on sports, skills)
INSERT INTO public.leagues (
    id, name, description, sport_id, skill_id, day_of_week, 
    start_date, end_date, cost, max_teams, gym_ids, active, 
    created_at, year, hide_day, location, skill_ids, 
    league_type, gender, payment_due_date
)
SELECT 
    id, name, description, sport_id, skill_id, day_of_week, 
    start_date, end_date, cost, max_teams, gym_ids, active, 
    created_at, year, hide_day, location, skill_ids, 
    league_type, gender, payment_due_date
FROM main_data.leagues
ON CONFLICT (id) DO NOTHING;

-- 7. Copy seasons (depends on gyms, sports)
INSERT INTO public.seasons (
    id, created_at, season, start_date, end_date, cost_gym_rental, 
    cost_full_time, cost_drop_in, gym_id, blackout_dates, active, 
    day_of_the_week, whatsapp, new, notes, max_players, sport_id
)
SELECT 
    id, created_at, season, start_date, end_date, cost_gym_rental, 
    cost_full_time, cost_drop_in, gym_id, blackout_dates, active, 
    day_of_the_week, whatsapp, new, notes, max_players, sport_id
FROM main_data.seasons
ON CONFLICT (id) DO NOTHING;

-- 8. Copy teams (depends on leagues, users, skills)
INSERT INTO public.teams (
    id, name, league_id, captain_id, roster, active, 
    created_at, updated_at, skill_level_id, display_order, co_captains
)
SELECT 
    id, name, league_id, captain_id, roster, active, 
    created_at, updated_at, skill_level_id, display_order, co_captains
FROM main_data.teams
ON CONFLICT (id) DO NOTHING;

-- 9. Copy stripe_customers (depends on users via auth_id)
INSERT INTO public.stripe_customers (id, user_id, customer_id, created_at, updated_at, deleted_at)
SELECT id, user_id, customer_id, created_at, updated_at, deleted_at
FROM main_data.stripe_customers
ON CONFLICT (id) DO NOTHING;

-- 10. Copy stripe_products (depends on leagues)
INSERT INTO public.stripe_products (
    id, price_id, name, description, mode, price, 
    currency, interval, league_id, created_at, updated_at
)
SELECT 
    id, price_id, name, description, mode, price, 
    currency, interval, league_id, created_at, updated_at
FROM main_data.stripe_products
ON CONFLICT (id) DO NOTHING;

-- 11. Copy stripe_orders (depends on leagues)
INSERT INTO public.stripe_orders (
    id, checkout_session_id, payment_intent_id, customer_id, 
    amount_subtotal, amount_total, currency, payment_status, 
    status, created_at, updated_at, deleted_at, league_id
)
SELECT 
    id, checkout_session_id, payment_intent_id, customer_id, 
    amount_subtotal, amount_total, currency, payment_status, 
    status, created_at, updated_at, deleted_at, league_id
FROM main_data.stripe_orders
ON CONFLICT (id) DO NOTHING;

-- 12. Copy stripe_subscriptions (no FK dependencies in schema)
INSERT INTO public.stripe_subscriptions (
    id, customer_id, subscription_id, price_id, 
    current_period_start, current_period_end, cancel_at_period_end, 
    payment_method_brand, payment_method_last4, status, 
    created_at, updated_at, deleted_at
)
SELECT 
    id, customer_id, subscription_id, price_id, 
    current_period_start, current_period_end, cancel_at_period_end, 
    payment_method_brand, payment_method_last4, status, 
    created_at, updated_at, deleted_at
FROM main_data.stripe_subscriptions
ON CONFLICT (id) DO NOTHING;

-- 13. Copy league_payments (depends on users, teams, leagues, stripe_orders)
INSERT INTO public.league_payments (
    id, user_id, team_id, league_id, amount_due, amount_paid, 
    due_date, status, payment_method, stripe_order_id, 
    notes, created_at, updated_at
)
SELECT 
    id, user_id, team_id, league_id, amount_due, amount_paid, 
    due_date, status, payment_method, stripe_order_id, 
    notes, created_at, updated_at
FROM main_data.league_payments
ON CONFLICT (id) DO NOTHING;

-- 14. Copy team_invites (depends on teams, users)
INSERT INTO public.team_invites (
    id, team_id, email, status, invited_by, team_name, 
    league_name, invited_at, expires_at, accepted_at, 
    created_at, updated_at, processed_at
)
SELECT 
    id, team_id, email, status, invited_by, team_name, 
    league_name, invited_at, expires_at, accepted_at, 
    created_at, updated_at, processed_at
FROM main_data.team_invites
ON CONFLICT (id) DO NOTHING;

-- 15. Copy team_registration_notifications (depends on teams)
INSERT INTO public.team_registration_notifications (
    id, team_id, team_name, captain_name, captain_email, 
    captain_phone, league_name, registered_at, roster_count, 
    sent, sent_at, error, created_at
)
SELECT 
    id, team_id, team_name, captain_name, captain_email, 
    captain_phone, league_name, registered_at, roster_count, 
    sent, sent_at, error, created_at
FROM main_data.team_registration_notifications
ON CONFLICT (id) DO NOTHING;

-- 16. Copy attendance (depends on users, seasons)
INSERT INTO public.attendance (id, timestamp, player, season, is_waitlisted)
SELECT id, timestamp, player, season, is_waitlisted
FROM main_data.attendance
ON CONFLICT (id) DO NOTHING;

-- 17. Copy balances (depends on users)
INSERT INTO public.balances (id, created_at, player, paid, bonus)
SELECT id, created_at, player, paid, bonus
FROM main_data.balances
ON CONFLICT (id) DO NOTHING;

-- 18. Copy registrations (depends on users, seasons)
INSERT INTO public.registrations (id, created_at, player, season, status)
SELECT id, created_at, player, season, status
FROM main_data.registrations
ON CONFLICT (id) DO NOTHING;

-- 19. Copy waiver_acceptances (depends on users, waivers)
INSERT INTO public.waiver_acceptances (id, user_id, waiver_id, accepted_at, ip_address, user_agent)
SELECT id, user_id, waiver_id, accepted_at, ip_address, user_agent
FROM main_data.waiver_acceptances
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- UPDATE SEQUENCES
-- =============================================

-- Update all sequences to continue from the max ID
SELECT setval('sports_id_seq', COALESCE((SELECT MAX(id) FROM sports), 1));
SELECT setval('skills_id_seq', COALESCE((SELECT MAX(id) FROM skills), 1));
SELECT setval('gyms_id_seq', COALESCE((SELECT MAX(id) FROM gyms), 1));
SELECT setval('waivers_id_seq', COALESCE((SELECT MAX(id) FROM waivers), 1));
SELECT setval('leagues_id_seq', COALESCE((SELECT MAX(id) FROM leagues), 1));
SELECT setval('seasons_id_seq', COALESCE((SELECT MAX(id) FROM seasons), 1));
SELECT setval('teams_id_seq', COALESCE((SELECT MAX(id) FROM teams), 1));
SELECT setval('stripe_customers_id_seq', COALESCE((SELECT MAX(id) FROM stripe_customers), 1));
SELECT setval('stripe_orders_id_seq', COALESCE((SELECT MAX(id) FROM stripe_orders), 1));
SELECT setval('stripe_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM stripe_subscriptions), 1));
SELECT setval('league_payments_id_seq', COALESCE((SELECT MAX(id) FROM league_payments), 1));
SELECT setval('team_invites_id_seq', COALESCE((SELECT MAX(id) FROM team_invites), 1));
SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 1));
SELECT setval('balances_id_seq', COALESCE((SELECT MAX(id) FROM balances), 1));
SELECT setval('registrations_id_seq', COALESCE((SELECT MAX(id) FROM registrations), 1));
SELECT setval('waiver_acceptances_id_seq', COALESCE((SELECT MAX(id) FROM waiver_acceptances), 1));

-- =============================================
-- RE-ENABLE TRIGGERS
-- =============================================

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =============================================
-- VERIFY DATA MIGRATION
-- =============================================

-- Check row counts
SELECT 
    'Data Migration Summary:' as info
UNION ALL
SELECT 
    'sports: ' || COUNT(*) || ' rows' FROM sports
UNION ALL
SELECT 
    'skills: ' || COUNT(*) || ' rows' FROM skills
UNION ALL
SELECT 
    'gyms: ' || COUNT(*) || ' rows' FROM gyms
UNION ALL
SELECT 
    'users: ' || COUNT(*) || ' rows' FROM users
UNION ALL
SELECT 
    'leagues: ' || COUNT(*) || ' rows' FROM leagues
UNION ALL
SELECT 
    'teams: ' || COUNT(*) || ' rows' FROM teams
UNION ALL
SELECT 
    'waivers: ' || COUNT(*) || ' rows' FROM waivers;

-- =============================================
-- CLEANUP
-- =============================================

-- Drop the foreign schema and server when done
-- DROP SCHEMA main_data CASCADE;
-- DROP USER MAPPING FOR CURRENT_USER SERVER main_db_server;
-- DROP SERVER main_db_server CASCADE;