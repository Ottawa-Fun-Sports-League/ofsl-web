-- Create a function to sync payment due dates when a league's payment_due_date is updated
CREATE OR REPLACE FUNCTION sync_league_payment_due_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- When a league's payment_due_date is updated, update all pending payments for that league
  IF TG_OP = 'UPDATE' AND OLD.payment_due_date IS DISTINCT FROM NEW.payment_due_date THEN
    UPDATE league_payments
    SET due_date = NEW.payment_due_date
    WHERE league_id = NEW.id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing payment due dates
CREATE TRIGGER sync_payment_due_dates_trigger
AFTER UPDATE ON leagues
FOR EACH ROW
EXECUTE FUNCTION sync_league_payment_due_dates();