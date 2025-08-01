/*
  # Add hide_day column to leagues table

  1. Changes
    - Add `hide_day` column to `leagues` table
    - Column type: boolean with default value false
    - This allows leagues to optionally hide the day of week display

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add hide_day column to leagues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'hide_day'
  ) THEN
    ALTER TABLE leagues ADD COLUMN hide_day boolean DEFAULT false;
  END IF;
END $$;