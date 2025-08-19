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
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('useUsersData - Sport Filters', () => {
  // Wrapper component for Router context
  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(MemoryRouter, {}, children);
  // Mock RPC response data that mimics the get_all_users_admin function
  const mockRpcUsers = [
    {
      id: 'user-1',  // This is the profile ID from users table
      auth_id: 'auth-1',
      name: 'John Volleyball Player',
      email: 'john@example.com',
      phone: '123-456-7890',
      is_admin: false,
      is_facilitator: false,
      date_created: '2024-01-01',
      status: 'active',
      confirmed_at: '2024-01-01T10:00:00Z',
      last_sign_in_at: '2024-01-01T10:00:00Z',
      team_ids: ['1', '2'],
      user_sports_skills: [{ sport_id: SPORT_IDS.VOLLEYBALL, skill_id: 1 }]
    },
    {
      id: 'user-2',  // This is the profile ID from users table
      auth_id: 'auth-2',
      name: 'Jane Badminton Player',
      email: 'jane@example.com',
      phone: '098-765-4321',
      is_admin: false,
      is_facilitator: false,
      date_created: '2024-01-02',
      status: 'active',
      confirmed_at: '2024-01-02T10:00:00Z',
      last_sign_in_at: '2024-01-02T10:00:00Z',
      team_ids: ['3'],
      user_sports_skills: [{ sport_id: SPORT_IDS.BADMINTON, skill_id: 2 }]
    },
    {
      id: 'user-3',  // This is the profile ID from users table
      auth_id: 'auth-3',
      name: 'Bob Not In League',
      email: 'bob@example.com',
      phone: '555-555-5555',
      is_admin: false,
      is_facilitator: false,
      date_created: '2024-01-03',
      status: 'active',
      confirmed_at: '2024-01-03T10:00:00Z',
      last_sign_in_at: '2024-01-03T10:00:00Z',
      team_ids: ['4'],
      user_sports_skills: [{ sport_id: SPORT_IDS.VOLLEYBALL, skill_id: 1 }]
    },
    {
      id: 'user-4',  // This is the profile ID from users table
      auth_id: 'auth-4',
      name: 'Alice All Sports',
      email: 'alice@example.com',
      phone: '444-444-4444',
      is_admin: false,
      is_facilitator: false,
      date_created: '2024-01-04',
      status: 'active',
      confirmed_at: '2024-01-04T10:00:00Z',
      last_sign_in_at: '2024-01-04T10:00:00Z',
      team_ids: [],
      user_sports_skills: [
        { sport_id: SPORT_IDS.VOLLEYBALL, skill_id: 1 },
        { sport_id: SPORT_IDS.BADMINTON, skill_id: 2 }
      ]
    },
    // User with missing profile_id (no entry in users table)
    {
      id: null,  // No profile in users table
      auth_id: 'auth-5',
      name: null,
      email: 'noProfile@example.com',
      phone: '',
      is_admin: false,
      is_facilitator: false,
      date_created: '2024-01-05',
      auth_created_at: '2024-01-05',
      status: 'unconfirmed',
      confirmed_at: null,
      last_sign_in_at: null,
      team_ids: [],
      user_sports_skills: []
    },
    // User with missing auth_id
    {
      id: 'user-6',  // Has profile in users table
      auth_id: null,  // But no auth UUID
      name: 'Missing Auth User',
      email: 'noauth@example.com',
      phone: '666-666-6666',
      is_admin: false,
      is_facilitator: false,
      date_created: '2024-01-06',
      status: 'active',
      confirmed_at: null,
      last_sign_in_at: null,
      team_ids: [],
      user_sports_skills: []
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

    // Mock teams query - this is still used for registration data
    const teamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'Team A',
            captain_id: 'user-1',
            roster: ['user-1'],
            co_captains: [],
            league_id: 1,
            leagues: {
              id: 1,
              name: 'Summer League',
              sport_id: SPORT_IDS.VOLLEYBALL,
              active: true,
              sports: { id: SPORT_IDS.VOLLEYBALL, name: 'Volleyball' }
            }
          },
          {
            id: 3,
            name: 'Team B',
            captain_id: 'user-2',
            roster: ['user-2'],
            co_captains: [],
            league_id: 2,
            leagues: {
              id: 2,
              name: 'Winter League',
              sport_id: SPORT_IDS.BADMINTON,
              active: true,
              sports: { id: SPORT_IDS.BADMINTON, name: 'Badminton' }
            }
          },
          {
            id: 4,
            name: 'Team C',
            captain_id: 'user-3',
            roster: ['user-3'], // Bob is in this team but league is inactive
            co_captains: [],
            league_id: 3,
            leagues: {
              id: 3,
              name: 'Inactive League',
              sport_id: SPORT_IDS.VOLLEYBALL,
              active: false,
              sports: { id: SPORT_IDS.VOLLEYBALL, name: 'Volleyball' }
            }
          }
        ],
        error: null
      })
    };

    // Mock RPC function for getting all users
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockRpcUsers,
      error: null
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') {
        return adminCheckMock;
      }
      if (table === 'teams') {
        return teamsMock;
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

  it('should correctly identify when filters are active', async () => {
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

    // Test pendingUsers filter as well
    act(() => {
      result.current.handleFilterChange('pendingUsers');
    });

    expect(result.current.isAnyFilterActive()).toBe(true);
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

  it('should filter pending users', async () => {
    // Add a user with pending status to the mock data
    const mockUsersWithPending = [
      ...mockRpcUsers,
      {
        id: 'user-5',
        auth_id: 'auth-5',
        name: null,
        email: 'pending@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-05',
        status: 'pending',
        confirmed_at: null,
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      },
      {
        id: 'user-6',
        auth_id: 'auth-6', 
        name: null,
        email: 'unconfirmed@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-06',
        status: 'unconfirmed',
        confirmed_at: null,
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      },
      {
        id: null,  // No profile in users table
        auth_id: 'auth-7',
        name: null,
        email: 'confirmed-no-profile@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-07',
        status: 'confirmed_no_profile',
        confirmed_at: '2024-01-07T10:00:00Z',
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      },
      {
        id: 'user-8',
        auth_id: 'auth-8',
        name: null,
        email: 'profile-incomplete@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-08',
        status: 'profile_incomplete',
        confirmed_at: '2024-01-08T10:00:00Z',
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      }
    ];

    // Mock RPC function with pending users
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockUsersWithPending,
      error: null
    });

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply pending users filter
    act(() => {
      result.current.handleFilterChange('pendingUsers');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(4);
      const emails = result.current.filteredUsers.map(u => u.email);
      expect(emails).toContain('pending@example.com');
      expect(emails).toContain('unconfirmed@example.com');
      expect(emails).toContain('confirmed-no-profile@example.com');
      expect(emails).toContain('profile-incomplete@example.com');
    });
  });
  
});

