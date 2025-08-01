/*
  # Add year field to leagues table

  1. Changes
    - Add `year` (text) - to store the league year (e.g., "2025", "2025/26")
    - Set default value to '2025'
    - Backfill existing leagues with default year

  2. Security
    - No changes to existing RLS policies
*/

-- Add year column to leagues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'year'
  ) THEN
    ALTER TABLE leagues ADD COLUMN year text DEFAULT '2025';
  END IF;
END $$;

-- Update existing leagues to have a year value
UPDATE leagues
SET year = '2025'
WHERE year IS NULL;