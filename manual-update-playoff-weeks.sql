-- Manual SQL to update all leagues to have playoff_weeks = 0
-- This should be executed by a database admin or service role

-- First, let's see the current state
SELECT 
  id, 
  name, 
  playoff_weeks,
  CASE 
    WHEN playoff_weeks = 0 THEN 'Already correct'
    WHEN playoff_weeks = 2 THEN 'Needs update (was default 2)'
    WHEN playoff_weeks IS NULL THEN 'Needs update (was NULL)'
    ELSE 'Needs update (custom value: ' || playoff_weeks || ')'
  END as status
FROM leagues 
ORDER BY name;

-- Update all leagues to have playoff_weeks = 0
-- This ensures all leagues start with 0 playoff weeks and admins must manually add playoff weeks when needed
UPDATE leagues 
SET playoff_weeks = 0 
WHERE playoff_weeks = 2 OR playoff_weeks IS NULL OR playoff_weeks != 0;

-- Verify the update
SELECT 
  id, 
  name, 
  playoff_weeks,
  CASE 
    WHEN playoff_weeks = 0 THEN '✓ Correct'
    ELSE '✗ Still needs fixing'
  END as status
FROM leagues 
ORDER BY name;

-- Show summary
SELECT 
  COUNT(*) as total_leagues,
  COUNT(CASE WHEN playoff_weeks = 0 THEN 1 END) as leagues_with_zero_playoff_weeks,
  COUNT(CASE WHEN playoff_weeks != 0 THEN 1 END) as leagues_still_needing_update
FROM leagues;