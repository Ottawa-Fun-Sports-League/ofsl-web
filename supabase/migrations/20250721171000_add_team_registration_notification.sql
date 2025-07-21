-- Create a table to store pending notifications
CREATE TABLE IF NOT EXISTS team_registration_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    captain_email TEXT NOT NULL,
    captain_phone TEXT,
    league_name TEXT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL,
    roster_count INTEGER NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for unsent notifications
CREATE INDEX IF NOT EXISTS idx_team_notifications_unsent 
ON team_registration_notifications(sent, created_at) 
WHERE sent = FALSE;

-- Create a function to queue team registration notifications
CREATE OR REPLACE FUNCTION queue_team_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
    captain_record RECORD;
    league_record RECORD;
BEGIN
    -- Only proceed for new teams (on INSERT)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get captain information
    SELECT name, email, phone INTO captain_record
    FROM users
    WHERE id = NEW.captain_id;

    -- Get league information
    SELECT name INTO league_record
    FROM leagues
    WHERE id = NEW.league_id;

    -- Insert notification record
    INSERT INTO team_registration_notifications (
        team_id,
        team_name,
        captain_name,
        captain_email,
        captain_phone,
        league_name,
        registered_at,
        roster_count
    ) VALUES (
        NEW.id,
        NEW.name,
        COALESCE(captain_record.name, 'Unknown'),
        COALESCE(captain_record.email, 'Unknown'),
        captain_record.phone,
        COALESCE(league_record.name, 'Unknown League'),
        NEW.created_at,
        COALESCE(array_length(NEW.roster, 1), 1)
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the team creation
        RAISE WARNING 'Failed to queue team registration notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new team registrations
DROP TRIGGER IF EXISTS on_team_registration ON teams;
CREATE TRIGGER on_team_registration
    AFTER INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION queue_team_registration_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION queue_team_registration_notification() TO postgres;

-- RLS policies for the notifications table
ALTER TABLE team_registration_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access the notifications table
CREATE POLICY "Service role can manage notifications"
ON team_registration_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE team_registration_notifications IS 'Queue for team registration email notifications to be processed by Edge Functions';