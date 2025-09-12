import { supabase } from '../../../lib/supabase';
import { applyMovementAfterStandings } from './movement';

type TeamKey = 'A' | 'B' | 'C';

export interface ScoreSet {
  label: string;
  teams: [TeamKey, TeamKey];
  scores: Record<TeamKey, string>;
}

export interface SubmitThreeTeamParams {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  tierId: number; // weekly_schedules.id to mark is_completed
  teamNames: Record<TeamKey, string>;
  sets: ScoreSet[];
  spares: Record<TeamKey, string>;
  pointsTierOffset: number; // 0 for bottom tier
  isTopTier: boolean;
}

/**
 * Submit 3-team, 6-sets scorecard: persists game_results, updates standings, recalculates positions,
 * and applies next-week tier movement.
 */
export async function submitThreeTeamScoresAndMove(params: SubmitThreeTeamParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, sets, spares, pointsTierOffset, isTopTier } = params;

  // Aggregate set-by-set into per-team stats
  const stats: Record<TeamKey, { setWins: number; setLosses: number; pf: number; pa: number }> = {
    A: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    B: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    C: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
  };
  sets.forEach((entry) => {
    const [left, right] = entry.teams;
    const sLeft = entry.scores[left] ?? '';
    const sRight = entry.scores[right] ?? '';
    if (sLeft === '' || sRight === '') return; // ignore incomplete
    const nLeft = Number(sLeft);
    const nRight = Number(sRight);
    if (Number.isNaN(nLeft) || Number.isNaN(nRight) || nLeft === nRight) return; // ignore invalid/tie
    stats[left].pf += nLeft; stats[left].pa += nRight;
    stats[right].pf += nRight; stats[right].pa += nLeft;
    if (nLeft > nRight) { stats[left].setWins += 1; stats[right].setLosses += 1; }
    else { stats[right].setWins += 1; stats[left].setLosses += 1; }
  });

  const diff: Record<TeamKey, number> = {
    A: stats.A.pf - stats.A.pa,
    B: stats.B.pf - stats.B.pa,
    C: stats.C.pf - stats.C.pa,
  };
  const teamKeys: TeamKey[] = ['A', 'B', 'C'];
  const sorted = [...teamKeys].sort((x, y) => {
    if (stats[y].setWins !== stats[x].setWins) return stats[y].setWins - stats[x].setWins;
    if (diff[y] !== diff[x]) return diff[y] - diff[x];
    return teamKeys.indexOf(x) - teamKeys.indexOf(y);
  });

  // Determine weekly league points (5/4/3 + 2*pointsOffset bonus)
  const role: Record<TeamKey, 'winner' | 'neutral' | 'loser'> = { A: 'neutral', B: 'neutral', C: 'neutral' };
  role[sorted[0]] = 'winner'; role[sorted[2]] = 'loser';
  const basePoints: Record<'winner' | 'neutral' | 'loser', number> = { winner: 5, neutral: 4, loser: 3 };
  const tierBonus = 2 * Math.max(0, pointsTierOffset);
  const weeklyLeaguePoints: Record<TeamKey, number> = { A: 0, B: 0, C: 0 };
  teamKeys.forEach((k) => { weeklyLeaguePoints[k] = basePoints[role[k]] + tierBonus; });

  // Build match_details JSON
  const matchDetails = {
    spares,
    sets: sets.map(s => ({ label: s.label, teams: s.teams, scores: s.scores })),
  };

  // Snapshot previous results BEFORE upserting
  const { data: prevRows } = await supabase
    .from('game_results')
    .select('team_name,wins,losses,points_for,points_against,league_points')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier_number', tierNumber);

  const prevStats: Record<TeamKey, { wins: number; losses: number; diff: number }> = {
    A: { wins: 0, losses: 0, diff: 0 },
    B: { wins: 0, losses: 0, diff: 0 },
    C: { wins: 0, losses: 0, diff: 0 },
  };
  const nameToKey = new Map<string, TeamKey>([
    [teamNames.A || '', 'A'],
    [teamNames.B || '', 'B'],
    [teamNames.C || '', 'C'],
  ]);
  if (prevRows && prevRows.length) {
    prevRows.forEach((r: any) => {
      const k = nameToKey.get(r.team_name as string);
      if (!k) return;
      prevStats[k].wins = r.wins || 0;
      prevStats[k].losses = r.losses || 0;
      const pf = r.points_for || 0; const pa = r.points_against || 0;
      prevStats[k].diff = pf - pa;
    });
  }
  const prevSorted = (['A','B','C'] as const).sort((x, y) => {
    if (prevStats[y].wins !== prevStats[x].wins) return prevStats[y].wins - prevStats[x].wins;
    if (prevStats[y].diff !== prevStats[x].diff) return prevStats[y].diff - prevStats[x].diff;
    return ['A','B','C'].indexOf(x) - ['A','B','C'].indexOf(y);
  });
  const prevRole: Record<TeamKey, 'winner' | 'neutral' | 'loser'> = { A: 'neutral', B: 'neutral', C: 'neutral' };
  if (prevRows && prevRows.length) { prevRole[prevSorted[0]] = 'winner'; prevRole[prevSorted[2]] = 'loser'; }
  const prevBasePoints: Record<'winner' | 'neutral' | 'loser', number> = { winner: 5, neutral: 4, loser: 3 };
  const prevBonus = 2 * Math.max(0, pointsTierOffset);
  const prevPoints: Record<TeamKey, number> = {
    A: prevBasePoints[prevRole.A] + prevBonus,
    B: prevBasePoints[prevRole.B] + prevBonus,
    C: prevBasePoints[prevRole.C] + prevBonus,
  };

  // Upsert per-team game_results
  for (const k of teamKeys) {
    const teamName = teamNames[k] || '';
    if (!teamName) continue;
    const payload: any = {
      league_id: leagueId,
      week_number: weekNumber,
      tier_number: tierNumber,
      team_name: teamName,
      wins: stats[k].setWins,
      losses: stats[k].setLosses,
      sets_won: stats[k].setWins,
      sets_lost: stats[k].setLosses,
      points_for: stats[k].pf,
      points_against: stats[k].pa,
      tier_position: (sorted.indexOf(k) + 1),
      league_points: weeklyLeaguePoints[k],
      match_details: matchDetails,
    };
    const { error: upsertErr } = await supabase
      .from('game_results')
      .upsert(payload, {
        onConflict: 'league_id,week_number,tier_number,team_name',
        ignoreDuplicates: false,
      });
    if (upsertErr) throw upsertErr;
  }

  // Mark weekly tier as completed
  {
    const { error } = await supabase
      .from('weekly_schedules')
      .update({ is_completed: true })
      .eq('id', tierId);
    if (error) throw error;
  }

  // Update standings with delta vs previous
  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .in('name', teamKeys.map(k => teamNames[k]).filter(Boolean));
  if (teamsErr) throw teamsErr;
  const nameToId = new Map<string, number>();
  (teamsRows || []).forEach((t: any) => nameToId.set(t.name, t.id));

  for (const k of teamKeys) {
    const name = teamNames[k] || '';
    if (!name) continue;
    const teamId = nameToId.get(name);
    if (!teamId) continue;

    const { data: standingRow, error: standingErr } = await supabase
      .from('standings')
      .select('id, wins, losses, points, point_differential')
      .eq('league_id', leagueId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (standingErr && (standingErr as any).code !== 'PGRST116') throw standingErr;

    const addWins = stats[k].setWins;
    const addLosses = stats[k].setLosses;
    const addDiff = diff[k];
    const addPoints = weeklyLeaguePoints[k];

    const rows = Array.isArray(prevRows) ? prevRows : [];
    const prevRowForTeam = rows.find((r) => r && r.team_name === name);
    const subPointsExact = prevRowForTeam && typeof (prevRowForTeam as any).league_points === 'number'
      ? (prevRowForTeam as any).league_points as number
      : (prevRows && prevRows.length ? prevPoints[k] : 0);

    if (!standingRow) {
      const { error: insErr } = await supabase
        .from('standings')
        .insert({
          league_id: leagueId,
          team_id: teamId,
          wins: addWins - (prevStats[k].wins || 0),
          losses: addLosses - (prevStats[k].losses || 0),
          points: addPoints - subPointsExact,
          point_differential: addDiff - (prevStats[k].diff || 0),
        });
      if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase
        .from('standings')
        .update({
          wins: (standingRow as any).wins - (prevStats[k].wins || 0) + addWins,
          losses: (standingRow as any).losses - (prevStats[k].losses || 0) + addLosses,
          points: (standingRow as any).points - subPointsExact + addPoints,
          point_differential: (standingRow as any).point_differential - (prevStats[k].diff || 0) + addDiff,
        })
        .eq('id', (standingRow as any).id);
      if (updErr) throw updErr;
    }
  }

  // Recalculate standings positions
  {
    const { error: recalcErr } = await supabase.rpc('recalculate_standings_positions', {
      p_league_id: leagueId,
    });
    if (recalcErr) throw recalcErr;
  }

  // Apply movement to next week
  await applyMovementAfterStandings({
    leagueId,
    weekNumber,
    tierNumber,
    isTopTier,
    pointsTierOffset,
    teamNames,
    sortedKeys: sorted,
  });
}

