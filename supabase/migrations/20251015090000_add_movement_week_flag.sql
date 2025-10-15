-- Add movement_week flag to weekly_schedules and helper RPC to set it per week

-- 1) Column to persist Movement Week at week level (stored per tier row)
ALTER TABLE public.weekly_schedules
  ADD COLUMN IF NOT EXISTS movement_week boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.weekly_schedules.movement_week
  IS 'Marks the entire week as Movement Week. Stored on each row for that week; set uniformly via RPC.';

-- Optional: partial index for quick queries of movement weeks
CREATE INDEX IF NOT EXISTS weekly_schedules_movement_week_true_idx
  ON public.weekly_schedules (movement_week)
  WHERE movement_week = true;

-- 2) RPC to set/unset Movement Week for a given league + week (updates all rows for that week)
CREATE OR REPLACE FUNCTION public.set_week_movement_week(
  p_league_id integer,
  p_week_number integer,
  p_movement boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.weekly_schedules
     SET movement_week = p_movement,
         updated_at = NOW()
   WHERE league_id = p_league_id
     AND week_number = p_week_number;
END;
$$;

COMMENT ON FUNCTION public.set_week_movement_week(integer, integer, boolean)
  IS 'Sets movement_week for all weekly_schedules rows for the specified league + week.';

-- 3) Grant execute to authenticated (adjust if your policy differs)
GRANT EXECUTE ON FUNCTION public.set_week_movement_week(integer, integer, boolean) TO authenticated;

