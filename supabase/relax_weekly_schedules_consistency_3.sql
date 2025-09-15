-- Relax D/E/F positional consistency constraints so cross-tier placement can occur
-- Safe to run multiple times; will no-op if constraints are missing.

DO $$
DECLARE
  c TEXT;
BEGIN
  FOREACH c IN ARRAY ARRAY[
    'check_team_d_consistency',
    'check_team_e_consistency',
    'check_team_f_consistency'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM   information_schema.table_constraints
      WHERE  constraint_name = c
      AND    table_name = 'weekly_schedules'
    ) THEN
      EXECUTE format('ALTER TABLE weekly_schedules DROP CONSTRAINT %I', c);
    END IF;
  END LOOP;
END $$;

