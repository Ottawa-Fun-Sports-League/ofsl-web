/*
  # Add year column to leagues table

  1. Changes
    - Add `year` column to `leagues` table as text type
    - Column is nullable to allow existing records
    - Default value can be set later if needed

  2. Notes
    - This resolves the schema cache error when updating leagues
    - Existing leagues will have null year values initially
*/

-- Add year column to leagues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'year'
  ) THEN
    ALTER TABLE leagues ADD COLUMN year text;
  END IF;
END $$;