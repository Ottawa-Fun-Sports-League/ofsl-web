-- Ensure ON DELETE CASCADE on key foreign keys so deleting a league
-- cleans up dependent data (scores, schedules, standings, etc.).
-- This migration is defensive: it checks table/column existence and
-- drops/re-adds FK constraints as needed.

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Helper to drop all FKs on a table
  -- (Postgres lacks IF NOT EXISTS for ADD CONSTRAINT, so we clear first.)
  PERFORM 1; -- no-op placeholder
END $$;

-- game_results.league_id -> leagues(id) ON DELETE CASCADE
DO $$
DECLARE c RECORD; BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'game_results'
  ) THEN
    -- Drop existing foreign keys on game_results
    FOR c IN (
      SELECT conname 
      FROM pg_constraint co
      JOIN pg_class rel ON rel.oid = co.conrelid
      WHERE rel.relname = 'game_results' AND co.contype = 'f'
    ) LOOP
      EXECUTE format('ALTER TABLE public.game_results DROP CONSTRAINT %I', c.conname);
    END LOOP;

    -- Recreate desired FK
    ALTER TABLE public.game_results
      ADD CONSTRAINT fk_game_results_league
      FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;
  END IF;
END $$;

-- weekly_schedules.league_id -> leagues(id) ON DELETE CASCADE
DO $$
DECLARE c RECORD; BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'weekly_schedules'
  ) THEN
    FOR c IN (
      SELECT conname 
      FROM pg_constraint co
      JOIN pg_class rel ON rel.oid = co.conrelid
      WHERE rel.relname = 'weekly_schedules' AND co.contype = 'f'
    ) LOOP
      EXECUTE format('ALTER TABLE public.weekly_schedules DROP CONSTRAINT %I', c.conname);
    END LOOP;

    ALTER TABLE public.weekly_schedules
      ADD CONSTRAINT fk_weekly_schedules_league
      FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;
  END IF;
END $$;

-- standings.league_id -> leagues(id) ON DELETE CASCADE
-- standings.team_id   -> teams(id)   ON DELETE CASCADE
DO $$
DECLARE c RECORD; BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'standings'
  ) THEN
    FOR c IN (
      SELECT conname 
      FROM pg_constraint co
      JOIN pg_class rel ON rel.oid = co.conrelid
      WHERE rel.relname = 'standings' AND co.contype = 'f'
    ) LOOP
      EXECUTE format('ALTER TABLE public.standings DROP CONSTRAINT %I', c.conname);
    END LOOP;

    ALTER TABLE public.standings
      ADD CONSTRAINT fk_standings_league
      FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

    ALTER TABLE public.standings
      ADD CONSTRAINT fk_standings_team
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- teams.league_id -> leagues(id) ON DELETE CASCADE (if league_id exists)
DO $$
DECLARE c RECORD; BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'teams'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'league_id'
  ) THEN
    FOR c IN (
      SELECT conname 
      FROM pg_constraint co
      JOIN pg_class rel ON rel.oid = co.conrelid
      WHERE rel.relname = 'teams' AND co.contype = 'f'
    ) LOOP
      EXECUTE format('ALTER TABLE public.teams DROP CONSTRAINT %I', c.conname);
    END LOOP;

    ALTER TABLE public.teams
      ADD CONSTRAINT fk_teams_league
      FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;
  END IF;
END $$;

-- league_schedules.league_id -> leagues(id) ON DELETE CASCADE
DO $$
DECLARE c RECORD; BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'league_schedules'
  ) THEN
    FOR c IN (
      SELECT conname 
      FROM pg_constraint co
      JOIN pg_class rel ON rel.oid = co.conrelid
      WHERE rel.relname = 'league_schedules' AND co.contype = 'f'
    ) LOOP
      EXECUTE format('ALTER TABLE public.league_schedules DROP CONSTRAINT %I', c.conname);
    END LOOP;

    ALTER TABLE public.league_schedules
      ADD CONSTRAINT fk_league_schedules_league
      FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Optional: clean up any orphaned rows that may already exist (safety sweep)
-- Uncomment if you want an immediate cleanup; otherwise, cascades will apply on future deletes.
-- DELETE FROM public.game_results      gr WHERE NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = gr.league_id);
-- DELETE FROM public.weekly_schedules  ws WHERE NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = ws.league_id);
-- DELETE FROM public.standings         s  WHERE NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = s.league_id)
--                                               OR NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = s.team_id);
-- DELETE FROM public.teams             t  WHERE NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = t.league_id);

