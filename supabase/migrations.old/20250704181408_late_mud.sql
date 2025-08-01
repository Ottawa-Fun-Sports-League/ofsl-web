/*
  # Add hide_day column to leagues table

  1. New Columns
    - `hide_day` (boolean) - Flag to hide the day of week in league display
    - Default value is false (day is shown)
    - Allows leagues to hide the day of week when needed

  2. Security
    - No changes to existing RLS policies
*/

-- Add hide_day column to leagues table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'hide_day'
  ) THEN
    ALTER TABLE leagues ADD COLUMN hide_day boolean DEFAULT false;
  END IF;
END $$;