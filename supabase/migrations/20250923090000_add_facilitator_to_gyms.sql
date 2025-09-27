-- Add facilitator support to gyms
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS facilitator_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gyms.facilitator_id IS 'Optional user (facilitator) responsible for this gym/location.';

CREATE INDEX IF NOT EXISTS idx_gyms_facilitator_id ON public.gyms(facilitator_id);
