-- Revert RLS on weekly_schedules to admins-only management.
-- Facilitators remain allowed to manage game_results (unchanged).

-- Ensure RLS is enabled
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Drop any facilitator-manage policies if present, and recreate admin-only.
DROP POLICY IF EXISTS "Admins and facilitators can manage weekly schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Facilitators can manage weekly schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Admins can manage weekly schedules" ON public.weekly_schedules;

CREATE POLICY "Admins can manage weekly schedules" ON public.weekly_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.is_admin = true
    )
  );

-- Keep read-access policy untouched; create if missing for safety.
DROP POLICY IF EXISTS "Authenticated users can view weekly schedules" ON public.weekly_schedules;
CREATE POLICY "Authenticated users can view weekly schedules" ON public.weekly_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

