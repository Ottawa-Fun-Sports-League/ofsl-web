-- Migration: Add waitlist support for individual registrations
-- Issue: Individual badminton registrations don't have waitlist functionality
-- This caused the Sunday league to accept 29 registrations when it only has 28 spots

-- 1. Add is_waitlisted column to league_payments table
ALTER TABLE league_payments 
ADD COLUMN IF NOT EXISTS is_waitlisted BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN league_payments.is_waitlisted IS 'Indicates if this individual registration is on the waitlist (only applies when team_id is NULL)';

-- 2. Create an index for efficient waitlist queries
CREATE INDEX IF NOT EXISTS idx_league_payments_waitlist 
ON league_payments(league_id, is_waitlisted) 
WHERE team_id IS NULL;

-- 3. Mark the 29th registrant for Sunday league as waitlisted
-- Randy Tri registered last and the league only has 28 spots
UPDATE league_payments
SET is_waitlisted = true
WHERE id = 372; -- Randy Tri's registration for Sunday league

-- 4. Create a function to check if a league is full for individual registrations
CREATE OR REPLACE FUNCTION is_individual_league_full(p_league_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_spots INTEGER;
    v_current_registrations INTEGER;
BEGIN
    -- Get the max capacity for the league
    SELECT max_teams INTO v_max_spots
    FROM leagues
    WHERE id = p_league_id
      AND team_registration = false;
    
    -- If no max_teams set or league doesn't exist, return false (not full)
    IF v_max_spots IS NULL THEN
        RETURN false;
    END IF;
    
    -- Count current non-waitlisted registrations
    SELECT COUNT(*) INTO v_current_registrations
    FROM league_payments
    WHERE league_id = p_league_id
      AND team_id IS NULL
      AND is_waitlisted = false;
    
    -- Return true if full
    RETURN v_current_registrations >= v_max_spots;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to automatically set waitlist status for new individual registrations
CREATE OR REPLACE FUNCTION auto_set_waitlist_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply to individual registrations (team_id is NULL)
    IF NEW.team_id IS NULL THEN
        -- Check if league is full
        IF is_individual_league_full(NEW.league_id) THEN
            NEW.is_waitlisted := true;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically set waitlist status on new registrations
CREATE TRIGGER set_waitlist_on_insert
    BEFORE INSERT ON league_payments
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_waitlist_status();

-- 7. Create a function to move waitlisted users up when spots open
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_league_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_promoted_count INTEGER := 0;
    v_available_spots INTEGER;
    v_waitlist_record RECORD;
BEGIN
    -- Calculate available spots
    SELECT 
        l.max_teams - COUNT(lp.id) INTO v_available_spots
    FROM leagues l
    LEFT JOIN league_payments lp ON lp.league_id = l.id 
        AND lp.team_id IS NULL 
        AND lp.is_waitlisted = false
    WHERE l.id = p_league_id 
        AND l.team_registration = false
    GROUP BY l.max_teams;
    
    -- If there are available spots, promote from waitlist
    IF v_available_spots > 0 THEN
        FOR v_waitlist_record IN
            SELECT id
            FROM league_payments
            WHERE league_id = p_league_id
              AND team_id IS NULL
              AND is_waitlisted = true
            ORDER BY created_at ASC
            LIMIT v_available_spots
        LOOP
            UPDATE league_payments
            SET is_waitlisted = false
            WHERE id = v_waitlist_record.id;
            
            v_promoted_count := v_promoted_count + 1;
        END LOOP;
    END IF;
    
    RETURN v_promoted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to promote from waitlist when a registration is deleted
CREATE OR REPLACE FUNCTION handle_registration_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only handle individual registration deletions
    IF OLD.team_id IS NULL AND OLD.is_waitlisted = false THEN
        -- Try to promote someone from the waitlist
        PERFORM promote_from_waitlist(OLD.league_id);
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promote_on_delete
    AFTER DELETE ON league_payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_registration_deletion();

-- 9. Add RLS policy for waitlist visibility
CREATE POLICY "Users can see waitlist status" ON league_payments
    FOR SELECT
    USING (true);

-- 10. Verify the migration worked
DO $$
DECLARE
    v_waitlisted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_waitlisted_count
    FROM league_payments
    WHERE is_waitlisted = true;
    
    RAISE NOTICE 'Migration complete. % registrations marked as waitlisted.', v_waitlisted_count;
END $$;