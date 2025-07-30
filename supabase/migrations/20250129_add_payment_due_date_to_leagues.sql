-- Add payment_due_date field to leagues table
ALTER TABLE leagues 
ADD COLUMN payment_due_date DATE;

-- Set default payment due date for all existing leagues to Aug 21, 2025
UPDATE leagues 
SET payment_due_date = '2025-08-21'
WHERE payment_due_date IS NULL;

-- Update the create_league_payment_for_team function to use league's payment_due_date
CREATE OR REPLACE FUNCTION create_league_payment_for_team()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new team is created, create a league payment record for the captain
  IF TG_OP = 'INSERT' AND NEW.captain_id IS NOT NULL AND NEW.league_id IS NOT NULL THEN
    -- Get the league cost and payment due date
    INSERT INTO league_payments (
      user_id,
      team_id,
      league_id,
      amount_due,
      due_date,
      status
    )
    SELECT 
      NEW.captain_id,
      NEW.id,
      NEW.league_id,
      COALESCE(l.cost, 0.00),
      COALESCE(l.payment_due_date, CURRENT_DATE + INTERVAL '30 days'), -- Use league's payment_due_date or default to 30 days
      'pending'
    FROM leagues l
    WHERE l.id = NEW.league_id
    AND COALESCE(l.cost, 0.00) > 0; -- Only create if there's a cost
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for the new column
-- Admins can update payment_due_date
CREATE POLICY "Admins can update payment_due_date" ON leagues
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );