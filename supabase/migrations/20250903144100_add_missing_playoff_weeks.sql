-- Ensure leagues table has playoff_weeks prior to later migrations
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS playoff_weeks integer DEFAULT 0;

UPDATE public.leagues
SET playoff_weeks = 0
WHERE playoff_weeks IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leagues_playoff_weeks_check'
      AND conrelid = 'public.leagues'::regclass
  ) THEN
    ALTER TABLE public.leagues
      ADD CONSTRAINT leagues_playoff_weeks_check
        CHECK (playoff_weeks >= 0 AND playoff_weeks <= 6);
  END IF;
END $$;
