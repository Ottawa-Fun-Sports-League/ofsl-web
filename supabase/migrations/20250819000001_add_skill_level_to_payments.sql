-- Add skill_level_id to league_payments table for individual registrations
ALTER TABLE league_payments
ADD COLUMN skill_level_id INTEGER REFERENCES skills(id);

-- Add index for better query performance
CREATE INDEX idx_league_payments_skill_level_id ON league_payments(skill_level_id);

-- Comment on the column
COMMENT ON COLUMN league_payments.skill_level_id IS 'Skill level for individual registrations. For team registrations, skill level is stored in the teams table.';