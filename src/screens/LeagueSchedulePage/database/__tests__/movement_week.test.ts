import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture RPC calls
const rpcCalls: Array<{ fn: string; args: any }> = [];

// Mutable flags for test scenarios
let movementWeek = false;

// Mock supabase client used inside scheduleDatabase
vi.mock('../../../../lib/supabase', () => {
  const from = (table: string) => {
    const api: any = {
      _table: table,
      _select: '',
      _filters: [] as Array<{ col: string; val: any }>,
      select(sel: string) { this._select = sel; return this; },
      eq(col: string, val: any) { this._filters.push({ col, val }); return this; },
      in(col: string, arr: any[]) { this._filters.push({ col, val: arr }); return this; },
      order() { return this; },
      maybeSingle() { return this.thenOne(); },
      // Make the chain awaitable (thenable)
      then(onFulfilled: any) { return Promise.resolve(this.thenAll()).then(onFulfilled); },
      async thenOne() {
        const res = await this.thenAll();
        return { data: (Array.isArray(res.data) ? res.data[0] : res.data) ?? null, error: null } as any;
      },
      async thenAll() {
        if (this._table === 'weekly_schedules' && this._select.includes('movement_week')) {
          return { data: [{ movement_week: movementWeek }], error: null } as any;
        }
        if (this._table === 'weekly_schedules' && this._select.includes('tier_number, format')) {
          // Provide current week tiers for pairing/adjacent format lookups
          return { data: [
            { tier_number: 1, format: '2-teams-elite' },
            { tier_number: 2, format: '2-teams-elite' },
          ], error: null } as any;
        }
        if (this._table === 'weekly_schedules' && this._select === 'no_games') {
          // Treat week as playable
          return { data: [], error: null } as any;
        }
        // Default empty
        return { data: [], error: null } as any;
      },
    };
    return api;
  };
  const rpc = async (fn: string, args: any) => { rpcCalls.push({ fn, args }); return { data: null, error: null } as any; };
  return { supabase: { from, rpc } };
});

// Import after mocking supabase
import { applyTwoTeamTierMovementNextWeek, applyEliteThreeTeamMovementNextWeek } from '../..//database/scheduleDatabase';

describe('movement week behavior (elite)', () => {
  beforeEach(() => { rpcCalls.length = 0; movementWeek = false; });

  it('2-team elite: defaults to within-pair when not movement week', async () => {
    const leagueId = 1;
    const currentWeek = 3; // odd parity should not matter anymore
    const tierNumber = 2; // pretend this is label B, partner is tier 1 (A)
    await applyTwoTeamTierMovementNextWeek({
      leagueId,
      currentWeek,
      tierNumber,
      isTopTier: false,
      isBottomTier: false,
      teamNames: { A: 'Alpha', B: 'Bravo' },
      sortedKeys: ['B', 'A'], // winner B, loser A
    } as any);
    expect(rpcCalls.length).toBe(1);
    const args = rpcCalls[0].args;
    // Expect two assignments: winner B -> partner tier at B, loser A -> current tier at B
    const assigns = args.p_assignments;
    expect(assigns).toEqual(
      expect.arrayContaining([
        { target_tier: 1, target_pos: 'B', team_name: 'Bravo' },
        { target_tier: 2, target_pos: 'B', team_name: 'Alpha' },
      ])
    );
  });

  it('2-team elite: cross-pair only when movement week', async () => {
    movementWeek = true;
    rpcCalls.length = 0;
    await applyTwoTeamTierMovementNextWeek({
      leagueId: 1,
      currentWeek: 4,
      tierNumber: 2,
      isTopTier: false,
      isBottomTier: false,
      teamNames: { A: 'Alpha', B: 'Bravo' },
      sortedKeys: ['B', 'A'],
    } as any);
    const assigns = rpcCalls[0].args.p_assignments;
    // On movement week for B: winner goes to partner (A) at B, loser goes down a tier at A
    expect(assigns).toEqual(
      expect.arrayContaining([
        { target_tier: 1, target_pos: 'B', team_name: 'Bravo' },
        { target_tier: 3, target_pos: 'A', team_name: 'Alpha' },
      ])
    );
  });

  it('3-team elite: defaults to intra-tier; cross-tier only on movement week', async () => {
    // Intra-tier
    rpcCalls.length = 0; movementWeek = false;
    await applyEliteThreeTeamMovementNextWeek({
      leagueId: 9,
      currentWeek: 5,
      tierNumber: 3,
      isTopTier: false,
      isBottomTier: false,
      teamNames: { A: 'Aces', B: 'Boom', C: 'Clash' },
      sortedKeys: ['A','B','C'],
    } as any);
    let assigns = rpcCalls[0].args.p_assignments;
    expect(assigns).toEqual(
      expect.arrayContaining([
        { target_tier: 3, target_pos: 'A', team_name: 'Aces' },
        { target_tier: 3, target_pos: 'B', team_name: 'Boom' },
        { target_tier: 3, target_pos: 'C', team_name: 'Clash' },
      ])
    );

    // Cross-tier when movement week
    rpcCalls.length = 0; movementWeek = true;
    await applyEliteThreeTeamMovementNextWeek({
      leagueId: 9,
      currentWeek: 6,
      tierNumber: 3,
      isTopTier: false,
      isBottomTier: false,
      teamNames: { A: 'Aces', B: 'Boom', C: 'Clash' },
      sortedKeys: ['A','B','C'],
    } as any);
    assigns = rpcCalls[0].args.p_assignments;
    expect(assigns).toEqual(
      expect.arrayContaining([
        { target_tier: 2, target_pos: 'B', team_name: 'Aces' },
        { target_tier: 3, target_pos: 'B', team_name: 'Boom' },
        { target_tier: 4, target_pos: 'A', team_name: 'Clash' },
      ])
    );
  });
});
