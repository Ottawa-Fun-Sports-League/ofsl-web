-- Update all leagues to have playoff_weeks = 0
-- This ensures all leagues start with 0 playoff weeks and admins must manually add playoff weeks when needed

UPDATE leagues 
SET playoff_weeks = 0 
WHERE playoff_weeks = 2 OR playoff_weeks IS NULL;