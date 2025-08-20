-- Ensure the individual registration notification cron job exists
-- This will process the notifications queue and send emails

-- First, ensure the pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Also ensure pg_net is enabled for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Check if the cron job exists and recreate it
DO $$
BEGIN
    -- Check if cron schema exists and job table is accessible
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'cron' 
        AND table_name = 'job'
    ) THEN
        -- Remove existing job if it exists
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-individual-registration-notifications') THEN
            PERFORM cron.unschedule('process-individual-registration-notifications');
        END IF;
        
        -- Create the cron job to process individual notifications
        -- This matches exactly how team notifications work
        PERFORM cron.schedule(
            'process-individual-registration-notifications',
            '*/5 * * * *', -- Run every 5 minutes
            'SELECT net.http_post(' ||
                'url := ''https://aijuhalowwjbccyjrlgf.supabase.co/functions/v1/process-individual-notification-queue'', ' ||
                'headers := jsonb_build_object(' ||
                    '''Content-Type'', ''application/json'', ' ||
                    '''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)' ||
                '), ' ||
                'body := ''{}''::jsonb' ||
            ');'
        );
        
        RAISE NOTICE 'Individual registration notification cron job scheduled successfully';
    ELSE
        RAISE NOTICE 'Cron extension not available - notifications will need to be processed manually';
    END IF;
END $$;

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