/*
  # Add skill level to teams table

  1. Changes
    - Add `skill_level_id` (bigint) - foreign key to skills table
    - Add index for better query performance

  2. Security
    - No changes to existing RLS policies
*/

-- Add skill_level_id column to teams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'skill_level_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN skill_level_id bigint REFERENCES skills(id);
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_skill_level_id ON teams(skill_level_id);