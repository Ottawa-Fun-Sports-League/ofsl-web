/*
  # Add location column to leagues table

  1. Changes
    - Add `location` (text) - to store the general location of the league
    - This allows filtering leagues by location area
    - Useful for users to find leagues in their preferred area

  2. Security
    - No changes to existing RLS policies
*/

-- Add location column to leagues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'location'
  ) THEN
    ALTER TABLE leagues ADD COLUMN location text;
  END IF;
END $$;