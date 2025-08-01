/*
  # Create stripe_products table

  1. New Tables
    - `stripe_products`
      - `id` (text, primary key) - Stripe product ID
      - `price_id` (text) - Stripe price ID
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `mode` (text) - 'payment' or 'subscription'
      - `price` (decimal) - Price amount
      - `currency` (text) - Currency code (default 'cad')
      - `interval` (text) - For subscriptions: 'month', 'year', etc.
      - `league_id` (bigint) - Optional reference to leagues table
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `stripe_products` table
    - Add policy for public read access
    - Add policy for admin-only write access
*/

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(p_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = p_table_name
  );
END;
$$;

-- Create the stripe_products table if it doesn't exist
DO $$
BEGIN
  IF NOT check_table_exists('stripe_products') THEN
    -- Create the table
    CREATE TABLE stripe_products (
      id text PRIMARY KEY,
      price_id text NOT NULL,
      name text NOT NULL,
      description text,
      mode text NOT NULL,
      price decimal(10,2),
      currency text DEFAULT 'cad',
      interval text,
      league_id bigint REFERENCES leagues(id),
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Allow all users to read products"
      ON stripe_products
      FOR SELECT
      TO public
      USING (true);

    CREATE POLICY "Allow admins to manage products"
      ON stripe_products
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_id = auth.uid() AND users.is_admin = true
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_id = auth.uid() AND users.is_admin = true
      ));

    -- Create trigger to update updated_at
    CREATE TRIGGER update_stripe_products_updated_at
      BEFORE UPDATE ON stripe_products
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;