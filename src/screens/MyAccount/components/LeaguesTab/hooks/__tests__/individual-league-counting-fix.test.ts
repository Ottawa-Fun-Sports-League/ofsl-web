import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeaguesData } from '../useLeaguesData';
import { supabase } from '../../../../../../lib/supabase';

// Mock AuthContext
vi.mock('../../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { is_admin: true }
  })
}));

// Mock supabase
vi.mock('../../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock leagues functions
vi.mock('../../../../../../lib/leagues', () => ({
  fetchSports: vi.fn(() => Promise.resolve([])),
  fetchSkills: vi.fn(() => Promise.resolve([])),
  sortLeaguesByDay: vi.fn(leagues => leagues)
}));

describe('Individual League Registration Counting Fix', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the chain of supabase calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSupabaseFrom.mockImplementation((table: string): any => {
      if (table === 'gyms') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        };
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 33,
                  name: 'Individual Badminton League',
                  team_registration: false, // Individual league
                  max_teams: 28,
                  sports: { name: 'Badminton' },
                  skills: { name: 'Intermediate' },
                  skill_ids: [1],
                  gym_ids: []
                },
                {
                  id: 35,
                  name: 'Team Volleyball League',
                  team_registration: true, // Team league
                  max_teams: 12,
                  sports: { name: 'Volleyball' },
                  skills: { name: 'Advanced' },
                  skill_ids: [2],
                  gym_ids: []
                }
              ],
              error: null
            })
          })
        };
      }
      
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { league_id: 35, id: 'team-1' }, // 1 team for league 35
              ],
              error: null
            })
          })
        };
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                { league_id: 33 }, // Individual registration for league 33
                { league_id: 33 }, // Another individual registration for league 33
              ],
              error: null
            })
          })
        };
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      };
    });
  });

  it('should count individual registrations from payment records instead of user league_ids', async () => {
    const { result } = renderHook(() => useLeaguesData());

    // Call loadData to trigger the data loading
    await result.current.loadData();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const leagues = result.current.leagues;
    
    // Find the individual league (id: 33)
    const individualLeague = leagues.find(l => l.id === 33);
    expect(individualLeague).toBeDefined();
    expect(individualLeague?.team_count).toBe(2); // Should count 2 individual registrations
    expect(individualLeague?.spots_remaining).toBe(26); // 28 - 2 = 26
    
    // Find the team league (id: 35)
    const teamLeague = leagues.find(l => l.id === 35);
    expect(teamLeague).toBeDefined();
    expect(teamLeague?.team_count).toBe(1); // Should count 1 team registration
    expect(teamLeague?.spots_remaining).toBe(11); // 12 - 1 = 11
  });

  it('should verify the payment query uses correct parameters', async () => {
    const { result } = renderHook(() => useLeaguesData());

    await result.current.loadData();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify that league_payments was queried with team_id = null
    expect(mockSupabaseFrom).toHaveBeenCalledWith('league_payments');
    
    const paymentsCall = mockSupabaseFrom.mock.calls.find(call => call[0] === 'league_payments');
    expect(paymentsCall).toBeDefined();
  });
});