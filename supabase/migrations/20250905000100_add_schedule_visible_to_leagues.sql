-- Add a flag to control whether a league's schedule is visible on the public view
-- Defaults to true to preserve current behavior
alter table public.leagues
  add column if not exists schedule_visible boolean not null default true;

comment on column public.leagues.schedule_visible is 'When false, the public league page shows a "Schedule coming soon" overlay';

