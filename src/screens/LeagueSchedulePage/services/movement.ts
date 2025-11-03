import { supabase } from '../../../lib/supabase';
import { applyThreeTeamTierMovementNextWeek } from '../database/scheduleDatabase';
import { applyFourTeamTierMovementNextWeek } from '../database/scheduleDatabase';
import { getNextPlayableWeek } from '../database/scheduleDatabase';
import { applyTwoTeamTierMovementNextWeek } from '../database/scheduleDatabase';
import { applyEliteThreeTeamMovementNextWeek } from '../database/scheduleDatabase';

type ABC = 'A' | 'B' | 'C';

interface ApplyMovementParams {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  isTopTier: boolean;
  pointsTierOffset: number; // 0 = bottom tier
  teamNames: Record<ABC, string>;
  sortedKeys: ABC[]; // best -> worst order for this tier's results
}

/**
 * Centralized movement application invoked after standings update.
 * Handles bottom-tier detection and optional debug verification.
 */
export async function applyMovementAfterStandings({
  leagueId,
  weekNumber,
  tierNumber,
  isTopTier,
  pointsTierOffset,
  teamNames,
  sortedKeys,
}: ApplyMovementParams): Promise<void> {
  const isBottomTier = pointsTierOffset === 0;

  await applyThreeTeamTierMovementNextWeek({
    leagueId,
    currentWeek: weekNumber,
    tierNumber,
    isTopTier,
    isBottomTier,
    teamNames,
    sortedKeys,
  });

  // Optional debug: summarize next week's placements for adjacent tiers
  // Enable by setting VITE_DEBUG_MOVEMENT=true
  try {
    if (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_DEBUG_MOVEMENT) {
      const nextWeek = (weekNumber || 0) + 1;
      const targetTiers = [Math.max(1, tierNumber - 1), tierNumber, tierNumber + 1];
      const { data: verifyRows } = await supabase
        .from('weekly_schedules')
        .select('tier_number, team_a_name, team_b_name, team_c_name')
        .eq('league_id', leagueId)
        .eq('week_number', nextWeek)
        .in('tier_number', targetTiers);
      if (verifyRows && verifyRows.length) {
        const summary = verifyRows
          .sort((a: any, b: any) => (a.tier_number as number) - (b.tier_number as number))
          .map((r: any) => `T${r.tier_number}: A=${r.team_a_name || '-'} B=${r.team_b_name || '-'} C=${r.team_c_name || '-'}`)
          .join(' | ');
        console.info('[Movement] Next week placements:', summary);
      }
    }
  } catch {}
}

// 2-team movement wrapper
type AB = 'A' | 'B';
interface ApplyTwoTeamMovementParams {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  isTopTier: boolean;
  pointsTierOffset: number; // 0 = bottom tier
  teamNames: Record<AB, string>;
  sortedKeys: AB[]; // best -> worst
}

export async function applyTwoTeamMovementAfterStandings({
  leagueId,
  weekNumber,
  tierNumber,
  isTopTier,
  pointsTierOffset,
  teamNames,
  sortedKeys,
}: ApplyTwoTeamMovementParams): Promise<void> {
  const isBottomTier = pointsTierOffset === 0;
  await applyTwoTeamTierMovementNextWeek({
    leagueId,
    currentWeek: weekNumber,
    tierNumber,
    isTopTier,
    isBottomTier,
    teamNames,
    sortedKeys,
  });
}

// Elite 3-team movement wrapper (odd weeks = within-tier shuffle; even weeks = cross-tier)
export async function applyEliteThreeTeamMovementAfterStandings(params: {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  isTopTier: boolean;
  isBottomTier: boolean;
  teamNames: { A: string; B: string; C: string };
  sortedKeys: Array<'A'|'B'|'C'>;
}): Promise<void> {
  const { leagueId, weekNumber, tierNumber, isTopTier, isBottomTier, teamNames, sortedKeys } = params;
  await applyEliteThreeTeamMovementNextWeek({
    leagueId,
    currentWeek: weekNumber,
    tierNumber,
    isTopTier,
    isBottomTier,
    teamNames,
    sortedKeys,
  });
}

// 4-team H2H movement wrapper
export async function applyFourTeamMovementAfterStandings(params: {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  isTopTier: boolean;
  pointsTierOffset: number;
  teamNames: { A: string; B: string; C: string; D: string };
  game1: { court1: Array<{ label: string; scores: Record<'A'|'B', string> }>; court2: Array<{ label: string; scores: Record<'C'|'D', string> }>; };
  game2: { court1: Array<{ label: string; scores: Record<'WC1'|'WC2', string> }>; court2: Array<{ label: string; scores: Record<'LC1'|'LC2', string> }>; };
}): Promise<void> {
  const { leagueId, weekNumber, tierNumber, isTopTier, pointsTierOffset, teamNames, game1, game2 } = params;
  await applyFourTeamTierMovementNextWeek({
    leagueId,
    currentWeek: weekNumber,
    tierNumber,
    isTopTier,
    isBottomTier: pointsTierOffset === 0,
    teamNames,
    game1,
    game2,
  });
}

export async function applySixTeamMovementAfterStandings(params: {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  isTopTier: boolean;
  pointsTierOffset: number;
  teamNames: { A: string; B: string; C: string; D: string; E: string; F: string };
  teamStats: Array<{ team: string; setWins: number; setLosses: number; diff: number; prevPosition: string }>;
}): Promise<void> {
  const { leagueId, weekNumber, tierNumber, isTopTier, pointsTierOffset, teamNames, teamStats } = params;

  const nextWeek = weekNumber + 1;
  const isBottomTier = pointsTierOffset === 0;

  const positionColumns = ['team_a_name', 'team_b_name', 'team_c_name', 'team_d_name', 'team_e_name', 'team_f_name'] as const;

  // Determine destination week, skipping full no-games weeks to match other formats
  const destWeek = await getNextPlayableWeek(leagueId, nextWeek);

  const uniqueNames = new Set(
    teamStats.map((stat) => teamNames[stat.team as keyof typeof teamNames]).filter((name): name is string => Boolean(name))
  );

  const movements = [
    { rank: 0, targetTier: isTopTier ? tierNumber : Math.max(1, tierNumber - 1), targetPosition: isTopTier ? 'A' : 'F' },
    { rank: 1, targetTier: tierNumber, targetPosition: 'B' },
    { rank: 2, targetTier: tierNumber, targetPosition: 'C' },
    { rank: 3, targetTier: tierNumber, targetPosition: 'D' },
    { rank: 4, targetTier: tierNumber, targetPosition: 'E' },
    { rank: 5, targetTier: isBottomTier ? tierNumber : tierNumber + 1, targetPosition: isBottomTier ? 'F' : 'A' },
  ] as const;

  const rpcAssignments = movements
    .map((movement) => {
      const teamStat = teamStats[movement.rank];
      if (!teamStat) return null;
      const name = teamNames[teamStat.team as keyof typeof teamNames];
      if (!name) return null;
      return { target_tier: movement.targetTier, target_pos: movement.targetPosition, team_name: name };
    })
    .filter((v): v is { target_tier: number; target_pos: string; team_name: string } => v !== null);

  const { error: rpcErr } = await supabase.rpc('apply_next_week_assignments', {
    p_league_id: leagueId,
    p_current_week: weekNumber,
    p_tier_number: tierNumber,
    p_dest_week: destWeek,
    p_assignments: rpcAssignments,
    p_mark_completed: true,
  });
  if (rpcErr) {
    console.warn('Failed to apply 6-team movement via RPC', rpcErr);
  }
}
