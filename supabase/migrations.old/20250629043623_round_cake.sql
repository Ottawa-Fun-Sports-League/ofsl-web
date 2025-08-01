/*
  # Add league_id to stripe_orders table

  1. Changes
    - Add `league_id` (bigint) - foreign key to leagues table
    - This allows tracking which league a payment is for
    - Useful for reporting and reconciliation

  2. Security
    - No changes to existing RLS policies
*/

-- Add league_id column to stripe_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_orders' AND column_name = 'league_id'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN league_id bigint REFERENCES leagues(id);
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_stripe_orders_league_id ON stripe_orders(league_id);