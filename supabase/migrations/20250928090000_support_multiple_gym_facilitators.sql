-- Allow multiple facilitators per gym
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS facilitator_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from existing single facilitator column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gyms'
      AND column_name = 'facilitator_id'
  ) THEN
    UPDATE public.gyms
    SET facilitator_ids = ARRAY_REMOVE(ARRAY[facilitator_id], NULL)
    WHERE facilitator_id IS NOT NULL
      AND (facilitator_ids IS NULL OR array_length(facilitator_ids, 1) = 0);

    ALTER TABLE public.gyms
      DROP CONSTRAINT IF EXISTS gyms_facilitator_id_fkey;

    ALTER TABLE public.gyms
      DROP COLUMN facilitator_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gyms_facilitator_ids ON public.gyms USING GIN (facilitator_ids);
