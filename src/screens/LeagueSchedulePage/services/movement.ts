import { supabase } from '../../../lib/supabase';
import { applyThreeTeamTierMovementNextWeek } from '../database/scheduleDatabase';
import { applyFourTeamTierMovementNextWeek } from '../database/scheduleDatabase';
import { applyTwoTeamTierMovementNextWeek } from '../database/scheduleDatabase';

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
  await applyFourTeamTierMovementNextWeek({ leagueId, currentWeek: weekNumber, tierNumber, isTopTier, isBottomTier: pointsTierOffset===0, teamNames, game1, game2 });
}
