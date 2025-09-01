-- Add notification preference columns to users table
-- This migration adds boolean columns for each notification type with appropriate defaults

-- Add notification preference columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_game_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_league_updates BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_payment_reminders BOOLEAN DEFAULT true;

-- Add comment to document the new columns
COMMENT ON COLUMN users.notification_email IS 'User preference for receiving general email notifications';
COMMENT ON COLUMN users.notification_game_reminders IS 'User preference for receiving game reminder notifications';
COMMENT ON COLUMN users.notification_league_updates IS 'User preference for receiving league update notifications';
COMMENT ON COLUMN users.notification_payment_reminders IS 'User preference for receiving payment reminder notifications';

-- Update existing users to have the default notification preferences
-- This ensures all existing users get the same defaults as new users
UPDATE users 
SET 
    notification_email = COALESCE(notification_email, true),
    notification_game_reminders = COALESCE(notification_game_reminders, true),
    notification_league_updates = COALESCE(notification_league_updates, false),
    notification_payment_reminders = COALESCE(notification_payment_reminders, true)
WHERE 
    notification_email IS NULL 
    OR notification_game_reminders IS NULL 
    OR notification_league_updates IS NULL 
    OR notification_payment_reminders IS NULL;