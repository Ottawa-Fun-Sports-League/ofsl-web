/*
  # Add active column to gyms table

  1. Schema Changes
    - Add `active` column to `gyms` table
    - Set default value to `true`
    - Make column non-nullable with default

  2. Data Migration
    - Set all existing gyms to active by default

  3. Security
    - No RLS changes needed (existing policies will apply)
*/

-- Add active column to gyms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gyms' AND column_name = 'active'
  ) THEN
    ALTER TABLE gyms ADD COLUMN active boolean DEFAULT true NOT NULL;
  END IF;
END $$;