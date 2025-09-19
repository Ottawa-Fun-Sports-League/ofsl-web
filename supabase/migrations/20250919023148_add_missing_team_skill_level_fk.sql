-- Ensure teams.skill_level_id has the expected foreign key to skills
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teams_skill_level_id_fkey'
          AND conrelid = 'public.teams'::regclass
    ) THEN
        ALTER TABLE public.teams
            ADD CONSTRAINT teams_skill_level_id_fkey
                FOREIGN KEY (skill_level_id)
                REFERENCES public.skills(id)
                ON UPDATE NO ACTION
                ON DELETE NO ACTION;
    END IF;
END $$;
