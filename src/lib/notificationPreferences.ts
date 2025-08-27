import { supabase } from './supabase';
import { NotificationPreferences } from '../screens/MyAccount/components/ProfileTab/types';

/**
 * Load notification preferences for a user
 */
export async function loadNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('notification_email, notification_game_reminders, notification_league_updates, notification_payment_reminders')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading notification preferences:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Map database column names to frontend property names
    return {
      emailNotifications: data.notification_email ?? true,
      gameReminders: data.notification_game_reminders ?? true,
      leagueUpdates: data.notification_league_updates ?? false,
      paymentReminders: data.notification_payment_reminders ?? true,
    };
  } catch (error) {
    console.error('Error loading notification preferences:', error);
    return null;
  }
}

/**
 * Save notification preferences for a user
 */
export async function saveNotificationPreferences(
  userId: string, 
  preferences: NotificationPreferences
): Promise<boolean> {
  try {
    // Map frontend property names to database column names
    const dbPreferences = {
      notification_email: preferences.emailNotifications,
      notification_game_reminders: preferences.gameReminders,
      notification_league_updates: preferences.leagueUpdates,
      notification_payment_reminders: preferences.paymentReminders,
    };

    const { error } = await supabase
      .from('users')
      .update(dbPreferences)
      .eq('id', userId);

    if (error) {
      console.error('Error saving notification preferences:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    return false;
  }
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  gameReminders: true,
  leagueUpdates: false,
  paymentReminders: true,
};