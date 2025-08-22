-- Migration: Fix Wednesday league waitlist and add missing waitlisted users
-- Issue: Wednesday league has 28 registrations but only 26 spots
-- Also: Karthik Ramasubramanian and Surya Kiran should be registered as waitlisted

-- 1. First, mark the last 2 registrants as waitlisted (they registered after the league was full)
UPDATE league_payments
SET is_waitlisted = true
WHERE id IN (
    -- Suryanshu Bhoi (27th registrant)
    311,
    -- Shubh Bangotra (28th registrant) 
    313
);

-- 2. Add missing registrations for Karthik and Surya as waitlisted
-- These users exist but have no payment records - they should be on the waitlist

-- Add Karthik Ramasubramanian to waitlist
INSERT INTO league_payments (
    user_id,
    league_id,
    team_id,
    amount_due,
    amount_paid,
    status,
    is_waitlisted,
    created_at
) 
SELECT 
    '1755552014.505247_e411e6a0', -- Karthik's user_id
    27, -- Wednesday league
    NULL, -- Individual registration
    0, -- No payment due for waitlist
    0,
    'pending',
    true, -- Waitlisted
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM league_payments 
    WHERE user_id = '1755552014.505247_e411e6a0' 
    AND league_id = 27
);

-- Add Surya Kiran Suresh to waitlist
INSERT INTO league_payments (
    user_id,
    league_id,
    team_id,
    amount_due,
    amount_paid,
    status,
    is_waitlisted,
    created_at
)
SELECT 
    '1755489673.900369_dbefcc46', -- Surya's user_id
    27, -- Wednesday league
    NULL, -- Individual registration
    0, -- No payment due for waitlist
    0,
    'pending',
    true, -- Waitlisted
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM league_payments 
    WHERE user_id = '1755489673.900369_dbefcc46' 
    AND league_id = 27
);

-- 3. Verify the results
DO $$
DECLARE
    v_active_count INTEGER;
    v_waitlisted_count INTEGER;
    v_capacity INTEGER;
BEGIN
    -- Get counts for Wednesday league
    SELECT 
        COUNT(*) FILTER (WHERE is_waitlisted = false OR is_waitlisted IS NULL),
        COUNT(*) FILTER (WHERE is_waitlisted = true)
    INTO v_active_count, v_waitlisted_count
    FROM league_payments
    WHERE league_id = 27
    AND team_id IS NULL;
    
    -- Get capacity
    SELECT max_teams INTO v_capacity
    FROM leagues
    WHERE id = 27;
    
    RAISE NOTICE 'Wednesday league fixed: % active (capacity: %), % waitlisted', 
        v_active_count, v_capacity, v_waitlisted_count;
END $$;