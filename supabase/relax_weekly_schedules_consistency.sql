-- Relax positional consistency constraints so tier movement can place B/C immediately
-- Safe to run multiple times

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  constraint_name = 'check_team_c_consistency'
    AND    table_name = 'weekly_schedules'
  ) THEN
    EXECUTE 'ALTER TABLE weekly_schedules DROP CONSTRAINT check_team_c_consistency';
  END IF;
END $$;

-- Optionally, you may add independent checks that do not require ordering.
-- For example, ensure rankings are non-negative when names are present.
-- Uncomment if desired:
-- ALTER TABLE weekly_schedules
--   ADD CONSTRAINT weekly_schedules_ranking_nonnegative
--   CHECK (
--     (team_a_name IS NULL OR team_a_ranking IS NULL OR team_a_ranking >= 0) AND
--     (team_b_name IS NULL OR team_b_ranking IS NULL OR team_b_ranking >= 0) AND
--     (team_c_name IS NULL OR team_c_ranking IS NULL OR team_c_ranking >= 0)
--   );

