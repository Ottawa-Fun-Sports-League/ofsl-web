-- Ensure teams table has captain_id foreign key to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teams_captain_id_fkey'
          AND conrelid = 'public.teams'::regclass
    ) THEN
        ALTER TABLE public.teams
            ADD CONSTRAINT teams_captain_id_fkey
                FOREIGN KEY (captain_id)
                REFERENCES public.users(id)
                ON UPDATE NO ACTION
                ON DELETE SET NULL;
    END IF;
END $$;
