/*
  # Add skill_ids array to leagues table

  1. New Columns
    - `skill_ids` (bigint[]) - array of skill IDs that apply to this league
    - This allows leagues to have multiple skill levels
    - Maintains backward compatibility with existing skill_id column

  2. Security
    - No changes to existing RLS policies
*/

-- Add skill_ids column to leagues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'skill_ids'
  ) THEN
    ALTER TABLE leagues ADD COLUMN skill_ids bigint[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_leagues_skill_ids ON leagues USING GIN(skill_ids);

-- Migrate existing skill_id data to skill_ids array
UPDATE leagues
SET skill_ids = ARRAY[skill_id]
WHERE skill_id IS NOT NULL AND (skill_ids IS NULL OR array_length(skill_ids, 1) IS NULL);