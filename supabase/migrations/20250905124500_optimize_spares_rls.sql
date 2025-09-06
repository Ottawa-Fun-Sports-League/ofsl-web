-- Optimize spares access policies and add supportive indexes to prevent timeouts

-- Add indexes to speed up policy checks and queries
CREATE INDEX IF NOT EXISTS idx_sports_name ON public.sports (name);
CREATE INDEX IF NOT EXISTS idx_leagues_sport_active_end ON public.leagues (sport_id, active, end_date);

-- Replace ILIKE policies with exact matches to leverage indexes
DROP POLICY IF EXISTS "Captains can view volleyball spares" ON public.spares;
DROP POLICY IF EXISTS "All users can view individual spares" ON public.spares;

-- Captains/co-captains can view Volleyball spares
CREATE POLICY "Captains can view volleyball spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.leagues l ON l.id = t.league_id
    JOIN public.sports s ON s.id = l.sport_id
    WHERE s.name = 'Volleyball'
      AND (t.captain_id = get_current_user_id() OR get_current_user_id() = ANY(COALESCE(t.co_captains, ARRAY[]::text[])))
      AND t.active = true
      AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
      AND public.spares.sport_id = s.id
  )
);

-- All authenticated users can view individual spares (Badminton, Pickleball)
CREATE POLICY "All users can view individual spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sports s
    WHERE s.id = public.spares.sport_id
      AND s.name IN ('Badminton','Pickleball')
  )
);

