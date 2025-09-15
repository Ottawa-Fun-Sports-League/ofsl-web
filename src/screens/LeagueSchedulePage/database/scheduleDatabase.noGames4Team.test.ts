import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../../lib/supabase';
import { moveWeekPlacements } from './scheduleDatabase';

// Mock Supabase client
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('moveWeekPlacements with 4-team format', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly bump all 4 teams (A/B/C/D) when marking week as no games', async () => {
    const mockFromRows = [
      {
        id: 1,
        tier_number: 2,
        location: 'Court 1',
        time_slot: '7:00 PM',
        court: '1',
        format: '4-teams-head-to-head',
        team_a_name: 'Team Alpha',
        team_a_ranking: 1,
        team_b_name: 'Team Beta',
        team_b_ranking: 2,
        team_c_name: 'Team Charlie',
        team_c_ranking: 3,
        team_d_name: 'Crushing Serves', // This is the team that was missing
        team_d_ranking: 4,
      },
      {
        id: 2,
        tier_number: 3,
        location: 'Court 2',
        time_slot: '7:00 PM',
        court: '2',
        format: '4-teams-head-to-head',
        team_a_name: 'Team Echo',
        team_a_ranking: 5,
        team_b_name: 'Team Foxtrot',
        team_b_ranking: 6,
        team_c_name: 'Team Golf',
        team_c_ranking: 7,
        team_d_name: null,
        team_d_ranking: null,
      },
    ];

    const mockTargetRows = [
      {
        id: 101,
        tier_number: 2,
        location: 'Court 1',
        time_slot: '7:00 PM',
        court: '1',
        format: '3-teams-6-sets', // Default format
      },
      {
        id: 102,
        tier_number: 3,
        location: 'Court 2',
        time_slot: '7:00 PM',
        court: '2',
        format: '3-teams-6-sets',
      },
    ];

    // Mock RPC call that fails (to trigger fallback)
    const mockRpc = vi.fn().mockRejectedValue({ code: '42883' });
    (supabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

    // Mock from week data fetch
    const mockFromSelect = vi.fn().mockResolvedValue({
      data: mockFromRows,
      error: null,
    });

    // Mock target week data fetch
    const mockTargetSelect = vi.fn().mockResolvedValue({
      data: mockTargetRows,
      error: null,
    });

    // Mock clearing teams from all rows
    const mockAllRowsSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    // Mock updates with chained eq calls
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    // Set up the from() mock chain
    const fromMock = vi.fn().mockImplementation((table) => {
      if (table === 'weekly_schedules') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((field, value) => {
                if (field === 'week_number' && value === 2) {
                  // Source week
                  return mockFromSelect();
                } else if (field === 'week_number' && value === 3) {
                  // Target week - different queries
                  return {
                    in: vi.fn().mockResolvedValue({
                      data: mockTargetRows,
                      error: null,
                    }),
                  };
                }
                return mockAllRowsSelect();
              }),
            })),
          })),
          update: mockUpdate,
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
    });

    (supabase.from as ReturnType<typeof vi.fn>) = fromMock;

    // Execute the function
    await moveWeekPlacements({
      leagueId: 1,
      fromWeek: 2,
      toWeek: 3,
    });

    // Verify RPC was attempted
    expect(mockRpc).toHaveBeenCalledWith('apply_week_bump', {
      p_league_id: 1,
      p_from_week: 2,
      p_to_week: 3,
    });

    // Verify updates were called for each tier
    const updateCalls = mockUpdate.mock.calls;

    // Should have updates for copying teams to target week
    expect(updateCalls.length).toBeGreaterThan(0);

    // Check that team D was included in the updates
    const tier2Updates = updateCalls.find((call) => {
      const updates = call[0];
      return updates.team_d_name === 'Crushing Serves';
    });

    expect(tier2Updates).toBeDefined();
    expect(tier2Updates[0]).toMatchObject({
      team_a_name: 'Team Alpha',
      team_b_name: 'Team Beta',
      team_c_name: 'Team Charlie',
      team_d_name: 'Crushing Serves',
      team_a_ranking: 1,
      team_b_ranking: 2,
      team_c_ranking: 3,
      team_d_ranking: 4,
      format: '4-teams-head-to-head', // Format should be preserved
    });
  });

  it('should handle mixed formats (3-team and 4-team) correctly', async () => {
    const mockFromRows = [
      {
        id: 1,
        tier_number: 1,
        format: '3-teams-6-sets',
        team_a_name: 'Team A1',
        team_a_ranking: 1,
        team_b_name: 'Team B1',
        team_b_ranking: 2,
        team_c_name: 'Team C1',
        team_c_ranking: 3,
        team_d_name: null,
        team_d_ranking: null,
      },
      {
        id: 2,
        tier_number: 2,
        format: '4-teams-head-to-head',
        team_a_name: 'Team A2',
        team_a_ranking: 4,
        team_b_name: 'Team B2',
        team_b_ranking: 5,
        team_c_name: 'Team C2',
        team_c_ranking: 6,
        team_d_name: 'Team D2',
        team_d_ranking: 7,
      },
    ];

    // Mock RPC call that fails (to trigger fallback)
    const mockRpc = vi.fn().mockRejectedValue({ code: 'PGRST202' });
    (supabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

    // Mock from week data
    const mockFromSelect = vi.fn().mockResolvedValue({
      data: mockFromRows,
      error: null,
    });

    // Mock empty target week (will create new rows)
    const mockTargetSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    // Mock insert for creating target rows
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockFromRows.map(row => ({ ...row, week_number: 3 })),
        error: null,
      }),
    });

    // Mock updates with chained eq calls
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    // Mock clearing
    const mockAllRowsSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    // Set up the from() mock chain
    const fromMock = vi.fn().mockImplementation((table) => {
      if (table === 'weekly_schedules') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((field, value) => {
                if (field === 'week_number' && value === 2) {
                  return mockFromSelect();
                } else if (field === 'week_number' && value === 3) {
                  return {
                    in: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  };
                }
                return mockAllRowsSelect();
              }),
            })),
          })),
          update: mockUpdate,
          insert: mockInsert,
        };
      }
    });

    (supabase.from as ReturnType<typeof vi.fn>) = fromMock;

    // Execute the function
    await moveWeekPlacements({
      leagueId: 1,
      fromWeek: 2,
      toWeek: 3,
    });

    // Verify inserts were called to create target rows
    expect(mockInsert).toHaveBeenCalled();
    const insertData = mockInsert.mock.calls[0][0];
    expect(insertData).toHaveLength(2);

    // Check that tier 2 insert includes 4-team format
    const tier2Insert = insertData.find((row: { tier_number: number }) => row.tier_number === 2);
    expect(tier2Insert).toMatchObject({
      league_id: 1,
      week_number: 3,
      tier_number: 2,
      format: '4-teams-head-to-head',
    });

    // Verify updates preserve the format and include team D
    const updateCalls = mockUpdate.mock.calls;
    const tier2Update = updateCalls.find((call) => {
      const updates = call[0];
      return updates.team_d_name === 'Team D2';
    });

    expect(tier2Update).toBeDefined();
    expect(tier2Update[0].format).toBe('4-teams-head-to-head');
  });
});