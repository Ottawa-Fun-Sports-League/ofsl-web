import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUsersData } from './useUsersData';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';
import { useSearchParams } from 'react-router-dom';

// Mock dependencies
vi.mock('../../../../lib/supabase');
vi.mock('../../../../contexts/AuthContext');
vi.mock('../../../../components/ui/toast');
vi.mock('react-router-dom');

describe('SportFilters', () => {
  const mockUserProfile = { id: 'admin-123', is_admin: true };
  const mockShowToast = vi.fn();
  const mockSearchParams = new URLSearchParams();
  const mockSetSearchParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      userProfile: mockUserProfile,
    } as any);
    
    // Mock useToast
    vi.mocked(useToast).mockReturnValue({
      showToast: mockShowToast,
    } as any);
    
    // Mock useSearchParams
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, mockSetSearchParams]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should filter users by active volleyball players', async () => {
    // Mock Supabase responses
    const mockUsers = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        date_created: '2024-01-01',
        user_sports_skills: [{ sport_id: 1, skill_level: 3 }]
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        date_created: '2024-01-02',
        user_sports_skills: []
      },
      {
        id: 'user-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        date_created: '2024-01-03',
        user_sports_skills: [{ sport_id: 2, skill_level: 2 }]
      }
    ];

    const mockTeams = [
      {
        id: 1,
        name: 'Team A',
        captain_id: 'user-1',
        roster: ['user-1', 'user-2'],
        co_captains: [],
        league_id: 1,
        leagues: {
          id: 1,
          name: 'Volleyball League',
          sport_id: 1,
          active: true,
          sports: {
            id: 1,
            name: 'Volleyball'
          }
        }
      },
      {
        id: 2,
        name: 'Team B',
        captain_id: 'user-3',
        roster: ['user-3'],
        co_captains: [],
        league_id: 2,
        leagues: {
          id: 2,
          name: 'Badminton League',
          sport_id: 2,
          active: true,
          sports: {
            id: 2,
            name: 'Badminton'
          }
        }
      }
    ];

    // Mock admin check
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { is_admin: true },
            error: null
          }),
          order: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        } as any;
      }
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockTeams,
            error: null
          })
        } as any;
      }
      return {} as any;
    });

    // Render the hook
    const { result } = renderHook(() => useUsersData());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(3);

    // Apply volleyball active filter
    act(() => {
      result.current.handleFilterChange('volleyballPlayersInLeague');
    });

    // Wait for filter to apply
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should only show users who are in volleyball teams (user-1 and user-2)
    expect(result.current.filteredUsers).toHaveLength(2);
    const filteredIds = result.current.filteredUsers.map(u => u.id);
    expect(filteredIds).toContain('user-1');
    expect(filteredIds).toContain('user-2');
  });

  it('should filter users by all volleyball players (including skills)', async () => {
    // Mock Supabase responses
    const mockUsers = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        date_created: '2024-01-01',
        user_sports_skills: [{ sport_id: 1, skill_level: 3 }]
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        date_created: '2024-01-02',
        user_sports_skills: [{ sport_id: 1, skill_level: 2 }]
      },
      {
        id: 'user-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        date_created: '2024-01-03',
        user_sports_skills: [{ sport_id: 2, skill_level: 2 }]
      }
    ];

    const mockTeams = [
      {
        id: 1,
        name: 'Team A',
        captain_id: 'user-1',
        roster: ['user-1'],
        co_captains: [],
        league_id: 1,
        leagues: {
          id: 1,
          name: 'Volleyball League',
          sport_id: 1,
          active: true,
          sports: {
            id: 1,
            name: 'Volleyball'
          }
        }
      }
    ];

    // Mock admin check
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { is_admin: true },
            error: null
          }),
          order: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        } as any;
      }
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockTeams,
            error: null
          })
        } as any;
      }
      return {} as any;
    });

    // Render the hook
    const { result } = renderHook(() => useUsersData());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(3);

    // Apply volleyball all filter
    act(() => {
      result.current.handleFilterChange('volleyballPlayersAll');
    });

    // Wait for filter to apply
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should show users who have volleyball skills OR are in volleyball teams (user-1 and user-2)
    expect(result.current.filteredUsers).toHaveLength(2);
    const filteredIds = result.current.filteredUsers.map(u => u.id);
    expect(filteredIds).toContain('user-1');
    expect(filteredIds).toContain('user-2');
  });

  it('should filter users by active badminton players', async () => {
    // Mock Supabase responses
    const mockUsers = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        date_created: '2024-01-01',
        user_sports_skills: []
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        date_created: '2024-01-02',
        user_sports_skills: []
      },
      {
        id: 'user-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        date_created: '2024-01-03',
        user_sports_skills: []
      }
    ];

    const mockTeams = [
      {
        id: 1,
        name: 'Team A',
        captain_id: 'user-1',
        roster: ['user-1'],
        co_captains: [],
        league_id: 1,
        leagues: {
          id: 1,
          name: 'Volleyball League',
          sport_id: 1,
          active: true,
          sports: {
            id: 1,
            name: 'Volleyball'
          }
        }
      },
      {
        id: 2,
        name: 'Team B',
        captain_id: 'user-2',
        roster: ['user-2', 'user-3'],
        co_captains: [],
        league_id: 2,
        leagues: {
          id: 2,
          name: 'Badminton League',
          sport_id: 2,
          active: true,
          sports: {
            id: 2,
            name: 'Badminton'
          }
        }
      }
    ];

    // Mock admin check
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { is_admin: true },
            error: null
          }),
          order: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        } as any;
      }
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockTeams,
            error: null
          })
        } as any;
      }
      return {} as any;
    });

    // Render the hook
    const { result } = renderHook(() => useUsersData());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(3);

    // Apply badminton active filter
    act(() => {
      result.current.handleFilterChange('badmintonPlayersInLeague');
    });

    // Wait for filter to apply
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should only show users who are in badminton teams (user-2 and user-3)
    expect(result.current.filteredUsers).toHaveLength(2);
    const filteredIds = result.current.filteredUsers.map(u => u.id);
    expect(filteredIds).toContain('user-2');
    expect(filteredIds).toContain('user-3');
  });
});