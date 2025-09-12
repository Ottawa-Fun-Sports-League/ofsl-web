-- Additional relaxation: drop A/B consistency constraints that enforce positional ordering
-- Safe to run multiple times; will no-op if constraints are missing.

DO $$
DECLARE
  c TEXT;
BEGIN
  FOREACH c IN ARRAY ARRAY[
    'check_team_a_consistency',
    'check_team_b_consistency',
    'check_team_c_consistency'
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

