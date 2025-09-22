BEGIN;

ALTER TABLE public.spares
  ADD COLUMN IF NOT EXISTS gender_identity TEXT,
  ADD COLUMN IF NOT EXISTS gender_identity_other TEXT,
  ADD COLUMN IF NOT EXISTS volleyball_positions TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.spares.gender_identity IS 'Canonical gender identity selection (lowercase, hyphenated tokens)';
COMMENT ON COLUMN public.spares.gender_identity_other IS 'Optional free-form gender self description when canonical option is self-described';
COMMENT ON COLUMN public.spares.volleyball_positions IS 'Array of normalized volleyball positions selected by the spare';

COMMIT;