describe('useUsersData - Auth-only Users and Edge Cases', () => {
  // Wrapper component for Router context
  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(MemoryRouter, {}, children);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle users without profiles (auth-only users)', async () => {
    // Mock data with auth-only users (no profiles)
    const authOnlyUsers = [
      {
        id: null,  // No profile in users table
        auth_id: 'auth-only-1',
        name: null,
        email: 'auth.user1@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-05',
        auth_created_at: '2024-01-05T10:00:00Z',
        status: 'confirmed_no_profile',
        confirmed_at: '2024-01-05T10:00:00Z',
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      },
      {
        id: 'user-1',
        auth_id: 'auth-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        status: 'active',
        confirmed_at: '2024-01-01T10:00:00Z',
        last_sign_in_at: '2024-01-01T10:00:00Z',
        team_ids: [],
        user_sports_skills: []
      }
    ];

    // Mock admin check
    const adminCheckMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null })
    };

    // Mock teams query - empty for this test
    const teamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    // Mock RPC function
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: authOnlyUsers,
      error: null
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return adminCheckMock;
      if (table === 'teams') return teamsMock;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have both users
    expect(result.current.users).toHaveLength(2);
    
    // Auth-only user should be processed correctly
    const authUser = result.current.users.find(u => u.id === 'auth-only-1');
    expect(authUser).toBeDefined();
    expect(authUser?.name).toBeNull();
    expect(authUser?.email).toBe('auth.user1@example.com');
    expect(authUser?.status).toBe('pending'); // confirmed_no_profile mapped to pending
    expect(authUser?.team_ids).toBeNull();

    // Regular user should be processed correctly
    const regularUser = result.current.users.find(u => u.id === 'user-1');
    expect(regularUser).toBeDefined();
    expect(regularUser?.name).toBe('John Doe');
    expect(regularUser?.status).toBe('active');
  });

  it('should handle users with null IDs gracefully', async () => {
    const usersWithNullIds = [
      {
        id: null,  // No profile in users table
        auth_id: null, // This should be filtered out
        name: null,
        email: 'invalid@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        status: 'active',
        confirmed_at: null,
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      },
      {
        id: 'valid-user',
        auth_id: 'auth-valid',
        name: 'Valid User',
        email: 'valid@example.com',
        phone: '123-456-7890',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        status: 'active',
        confirmed_at: '2024-01-01T10:00:00Z',
        last_sign_in_at: '2024-01-01T10:00:00Z',
        team_ids: [],
        user_sports_skills: []
      }
    ];

    // Mock admin check
    const adminCheckMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null })
    };

    // Mock teams query - empty for this test
    const teamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    // Mock RPC function
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: usersWithNullIds,
      error: null
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return adminCheckMock;
      if (table === 'teams') return teamsMock;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should only have the valid user (null ID user filtered out)
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].id).toBe('valid-user');
    expect(result.current.users[0].name).toBe('Valid User');
  });

  it('should fallback to regular users table when RPC fails', async () => {
    const fallbackUsers = [
      {
        id: 'fallback-user-1',
        auth_id: 'fallback-user-1', // Set auth_id same as id for cleaner test
        name: 'Fallback User',
        email: 'fallback@example.com',
        phone: '123-456-7890',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        date_modified: '2024-01-01'
      }
    ];

    // Mock admin check
    const adminCheckMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null })
    };

    // Mock fallback users query
    const fallbackUsersMock = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: fallbackUsers, error: null })
    };

    // Mock teams query - empty for this test
    const teamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    // Mock RPC function to return error
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: new Error('RPC failed')
    });

    let fromCallCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      fromCallCount++;
      if (table === 'users' && fromCallCount === 1) return adminCheckMock;
      if (table === 'users' && fromCallCount === 2) return fallbackUsersMock; // Fallback query
      if (table === 'teams') return teamsMock;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have fallback user
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].id).toBe('fallback-user-1');
    expect(result.current.users[0].name).toBe('Fallback User');
    expect(result.current.users[0].status).toBe('active'); // Default status in fallback
  });

  it('should handle RPC returning empty data gracefully', async () => {
    const fallbackUsers = [
      {
        id: 'fallback-user-2',
        auth_id: 'fallback-user-2', // Set auth_id same as id for cleaner test
        name: 'Another Fallback User',
        email: 'another@example.com',
        phone: '123-456-7890',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-02',
        date_modified: '2024-01-02'
      }
    ];

    // Mock admin check
    const adminCheckMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null })
    };

    // Mock fallback users query
    const fallbackUsersMock = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: fallbackUsers, error: null })
    };

    // Mock teams query - empty for this test
    const teamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    // Mock RPC function to return empty data
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [], // Empty array
      error: null
    });

    let fromCallCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      fromCallCount++;
      if (table === 'users' && fromCallCount === 1) return adminCheckMock;
      if (table === 'users' && fromCallCount === 2) return fallbackUsersMock; // Fallback query
      if (table === 'teams') return teamsMock;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have fallback user
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].id).toBe('fallback-user-2');
    expect(result.current.users[0].name).toBe('Another Fallback User');
    expect(result.current.users[0].status).toBe('active');
  });

  it('should handle search filtering on auth-only users', async () => {
    const mixedUsers = [
      {
        id: null,  // No profile in users table
        auth_id: 'auth-only-search',
        name: null,
        email: 'searchme@example.com',
        phone: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        status: 'confirmed_no_profile',
        confirmed_at: '2024-01-01T10:00:00Z',
        last_sign_in_at: null,
        team_ids: null,
        user_sports_skills: null
      },
      {
        id: 'user-2',
        auth_id: 'auth-2',
        name: 'John Regular',
        email: 'john.regular@example.com',
        phone: '123-456-7890',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-02',
        status: 'active',
        confirmed_at: '2024-01-02T10:00:00Z',
        last_sign_in_at: '2024-01-02T10:00:00Z',
        team_ids: [],
        user_sports_skills: []
      }
    ];

    // Mock admin check
    const adminCheckMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null })
    };

    // Mock teams query - empty for this test
    const teamsMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    // Mock RPC function
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mixedUsers,
      error: null
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'users') return adminCheckMock;
      if (table === 'teams') return teamsMock;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have both users initially
    expect(result.current.filteredUsers).toHaveLength(2);

    // Search by email should work for auth-only user
    act(() => {
      result.current.setSearchTerm('searchme');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(1);
      expect(result.current.filteredUsers[0].email).toBe('searchme@example.com');
    });

    // Search by name should work for regular user
    act(() => {
      result.current.setSearchTerm('John');
    });

    await waitFor(() => {
      expect(result.current.filteredUsers).toHaveLength(1);
      expect(result.current.filteredUsers[0].name).toBe('John Regular');
    });
  });
});