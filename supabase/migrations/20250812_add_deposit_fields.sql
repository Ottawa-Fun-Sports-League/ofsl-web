-- Add deposit_amount and deposit_date fields to leagues table
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS deposit_amount REAL,
ADD COLUMN IF NOT EXISTS deposit_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN leagues.deposit_amount IS 'Optional deposit amount required for team registration';
COMMENT ON COLUMN leagues.deposit_date IS 'Deadline date for deposit payment';