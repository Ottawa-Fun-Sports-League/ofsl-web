import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyThreeTeamTierMovementNextWeek } from '../scheduleDatabase';

// In-memory mock rows for next week
type WeeklyRow = {
  id: number;
  league_id: number;
  week_number: number;
  tier_number: number;
  [k: string]: any;
};

let weekly: WeeklyRow[] = [];

function resetWeekly() {
  weekly = [
    { id: 101, league_id: 1, week_number: 4, tier_number: 1, team_a_name: null, team_a_ranking: null, team_b_name: null, team_b_ranking: null, team_c_name: null, team_c_ranking: null },
    { id: 102, league_id: 1, week_number: 4, tier_number: 2, team_a_name: null, team_a_ranking: null, team_b_name: null, team_b_ranking: null, team_c_name: null, team_c_ranking: null },
    { id: 103, league_id: 1, week_number: 4, tier_number: 3, team_a_name: null, team_a_ranking: null, team_b_name: null, team_b_ranking: null, team_c_name: null, team_c_ranking: null },
  ];
}

// Minimal supabase mock to support the helper
vi.mock('../../../lib/supabase', () => {
  const captured: Array<{ id: number; updates: Record<string, any> }> = [];
  (globalThis as any).__capturedUpdates = captured;
  function chain(rows: WeeklyRow[]) {
    return {
      select: () => chain(rows),
      eq: (column: string, value: any) => chain(rows.filter((r: any) => r[column] === value)),
      in: (column: string, values: any[]) => ({ data: rows.filter((r: any) => values.includes(r[column])), error: null }),
    } as any;
  }
  const client = {
    from: (table: string) => {
      if (table !== 'weekly_schedules') throw new Error('Only weekly_schedules supported in mock');
      return {
        select: () => chain(weekly.slice()),
        eq: (column: string, value: any) => chain(weekly.filter((r: any) => r[column] === value)),
        in: (column: string, values: any[]) => ({ data: weekly.filter((r: any) => values.includes(r[column])), error: null }),
        update: (updates: Record<string, any>) => ({
          eq: (col: string, val: any) => {
            captured.push({ id: val, updates });
            return { data: null, error: null };
          }
        }),
      } as any;
    },
    rpc: async () => ({ data: null, error: null }),
  };
  return { supabase: client };
});

describe('applyThreeTeamTierMovementNextWeek', () => {
  beforeEach(() => {
    resetWeekly();
  });

  it.skip('moves winner up to C, neutral stays at B, loser down to A', async () => {
    // Place duplicates that should be cleared
    weekly[1].team_a_name = 'Winners';
    weekly[1].team_b_name = 'Neutral';
    weekly[2].team_c_name = 'Losers';

    await applyThreeTeamTierMovementNextWeek({
      leagueId: 1,
      currentWeek: 3,
      tierNumber: 2,
      isTopTier: false,
      isBottomTier: false,
      teamNames: { A: 'Winners', B: 'Neutral', C: 'Losers' },
      sortedKeys: ['A', 'B', 'C'],
    });

    // Assert final assignment updates were issued for each target row/position
    // Import the mocked supabase to access captured updates
    const updates: Array<{ id: number; updates: Record<string, any> }> = (globalThis as any).__capturedUpdates || [];

    const byId = new Map<number, Record<string, any>>();
    updates.forEach(u => byId.set(u.id, { ...(byId.get(u.id) || {}), ...u.updates }));

    // Tier 1 should have team_c_name set to Winners
    expect(byId.get(101)?.team_c_name).toBe('Winners');
    // Tier 2 should have team_b_name set to Neutral
    expect(byId.get(102)?.team_b_name).toBe('Neutral');
    // Tier 3 should have team_a_name set to Losers
    expect(byId.get(103)?.team_a_name).toBe('Losers');
  });
});
