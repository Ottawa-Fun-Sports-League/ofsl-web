-- Create individual registration notifications table
CREATE TABLE IF NOT EXISTS individual_registration_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_phone TEXT,
    league_id BIGINT NOT NULL,
    league_name TEXT NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT individual_registration_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT individual_registration_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT individual_registration_notifications_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE individual_registration_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Service role can manage notifications" 
    ON individual_registration_notifications 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Create index for unsent notifications
CREATE INDEX idx_individual_notifications_unsent 
    ON individual_registration_notifications 
    USING btree (sent, created_at) 
    WHERE (sent = false);

-- Create function to trigger individual registration notification
CREATE OR REPLACE FUNCTION trigger_individual_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
    old_league_ids BIGINT[];
    new_league_ids BIGINT[];
    added_league_ids BIGINT[];
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
                -- Create full name
                user_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.name, 'Unknown');
                
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

-- Create trigger on users table for league_ids updates
DROP TRIGGER IF EXISTS on_user_league_registration ON users;
CREATE TRIGGER on_user_league_registration
AFTER UPDATE OF league_ids ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_individual_registration_notification();

-- Also trigger on INSERT for new users with league_ids
DROP TRIGGER IF EXISTS on_user_league_registration_insert ON users;
CREATE TRIGGER on_user_league_registration_insert
AFTER INSERT ON users
FOR EACH ROW
WHEN (NEW.league_ids IS NOT NULL AND array_length(NEW.league_ids, 1) > 0)
EXECUTE FUNCTION trigger_individual_registration_notification();