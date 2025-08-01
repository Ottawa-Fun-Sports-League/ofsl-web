/*
  # Add availability columns to gyms table

  1. Changes
    - Add `available_days` (smallint[]) - array of day numbers (0=Sunday, 1=Monday, etc.)
    - Add `available_sports` (bigint[]) - array of sport IDs

  2. Security
    - No changes to existing RLS policies
*/

-- Add available_days and available_sports columns to gyms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyms' AND column_name = 'available_days'
  ) THEN
    ALTER TABLE gyms ADD COLUMN available_days smallint[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyms' AND column_name = 'available_sports'
  ) THEN
    ALTER TABLE gyms ADD COLUMN available_sports bigint[] DEFAULT '{}';
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gyms_available_days ON gyms USING GIN(available_days);
CREATE INDEX IF NOT EXISTS idx_gyms_available_sports ON gyms USING GIN(available_sports);