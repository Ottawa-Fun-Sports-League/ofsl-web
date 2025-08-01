/*
  # Fix league payments RLS policy for team registration

  1. Security Changes
    - Add INSERT policy for `league_payments` table
    - Allow authenticated users to create payment records for themselves
    - This enables the team registration trigger to work properly

  2. Changes Made
    - Create policy "Users can create their own league payments"
    - Policy allows INSERT when user_id matches the authenticated user's ID
*/

-- Add INSERT policy for league_payments to allow users to create their own payment records
CREATE POLICY "Users can create their own league payments"
  ON league_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_current_user_id());