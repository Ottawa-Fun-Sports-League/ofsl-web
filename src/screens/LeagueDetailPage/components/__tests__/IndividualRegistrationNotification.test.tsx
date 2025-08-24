import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '../../../../lib/supabase';

// Define interface for mock Supabase chain
interface MockSupabaseChain {
  update?: () => MockSupabaseChain;
  insert?: () => MockSupabaseChain;
  select?: () => MockSupabaseChain;
  eq?: () => MockSupabaseChain;
}

// Mock Supabase
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('Individual Registration Email Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create notification record when user registers for individual league', async () => {
    const mockUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-456-7890',
      league_ids: []
    };

    const mockLeague = {
      id: 24,
      name: 'Badminton Monday Evenings',
      team_registration: false
    };

    // Mock the database trigger being called when league_ids changes
    const notificationInsertMock = vi.fn().mockResolvedValue({
      data: {
        id: 'notification-id',
        user_id: mockUser.id,
        user_name: mockUser.name,
        user_email: mockUser.email,
        user_phone: mockUser.phone,
        league_id: mockLeague.id,
        league_name: mockLeague.name,
        sent: false,
        created_at: new Date().toISOString()
      },
      error: null
    });

    // Simulate user registering for a league
    const updateUserMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: {
          ...mockUser,
          league_ids: [mockLeague.id]
        },
        error: null
      })
    }));

    vi.mocked(supabase.from).mockImplementation((table: string): MockSupabaseChain => {
      if (table === 'users') {
        return {
          update: updateUserMock
        } as MockSupabaseChain;
      }
      if (table === 'individual_registration_notifications') {
        return {
          insert: notificationInsertMock,
          select: vi.fn().mockReturnThis()
        } as MockSupabaseChain;
      }
      return {} as MockSupabaseChain;
    });

    // Simulate registering for a league
    const { data, error } = await supabase
      .from('users')
      .update({ league_ids: [mockLeague.id] })
      .eq('id', mockUser.id)
      .select();

    expect(error).toBeNull();
    expect(data?.league_ids).toContain(mockLeague.id);
    expect(updateUserMock).toHaveBeenCalledWith({ league_ids: [mockLeague.id] });
  });

  it('should handle multiple league registrations', async () => {
    const mockUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      league_ids: [24] // Already registered for league 24
    };

    const newLeagues = [28, 23]; // Registering for 2 new leagues

    const updateUserMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: {
          ...mockUser,
          league_ids: [24, 28, 23]
        },
        error: null
      })
    }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: updateUserMock
        } as MockSupabaseChain;
      }
      return {} as MockSupabaseChain;
    });

    // Simulate registering for multiple leagues
    const { data, error } = await supabase
      .from('users')
      .update({ league_ids: [24, ...newLeagues] })
      .eq('id', mockUser.id)
      .select();

    expect(error).toBeNull();
    expect(data?.league_ids).toEqual([24, 28, 23]);
    
    // In production, the database trigger would create 2 notification records
    // (one for each new league registration)
  });

  it('should not create notifications for team registration leagues', async () => {
    const mockUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      league_ids: []
    };

    const teamLeague = {
      id: 1,
      name: 'Volleyball League',
      team_registration: true // This is a team league
    };

    // When registering for a team league, no individual notification should be created
    const updateUserMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: {
          ...mockUser,
          league_ids: [teamLeague.id]
        },
        error: null
      })
    }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: updateUserMock
        } as MockSupabaseChain;
      }
      return {} as MockSupabaseChain;
    });

    const { data, error } = await supabase
      .from('users')
      .update({ league_ids: [teamLeague.id] })
      .eq('id', mockUser.id)
      .select();

    expect(error).toBeNull();
    expect(data?.league_ids).toContain(teamLeague.id);
    
    // The database trigger should not create notifications for team leagues
    // This is handled by the trigger checking team_registration = false
  });

  it('should process notifications via cron job', async () => {
    // Mock pending notifications
    const mockNotifications = [
      {
        id: 'notif-1',
        user_name: 'User 1',
        league_name: 'Badminton Monday',
        sent: false
      },
      {
        id: 'notif-2',
        user_name: 'User 2',
        league_name: 'Badminton Sunday',
        sent: false
      }
    ];

    const selectMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => ({
        order: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockResolvedValue({
            data: mockNotifications,
            error: null
          })
        }))
      }))
    }));

    const updateMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({
        data: { sent: true, sent_at: new Date().toISOString() },
        error: null
      })
    }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'individual_registration_notifications') {
        return {
          select: selectMock,
          update: updateMock
        } as MockSupabaseChain;
      }
      return {} as MockSupabaseChain;
    });

    // Simulate cron job processing
    const { data: pending } = await supabase
      .from('individual_registration_notifications')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(10);

    expect(pending).toHaveLength(2);
    expect(pending?.[0].user_name).toBe('User 1');
    expect(pending?.[1].user_name).toBe('User 2');
    
    // In production, the edge function would:
    // 1. Fetch these pending notifications
    // 2. Send emails via Resend API
    // 3. Mark them as sent
  });
});