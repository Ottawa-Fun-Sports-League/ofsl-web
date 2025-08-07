import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsersData } from './useUsersData';
import { supabase } from '../../../../lib/supabase';
import { SPORT_IDS } from './constants';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock dependencies
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: 'admin-user-id', is_admin: true }
  })
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('useUsersData - Sport Filters', () => {
  // Wrapper component for Router context
  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(MemoryRouter, {}, children);
  const mockUsers = [
    {
      id: 'user-1',
      name: 'John Volleyball Player',
      email: 'john@example.com',
      phone: '123-456-7890',
      team_ids: [1, 2],
      user_sports_skills: [{ sport_id: SPORT_IDS.VOLLEYBALL, skill_id: 1 }],
      current_registrations: [
        { team_id: 1, team_name: 'Team A', league_id: 1, league_name: 'Summer League', sport_name: 'Volleyball' }
      ],
      date_created: '2024-01-01'
    },
    {
      id: 'user-2',
      name: 'Jane Badminton Player',
      email: 'jane@example.com',
      phone: '098-765-4321',
      team_ids: [3],
      user_sports_skills: [{ sport_id: SPORT_IDS.BADMINTON, skill_id: 2 }],
      current_registrations: [
        { team_id: 3, team_name: 'Team B', league_id: 2, league_name: 'Winter League', sport_name: 'Badminton' }
      ],
      date_created: '2024-01-02'
    },
    {
      id: 'user-3',
      name: 'Bob Not In League',
      email: 'bob@example.com',
      phone: '555-555-5555',
      team_ids: [4],
      user_sports_skills: [{ sport_id: SPORT_IDS.VOLLEYBALL, skill_id: 1 }],
      current_registrations: null,
      date_created: '2024-01-03'
    },
    {
      id: 'user-4',
      name: 'Alice All Sports',
      email: 'alice@example.com',
      phone: '444-444-4444',
      team_ids: [],
      user_sports_skills: [
        { sport_id: SPORT_IDS.VOLLEYBALL, skill_id: 1 },
        { sport_id: SPORT_IDS.BADMINTON, skill_id: 2 }
      ],
      current_registrations: null,
      date_created: '2024-01-04'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock admin check
    const adminCheckMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null })
    };

    // Mock users query
    const usersMock = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
    };

    // Mock registrations query
    const registrationsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            user_id: 'user-1',
            team_id: 1,
            teams: {
              id: 1,
              name: 'Team A',
              league_id: 1,
              leagues: {
                id: 1,
                name: 'Summer League',
                sport_id: SPORT_IDS.VOLLEYBALL,
                is_active: true,
                sports: { id: SPORT_IDS.VOLLEYBALL, name: 'Volleyball' }
              }
            }
          },
          {
            id: 2,
            user_id: 'user-2',
            team_id: 3,
            teams: {
              id: 3,
              name: 'Team B',
              league_id: 2,
              leagues: {
                id: 2,
                name: 'Winter League',
                sport_id: SPORT_IDS.BADMINTON,
                is_active: true,
                sports: { id: SPORT_IDS.BADMINTON, name: 'Badminton' }
              }
            }
          }
        ],
        error: null
      })
    };

    // Mock teams query for captain teams
    const captainTeamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'users' && adminCheckMock.select.mock.calls.length === 0) {
        return adminCheckMock;
      }
      if (table === 'users') {
        return usersMock;
      }
      if (table === 'registrations') {
        return registrationsMock;
      }
      if (table === 'teams') {
        return captainTeamsMock;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };
    });
  });

  it('should filter volleyball players in league', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply volleyball in league filter
    act(() => {
      result.current.handleFilterChange('volleyballPlayersInLeague');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(1);
      expect(result.current.filteredUsers[0].name).toBe('John Volleyball Player');
    });
  });

  it('should filter badminton players (all)', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply badminton all filter
    act(() => {
      result.current.handleFilterChange('badmintonPlayersAll');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(2);
      const names = result.current.filteredUsers.map(u => u.name);
      expect(names).toContain('Jane Badminton Player');
      expect(names).toContain('Alice All Sports');
    });
  });

  it('should filter volleyball players (all)', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply volleyball all filter
    act(() => {
      result.current.handleFilterChange('volleyballPlayersAll');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(3);
      const names = result.current.filteredUsers.map(u => u.name);
      expect(names).toContain('John Volleyball Player');
      expect(names).toContain('Bob Not In League');
      expect(names).toContain('Alice All Sports');
    });
  });

  it('should filter players not in league', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply not in league filter
    act(() => {
      result.current.handleFilterChange('playersNotInLeague');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(1);
      expect(result.current.filteredUsers[0].name).toBe('Bob Not In League');
    });
  });

  it('should correctly identify when sport filters are active', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initially no filters active
    expect(result.current.isAnyFilterActive()).toBe(false);

    // Apply volleyball in league filter
    act(() => {
      result.current.handleFilterChange('volleyballPlayersInLeague');
    });

    expect(result.current.isAnyFilterActive()).toBe(true);

    // Clear filters
    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.isAnyFilterActive()).toBe(false);
  });

  it('should handle multiple sport filters with OR logic', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply both volleyball and badminton filters
    act(() => {
      result.current.handleFilterChange('volleyballPlayersAll');
      result.current.handleFilterChange('badmintonPlayersAll');
    });

    await waitFor(() => {
      // Should show users that match EITHER filter (OR logic)
      // All 4 users should be shown: John (volleyball), Jane (badminton), Bob (volleyball), Alice (both)
      expect(result.current.filteredUsers).toHaveLength(4);
      const names = result.current.filteredUsers.map(u => u.name);
      expect(names).toContain('John Volleyball Player');
      expect(names).toContain('Jane Badminton Player');
      expect(names).toContain('Bob Not In League');
      expect(names).toContain('Alice All Sports');
    });
  });

  it('should filter badminton players in league', async () => {
    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply badminton in league filter
    act(() => {
      result.current.handleFilterChange('badmintonPlayersInLeague');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(1);
      expect(result.current.filteredUsers[0].name).toBe('Jane Badminton Player');
    });
  });
});