/*
  # Add location column to leagues table

  1. New Columns
    - `location` (text) - General location area for the league
    - Allows specifying a general area like "East end", "West end", etc.
    - Useful for filtering leagues by location

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