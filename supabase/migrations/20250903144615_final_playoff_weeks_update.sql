-- Final update to ensure ALL leagues have playoff_weeks = 0
-- This is a data-only migration that updates existing records

UPDATE leagues 
SET playoff_weeks = 0 
WHERE playoff_weeks != 0 OR playoff_weeks IS NULL;

-- Verify the update worked
DO $$
DECLARE
    leagues_updated INTEGER;
    leagues_remaining INTEGER;
BEGIN
    SELECT COUNT(*) INTO leagues_updated FROM leagues WHERE playoff_weeks = 0;
    SELECT COUNT(*) INTO leagues_remaining FROM leagues WHERE playoff_weeks != 0;
    
    RAISE NOTICE 'Playoff weeks update completed:';
    RAISE NOTICE '- Leagues with playoff_weeks = 0: %', leagues_updated;
    RAISE NOTICE '- Leagues with playoff_weeks != 0: %', leagues_remaining;
    
    IF leagues_remaining > 0 THEN
        RAISE WARNING 'Some leagues still have playoff_weeks != 0. Manual intervention may be required.';
    ELSE
        RAISE NOTICE 'SUCCESS: All leagues now have playoff_weeks = 0';
    END IF;
END $$;