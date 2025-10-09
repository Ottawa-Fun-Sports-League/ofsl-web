-- Add draft/publish scheduling fields to leagues
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publish_date timestamptz NULL;

COMMENT ON COLUMN public.leagues.is_draft IS 'When true, league remains hidden from public listings until manually published or publish_date is reached';
COMMENT ON COLUMN public.leagues.publish_date IS 'Optional scheduled publish timestamp; when reached the league becomes visible even if is_draft is still true';
