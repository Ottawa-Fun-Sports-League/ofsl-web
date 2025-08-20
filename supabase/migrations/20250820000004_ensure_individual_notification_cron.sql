-- Ensure the individual registration notification cron job exists
-- This will process the notifications queue and send emails

-- First check if the cron job exists, if so unschedule it to recreate
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-individual-registration-notifications') THEN
        PERFORM cron.unschedule('process-individual-registration-notifications');
    END IF;
END $$;

-- Create the cron job to process individual notifications
-- This matches exactly how team notifications work
SELECT cron.schedule(
    'process-individual-registration-notifications',
    '*/5 * * * *', -- Run every 5 minutes
    $$
    SELECT net.http_post(
        url := 'https://aijuhalowwjbccyjrlgf.supabase.co/functions/v1/process-individual-notification-queue',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Make sure the app settings exist if they don't already
-- This sets up the service role key for the cron job to use
DO $$
BEGIN
    -- Check if the setting exists
    IF current_setting('app.settings.service_role_key', true) IS NULL THEN
        -- We can't set it here as we don't have the actual key
        -- But we can log that it needs to be set
        RAISE NOTICE 'app.settings.service_role_key needs to be configured for email notifications to work';
    END IF;
END $$;