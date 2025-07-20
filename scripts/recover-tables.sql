-- Recovery script for registrations and attendance tables
-- Run this after you have access to backup data

-- Step 1: Create backup tables to preserve any existing data
CREATE TABLE IF NOT EXISTS registrations_current_backup AS 
SELECT * FROM registrations;

CREATE TABLE IF NOT EXISTS attendance_current_backup AS 
SELECT * FROM attendance;

-- Step 2: Count current records (should be 0 if tables were wiped)
SELECT 'Current registrations count:' as description, COUNT(*) as count FROM registrations
UNION ALL
SELECT 'Current attendance count:', COUNT(*) FROM attendance;

-- Step 3: If Supabase restored to temporary tables, copy from them
-- (Replace 'registrations_backup' with actual backup table name)
/*
INSERT INTO registrations 
SELECT * FROM registrations_backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO attendance 
SELECT * FROM attendance_backup
ON CONFLICT (id) DO NOTHING;
*/

-- Step 4: Verify recovery
SELECT 'Recovered registrations count:' as description, COUNT(*) as count FROM registrations
UNION ALL
SELECT 'Recovered attendance count:', COUNT(*) FROM attendance;

-- Step 5: Check for any related tables that might need updating
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'registrations' OR tc.table_name = 'attendance'
     OR ccu.table_name = 'registrations' OR ccu.table_name = 'attendance');

-- Step 6: After verification, you can drop the backup tables
-- DROP TABLE IF EXISTS registrations_current_backup;
-- DROP TABLE IF EXISTS attendance_current_backup;