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

describe('ActivePlayerFilter', () => {
  const mockUserProfile = { id: 'admin-123', is_admin: true };
  const mockShowToast = vi.fn();
  const mockSearchParams = new URLSearchParams();
  const mockSetSearchParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      userProfile: mockUserProfile,
    } as ReturnType<typeof useAuth>);
    
    // Mock useToast
    vi.mocked(useToast).mockReturnValue({
      showToast: mockShowToast,
    } as ReturnType<typeof useToast>);
    
    // Mock useSearchParams
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, mockSetSearchParams]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should filter active players across all sports', async () => {
    // Mock Supabase responses
    const mockUsers = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        date_created: '2024-01-01',
        team_ids: [1, 2], // Historical teams
        user_sports_skills: []
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        date_created: '2024-01-02',
        team_ids: [3], // Historical teams
        user_sports_skills: []
      },
      {
        id: 'user-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        date_created: '2024-01-03',
        team_ids: null, // Never been on a team
        user_sports_skills: []
      },
      {
        id: 'user-4',
        name: 'Alice Brown',
        email: 'alice@example.com',
        date_created: '2024-01-04',
        team_ids: [4, 5], // Historical teams
        user_sports_skills: []
      }
    ];

    const mockTeams = [
      {
        id: 1,
        name: 'Volleyball Team A',
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
        name: 'Badminton Team B',
        captain_id: 'user-2',
        roster: ['user-2', 'user-4'],
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
      },
      {
        id: 3,
        name: 'Old Team',
        captain_id: 'user-5',
        roster: ['user-5'],
        co_captains: [],
        league_id: 3,
        leagues: {
          id: 3,
          name: 'Old League',
          sport_id: 1,
          active: false, // Inactive league
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
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockTeams,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as ReturnType<typeof supabase.from>;
    });

    // Render the hook
    const { result } = renderHook(() => useUsersData());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(4);

    // Apply active player filter
    act(() => {
      result.current.handleFilterChange('activePlayer');
    });

    // Wait for filter to apply
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should only show users who are currently in active teams (user-1, user-2, user-4)
    expect(result.current.filteredUsers).toHaveLength(3);
    const filteredIds = result.current.filteredUsers.map(u => u.id);
    expect(filteredIds).toContain('user-1'); // In volleyball team
    expect(filteredIds).toContain('user-2'); // Captain of badminton team
    expect(filteredIds).toContain('user-4'); // In badminton team roster
    expect(filteredIds).not.toContain('user-3'); // Never been on a team
  });

  it('should correctly filter players not in league', async () => {
    // Mock Supabase responses
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Active Player',
        email: 'active@example.com',
        date_created: '2024-01-01',
        team_ids: [1, 2], // Has been on teams
        user_sports_skills: []
      },
      {
        id: 'user-2',
        name: 'Inactive Player',
        email: 'inactive@example.com',
        date_created: '2024-01-02',
        team_ids: [3, 4], // Has been on teams but not currently
        user_sports_skills: []
      },
      {
        id: 'user-3',
        name: 'Never Played',
        email: 'never@example.com',
        date_created: '2024-01-03',
        team_ids: null, // Never been on a team
        user_sports_skills: []
      }
    ];

    const mockTeams = [
      {
        id: 1,
        name: 'Active Team',
        captain_id: 'user-1',
        roster: ['user-1'],
        co_captains: [],
        league_id: 1,
        leagues: {
          id: 1,
          name: 'Current League',
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
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockTeams,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as ReturnType<typeof supabase.from>;
    });

    // Render the hook
    const { result } = renderHook(() => useUsersData());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toHaveLength(3);

    // Apply not in league filter
    act(() => {
      result.current.handleFilterChange('playersNotInLeague');
    });

    // Wait for filter to apply
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should only show users who have been on teams but are not currently in any active league
    expect(result.current.filteredUsers).toHaveLength(1);
    expect(result.current.filteredUsers[0].id).toBe('user-2');
  });
});