-- Expand RLS policies so captains can view volleyball spares
-- and all authenticated users can view individual-sport spares (Badminton, Pickleball)

-- Ensure RLS is enabled (no-op if already enabled)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.spares ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

-- Drop old custom view policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Captains can view volleyball spares" ON public.spares;
DROP POLICY IF EXISTS "All users can view individual spares" ON public.spares;

-- Allow captains/co-captains of active Volleyball leagues to view Volleyball spares
CREATE POLICY "Captains can view volleyball spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.leagues l ON l.id = t.league_id
    JOIN public.sports s ON s.id = l.sport_id
    WHERE s.name ILIKE 'Volleyball'
      AND (t.captain_id = get_current_user_id() OR get_current_user_id() = ANY(COALESCE(t.co_captains, ARRAY[]::text[])))
      AND (t.active = true)
      AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
      AND public.spares.sport_id = s.id
  )
);

-- Allow all authenticated users to view spares for individual sports (Badminton, Pickleball)
CREATE POLICY "All users can view individual spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sports s
    WHERE s.id = public.spares.sport_id
      AND s.name ILIKE ANY (ARRAY['Badminton','Pickleball'])
  )
);
;
