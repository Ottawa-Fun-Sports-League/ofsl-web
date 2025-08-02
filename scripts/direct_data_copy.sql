-- Direct Data Copy Script
-- Run this in two parts:
-- Part 1: Run in MAIN database to export data
-- Part 2: Run the generated INSERT statements in STAGING database

-- =============================================
-- PART 1: Run this in your MAIN database
-- =============================================
-- This will generate COPY commands that you can run

-- Generate COPY TO commands for all tables
SELECT 
    'COPY (SELECT * FROM ' || table_name || ') TO STDOUT WITH (FORMAT CSV, HEADER);' as export_command,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name IN (
    'sports', 'skills', 'gyms', 'waivers', 'users', 
    'leagues', 'seasons', 'teams', 'stripe_customers', 
    'stripe_products', 'stripe_orders', 'stripe_subscriptions',
    'league_payments', 'team_invites', 'team_registration_notifications',
    'attendance', 'balances', 'registrations', 'waiver_acceptances'
)
ORDER BY 
    CASE table_name
        WHEN 'sports' THEN 1
        WHEN 'skills' THEN 2
        WHEN 'gyms' THEN 3
        WHEN 'waivers' THEN 4
        WHEN 'users' THEN 5
        WHEN 'leagues' THEN 6
        WHEN 'seasons' THEN 7
        WHEN 'teams' THEN 8
        WHEN 'stripe_customers' THEN 9
        WHEN 'stripe_products' THEN 10
        WHEN 'stripe_orders' THEN 11
        WHEN 'stripe_subscriptions' THEN 12
        WHEN 'league_payments' THEN 13
        WHEN 'team_invites' THEN 14
        WHEN 'team_registration_notifications' THEN 15
        WHEN 'attendance' THEN 16
        WHEN 'balances' THEN 17
        WHEN 'registrations' THEN 18
        WHEN 'waiver_acceptances' THEN 19
    END;

-- =============================================
-- Alternative: Export as INSERT statements
-- =============================================
-- Run these queries in your MAIN database to get INSERT statements

-- Sports
SELECT 'INSERT INTO sports (id, created_at, name, active, description) VALUES (' ||
    id || ', ' ||
    quote_literal(created_at::text) || '::timestamptz, ' ||
    quote_literal(name) || ', ' ||
    active || ', ' ||
    COALESCE(quote_literal(description), 'NULL') || ') ON CONFLICT (id) DO NOTHING;'
FROM sports;

-- Skills
SELECT 'INSERT INTO skills (id, name, description, order_index, created_at) VALUES (' ||
    id || ', ' ||
    quote_literal(name) || ', ' ||
    COALESCE(quote_literal(description), 'NULL') || ', ' ||
    order_index || ', ' ||
    quote_literal(created_at::text) || '::timestamptz) ON CONFLICT (id) DO NOTHING;'
FROM skills;

-- Continue this pattern for other tables...