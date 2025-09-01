-- Fix spares unique constraint to allow multiple inactive registrations
-- This migration replaces the problematic unique constraint with a partial one

BEGIN;

-- Drop the existing unique constraint that includes is_active = false
ALTER TABLE public.spares 
DROP CONSTRAINT IF EXISTS spares_user_id_sport_id_is_active_key;

-- Create a partial unique index that only applies to active registrations
-- This allows multiple inactive registrations but only one active registration per user per sport
CREATE UNIQUE INDEX spares_user_sport_active_unique 
ON public.spares (user_id, sport_id) 
WHERE is_active = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX public.spares_user_sport_active_unique IS 'Ensures a user can only have one active registration per sport, but allows multiple inactive ones';

COMMIT;