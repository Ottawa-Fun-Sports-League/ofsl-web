-- Fix the trigger function to use correct field names
CREATE OR REPLACE FUNCTION trigger_individual_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
    old_league_ids BIGINT[];
    new_league_ids BIGINT[];
    added_league_ids BIGINT[];
    added_league_id BIGINT;
    league_record RECORD;
    user_name TEXT;
BEGIN
    -- Only proceed if league_ids has changed
    IF OLD.league_ids IS DISTINCT FROM NEW.league_ids THEN
        old_league_ids := COALESCE(OLD.league_ids, '{}'::BIGINT[]);
        new_league_ids := COALESCE(NEW.league_ids, '{}'::BIGINT[]);
        
        -- Find newly added league IDs
        added_league_ids := ARRAY(
            SELECT unnest(new_league_ids) 
            EXCEPT 
            SELECT unnest(old_league_ids)
        );
        
        -- For each newly added league, create a notification
        FOREACH added_league_id IN ARRAY added_league_ids
        LOOP
            -- Get league information
            SELECT id, name INTO league_record
            FROM leagues
            WHERE id = added_league_id
            AND team_registration = false; -- Only for individual registration leagues
            
            IF FOUND THEN
                -- Use the name field (not first_name/last_name)
                user_name := COALESCE(NEW.name, 'Unknown');
                
                -- Insert notification record
                INSERT INTO individual_registration_notifications (
                    user_id,
                    user_name,
                    user_email,
                    user_phone,
                    league_id,
                    league_name,
                    registered_at
                ) VALUES (
                    NEW.id,
                    user_name,
                    COALESCE(NEW.email, 'Unknown'),
                    NEW.phone,
                    league_record.id,
                    league_record.name,
                    NOW()
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;