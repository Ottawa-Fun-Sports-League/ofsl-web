-- Optimize Volleyball spares policy by using a STABLE SECURITY DEFINER function

-- Create a helper function that checks captain/co-captain access for Volleyball
-- This function is row-independent and can be evaluated once per query by the planner
CREATE OR REPLACE FUNCTION public.can_view_volleyball_spares()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.teams t ON t.captain_id = u.id OR u.id = ANY(COALESCE(t.co_captains, ARRAY[]::text[]))
    JOIN public.leagues l ON l.id = t.league_id
    WHERE u.auth_id = auth.uid()
      AND l.sport_id = 1  -- Volleyball
      AND t.active = true
      AND (l.active = true OR l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
  );
$$;

-- Recreate the Volleyball policy to use the function (avoids per-row EXISTS)
DROP POLICY IF EXISTS "Captains can view volleyball spares" ON public.spares;

CREATE POLICY "Captains can view volleyball spares" ON public.spares
FOR SELECT
TO authenticated
USING (
  public.spares.sport_id = 1 AND public.can_view_volleyball_spares()
);

