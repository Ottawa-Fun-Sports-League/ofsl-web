-- Fix the unique constraint issue by removing is_active from the constraint
-- and creating a partial unique index instead

BEGIN;

-- Drop the existing problematic unique constraint
ALTER TABLE public.spares DROP CONSTRAINT IF EXISTS spares_user_id_sport_id_is_active_key;

-- Create a partial unique index that only applies to active registrations
CREATE UNIQUE INDEX IF NOT EXISTS spares_user_sport_active_unique 
ON public.spares (user_id, sport_id) 
WHERE is_active = true;

COMMIT;