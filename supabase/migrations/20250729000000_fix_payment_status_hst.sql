-- Fix payment status calculation to include 13% HST
-- This migration updates the payment status trigger to properly account for HST

-- Drop the existing function first
DROP FUNCTION IF EXISTS update_payment_status() CASCADE;

-- Create the updated function that includes HST calculation
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total amount due including 13% HST
  DECLARE
    total_due_with_tax DECIMAL(10,2);
  BEGIN
    total_due_with_tax := NEW.amount_due * 1.13;
    
    -- Update the payment status based on amounts (including HST)
    IF NEW.amount_paid >= total_due_with_tax THEN
      NEW.status = 'paid';
    ELSIF NEW.amount_paid > 0 THEN
      NEW.status = 'partial';
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
      NEW.status = 'overdue';
    ELSE
      NEW.status = 'pending';
    END IF;
  END;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_payment_status
  BEFORE INSERT OR UPDATE ON league_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

-- Update existing records to reflect correct status based on HST calculation
UPDATE league_payments 
SET amount_paid = amount_paid  -- This will trigger the status update
WHERE status = 'paid' AND amount_paid < (amount_due * 1.13);

-- Add comment to document the HST inclusion
COMMENT ON FUNCTION update_payment_status() IS 'Updates payment status based on amount paid vs amount due including 13% HST';