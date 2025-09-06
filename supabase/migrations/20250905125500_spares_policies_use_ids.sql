-- Use sport IDs for spares RLS to improve performance and avoid string comparisons

-- Constants (from sports table): Volleyball=1, Badminton=2, Pickleball=4
-- Drop previous name-based policies
DROP POLICY IF EXISTS "Captains can view volleyball spares" ON public.spares;
DROP POLICY IF EXISTS "All users can view individual spares" ON public.spares;

-- Recreate captain policy using sport_id = 1 (Volleyball)
CREATE POLICY "Captains can view volleyball spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  public.spares.sport_id = 1
  AND EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.leagues l ON l.id = t.league_id
    WHERE l.sport_id = 1
      AND (t.captain_id = get_current_user_id() OR get_current_user_id() = ANY(COALESCE(t.co_captains, ARRAY[]::text[])))
      AND t.active = true
      AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
  )
);

-- Recreate individual sports policy using sport_id IN (2,4)
CREATE POLICY "All users can view individual spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  public.spares.sport_id IN (2, 4)
);

