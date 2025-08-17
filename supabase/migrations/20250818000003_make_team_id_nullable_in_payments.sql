-- Make team_id nullable in league_payments table to support individual registrations
ALTER TABLE league_payments 
ALTER COLUMN team_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN league_payments.team_id IS 'Team ID for team registrations. NULL for individual registrations.';