import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadNotificationPreferences, saveNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../notificationPreferences';
import { supabase } from '../supabase';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Notification Preferences', () => {
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadNotificationPreferences', () => {
    it('should load notification preferences from database', async () => {
      const mockData = {
        notification_email: true,
        notification_game_reminders: false,
        notification_league_updates: true,
        notification_payment_reminders: false,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadNotificationPreferences(mockUserId);

      expect(result).toEqual({
        emailNotifications: true,
        gameReminders: false,
        leagueUpdates: true,
        paymentReminders: false,
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should return default preferences when user not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadNotificationPreferences(mockUserId);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' } 
            })
          })
        })
      } as unknown as ReturnType<typeof supabase.from>);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await loadNotificationPreferences(mockUserId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading notification preferences:', { message: 'Database error' });

      consoleSpy.mockRestore();
    });

    it('should use default values for null database values', async () => {
      const mockData = {
        notification_email: null,
        notification_game_reminders: null,
        notification_league_updates: null,
        notification_payment_reminders: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadNotificationPreferences(mockUserId);

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });
  });

  describe('saveNotificationPreferences', () => {
    it('should save notification preferences to database', async () => {
      const preferences = {
        emailNotifications: false,
        gameReminders: true,
        leagueUpdates: false,
        paymentReminders: true,
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await saveNotificationPreferences(mockUserId, preferences);

      expect(result).toBe(true);
      
      const mockUpdate = vi.mocked(supabase.from).mock.results[0].value.update;
      expect(mockUpdate).toHaveBeenCalledWith({
        notification_email: false,
        notification_game_reminders: true,
        notification_league_updates: false,
        notification_payment_reminders: true,
      });
    });

    it('should handle database errors during save', async () => {
      const preferences = DEFAULT_NOTIFICATION_PREFERENCES;

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
        })
      } as unknown as ReturnType<typeof supabase.from>);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await saveNotificationPreferences(mockUserId, preferences);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error saving notification preferences:', { message: 'Update failed' });

      consoleSpy.mockRestore();
    });

    it('should handle exceptions during save', async () => {
      const preferences = DEFAULT_NOTIFICATION_PREFERENCES;

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Connection error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await saveNotificationPreferences(mockUserId, preferences);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error saving notification preferences:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('DEFAULT_NOTIFICATION_PREFERENCES', () => {
    it('should have the expected default values', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
        emailNotifications: true,
        gameReminders: true,
        leagueUpdates: false,
        paymentReminders: true,
      });
    });
  });
});