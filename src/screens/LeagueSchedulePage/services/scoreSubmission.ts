// @ts-nocheck
import { supabase } from '../../../lib/supabase';
import { applyMovementAfterStandings, applyTwoTeamMovementAfterStandings, applyEliteThreeTeamMovementAfterStandings } from './movement';
import { applyFourTeamMovementAfterStandings, applySixTeamMovementAfterStandings } from './movement';

type TeamKey = 'A' | 'B' | 'C';
type SixTeamKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

// Normalize team names for reliable matching against DB rows
const normalizeName = (s: string | null | undefined): string => {
  return String(s || '')
    .toLowerCase()
    // remove diacritics
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // keep alphanumerics, collapse everything else to space
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

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

  // Update standings with delta vs previous (robust name matching)
  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('active', true);
  if (teamsErr) throw teamsErr;
  const nameToId = new Map<string, number>();
  (teamsRows || []).forEach((t: any) => nameToId.set(normalizeName(t.name), t.id));

  for (const k of teamKeys) {
    const name = teamNames[k] || '';
    if (!name) continue;
    const teamId = nameToId.get(normalizeName(name));
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

  // Apply movement to next week using standard 3-team rules (non-elite)
  await applyMovementAfterStandings({
    leagueId,
    weekNumber,
    tierNumber,
    isTopTier,
    pointsTierOffset,
    teamNames,
    sortedKeys: sorted,
  });

  // NOTE: Do not add any forced fallback writes for standard 3-team formats here.
  // Standard 3-team movement was previously working and should remain unchanged.
}

// ======================================================
// 2-TEAM (4 SETS) SUBMISSION
// ======================================================

type AB = 'A' | 'B';

export interface SubmitTwoTeamParams {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  tierId: number;
  teamNames: Record<AB, string>;
  sets: Array<{ label: string; teams: [AB, AB]; scores: Record<AB, string> }>;
  spares: Record<AB, string>;
  pointsTierOffset: number;
  isTopTier: boolean;
}

export async function submitTwoTeamScoresAndMove(params: SubmitTwoTeamParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, sets, spares, pointsTierOffset, isTopTier } = params;

  const stats: Record<AB, { setWins: number; setLosses: number; pf: number; pa: number }> = {
    A: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    B: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
  };
  sets.forEach((entry) => {
    const [left, right] = entry.teams;
    const sLeft = entry.scores[left] ?? '';
    const sRight = entry.scores[right] ?? '';
    if (sLeft === '' || sRight === '') return;
    const nLeft = Number(sLeft);
    const nRight = Number(sRight);
    if (Number.isNaN(nLeft) || Number.isNaN(nRight) || nLeft === nRight) return;
    stats[left].pf += nLeft; stats[left].pa += nRight;
    stats[right].pf += nRight; stats[right].pa += nLeft;
    if (nLeft > nRight) { stats[left].setWins += 1; stats[right].setLosses += 1; }
    else { stats[right].setWins += 1; stats[left].setLosses += 1; }
  });

  const diff: Record<AB, number> = {
    A: stats.A.pf - stats.A.pa,
    B: stats.B.pf - stats.B.pa,
  };
  const teamKeys: AB[] = ['A', 'B'];
  const sorted = [...teamKeys].sort((x, y) => {
    if (stats[y].setWins !== stats[x].setWins) return stats[y].setWins - stats[x].setWins;
    if (diff[y] !== diff[x]) return diff[y] - diff[x];
    return teamKeys.indexOf(x) - teamKeys.indexOf(y);
  });

  // Points: winner 5, loser 3, +2 per tier from bottom
  const role: Record<AB, 'winner' | 'loser'> = { A: 'loser', B: 'loser' };
  role[sorted[0]] = 'winner';
  const basePoints: Record<'winner' | 'loser', number> = { winner: 5, loser: 3 };
  const tierBonus = 2 * Math.max(0, pointsTierOffset);
  const weeklyLeaguePoints: Record<AB, number> = { A: 0, B: 0 };
  teamKeys.forEach((k) => { weeklyLeaguePoints[k] = basePoints[role[k]] + tierBonus; });

  const matchDetails = {
    spares,
    sets: sets.map(s => ({ label: s.label, teams: s.teams, scores: s.scores })),
  };

  // Snapshot previous results for delta calculations
  const { data: prevRows } = await supabase
    .from('game_results')
    .select('team_name,wins,losses,points_for,points_against,league_points')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier_number', tierNumber);

  const prevStats: Record<AB, { wins: number; losses: number; diff: number }> = {
    A: { wins: 0, losses: 0, diff: 0 },
    B: { wins: 0, losses: 0, diff: 0 },
  };
  const nameToKey = new Map<string, AB>([
    [teamNames.A || '', 'A'],
    [teamNames.B || '', 'B'],
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
  const prevSorted = (['A','B'] as const).sort((x, y) => {
    if (prevStats[y].wins !== prevStats[x].wins) return prevStats[y].wins - prevStats[x].wins;
    if (prevStats[y].diff !== prevStats[x].diff) return prevStats[y].diff - prevStats[x].diff;
    return ['A','B'].indexOf(x) - ['A','B'].indexOf(y);
  });
  const prevRole: Record<AB, 'winner' | 'loser'> = { A: 'loser', B: 'loser' };
  if (prevRows && prevRows.length) { prevRole[prevSorted[0]] = 'winner'; }
  const prevBasePoints: Record<'winner' | 'loser', number> = { winner: 5, loser: 3 };
  const prevBonus = 2 * Math.max(0, pointsTierOffset);
  const prevPoints: Record<AB, number> = {
    A: prevBasePoints[prevRole.A] + prevBonus,
    B: prevBasePoints[prevRole.B] + prevBonus,
  };

  // Upsert game_results rows
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
      .upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
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

  // Update standings with deltas (robust matching, logs for league 4)
  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('active', true);
  if (teamsErr) throw teamsErr;
  const nameToId = new Map<string, number>();
  (teamsRows || []).forEach((t: any) => nameToId.set(normalizeName(t.name), t.id));
  try {
    if (leagueId === 4) {
      console.info('[Standings][L4][2-team] name map:', Object.fromEntries(Array.from(nameToId.entries()).slice(0, 10)));
      console.info('[Standings][L4][2-team] from weekly names:', teamKeys.map(k => teamNames[k]));
    }
  } catch {}

  for (const k of teamKeys) {
    const name = teamNames[k] || '';
    if (!name) continue;
    const teamId = nameToId.get(normalizeName(name));
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
    const { error: recalcErr } = await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });
    if (recalcErr) throw recalcErr;
  }

  // Apply two-team movement to next week
  await applyTwoTeamMovementAfterStandings({
    leagueId,
    weekNumber,
    tierNumber,
    isTopTier,
    pointsTierOffset,
    teamNames,
    sortedKeys: sorted,
  });
}

// Best of 5: stop counting once a team reaches 3 set wins
export async function submitTwoTeamBestOf5ScoresAndMove(params: SubmitTwoTeamParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, sets, spares, pointsTierOffset, isTopTier } = params;

  const stats: Record<AB, { setWins: number; setLosses: number; pf: number; pa: number }> = {
    A: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    B: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
  };
  let aWins = 0, bWins = 0;
  for (let i = 0; i < sets.length; i++) {
    if (aWins === 3 || bWins === 3) break;
    const entry = sets[i];
    const [left, right] = entry.teams;
    const sLeft = entry.scores[left] ?? '';
    const sRight = entry.scores[right] ?? '';
    if (sLeft === '' || sRight === '') break;
    const nLeft = Number(sLeft);
    const nRight = Number(sRight);
    if (Number.isNaN(nLeft) || Number.isNaN(nRight) || nLeft === nRight) break;
    stats[left].pf += nLeft; stats[left].pa += nRight;
    stats[right].pf += nRight; stats[right].pa += nLeft;
    if (nLeft > nRight) { stats[left].setWins += 1; stats[right].setLosses += 1; if (left === 'A') aWins++; else bWins++; }
    else { stats[right].setWins += 1; stats[left].setLosses += 1; if (right === 'A') aWins++; else bWins++; }
  }

  const diff: Record<AB, number> = {
    A: stats.A.pf - stats.A.pa,
    B: stats.B.pf - stats.B.pa,
  };
  const teamKeys: AB[] = ['A', 'B'];
  const sorted = [...teamKeys].sort((x, y) => {
    if (stats[y].setWins !== stats[x].setWins) return stats[y].setWins - stats[x].setWins;
    if (diff[y] !== diff[x]) return diff[y] - diff[x];
    return teamKeys.indexOf(x) - teamKeys.indexOf(y);
  });

  // Points: Base 2 +1 per set win (max +3) +1 per tier up from bottom
  const role: Record<AB, 'winner' | 'loser'> = { A: 'loser', B: 'loser' };
  role[sorted[0]] = 'winner';
  const baseStart = 2;
  const tierBonus = Math.max(0, pointsTierOffset);
  const weeklyLeaguePoints: Record<AB, number> = { A: 0, B: 0 };
  teamKeys.forEach((k) => {
    const setBonus = Math.min(stats[k].setWins, 3);
    weeklyLeaguePoints[k] = baseStart + setBonus + tierBonus;
  });

  const matchDetails = {
    spares,
    sets: sets.map(s => ({ label: s.label, teams: s.teams, scores: s.scores })),
  };

  const { data: prevRows } = await supabase
    .from('game_results')
    .select('team_name,wins,losses,points_for,points_against,league_points')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier_number', tierNumber);

  const prevStats: Record<AB, { wins: number; losses: number; diff: number }> = {
    A: { wins: 0, losses: 0, diff: 0 },
    B: { wins: 0, losses: 0, diff: 0 },
  };
  const nameToKey = new Map<string, AB>([
    [teamNames.A || '', 'A'],
    [teamNames.B || '', 'B'],
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
  const prevSorted = (['A','B'] as const).sort((x, y) => {
    if (prevStats[y].wins !== prevStats[x].wins) return prevStats[y].wins - prevStats[x].wins;
    if (prevStats[y].diff !== prevStats[x].diff) return prevStats[y].diff - prevStats[x].diff;
    return ['A','B'].indexOf(x) - ['A','B'].indexOf(y);
  });
  const prevRole: Record<AB, 'winner' | 'loser'> = { A: 'loser', B: 'loser' };
  if (prevRows && prevRows.length) { prevRole[prevSorted[0]] = 'winner'; }
  const prevBaseStart = 2;
  const prevTierBonus = Math.max(0, pointsTierOffset);
  const prevPoints: Record<AB, number> = {
    A: prevBaseStart + Math.min(prevStats.A.wins, 3) + prevTierBonus,
    B: prevBaseStart + Math.min(prevStats.B.wins, 3) + prevTierBonus,
  };

  // Upsert results
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
      .upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
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

  // Update standings deltas (robust mapping)
  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('active', true);
  if (teamsErr) throw teamsErr;
  const nameToId = new Map<string, number>();
  (teamsRows || []).forEach((t: any) => nameToId.set(normalizeName(t.name), t.id));
  try {
    if (leagueId === 4) {
      console.info('[Standings][L4][2-team Bo5] name map:', Object.fromEntries(Array.from(nameToId.entries()).slice(0, 10)));
      console.info('[Standings][L4][2-team Bo5] from weekly names:', teamKeys.map(k => teamNames[k]));
    }
  } catch {}

  for (const k of teamKeys) {
    const name = teamNames[k] || '';
    if (!name) continue;
    const teamId = nameToId.get(normalizeName(name));
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

  // Recalculate positions and apply movement
  {
    const { error: recalcErr } = await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });
    if (recalcErr) throw recalcErr;
  }

  await applyTwoTeamMovementAfterStandings({
    leagueId,
    weekNumber,
    tierNumber,
    isTopTier,
    pointsTierOffset,
    teamNames,
    sortedKeys: sorted,
  });
}

// ======================================================
// ELITE VARIANTS (no league points; W/L only)
// ======================================================

export async function submitTwoTeamEliteBestOf5ScoresAndMove(params: SubmitTwoTeamParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, sets, spares, isTopTier, pointsTierOffset } = params;

  type AB = 'A'|'B';
  const stats: Record<AB, { setWins: number; setLosses: number; pf: number; pa: number }> = { A:{setWins:0,setLosses:0,pf:0,pa:0}, B:{setWins:0,setLosses:0,pf:0,pa:0} };
  let aWins = 0, bWins = 0;
  for (let i = 0; i < sets.length; i++) {
    if (aWins === 3 || bWins === 3) break;
    const entry = sets[i];
    const [left, right] = entry.teams as [AB,AB];
    const sLeft = entry.scores[left] ?? '';
    const sRight = entry.scores[right] ?? '';
    if (sLeft === '' || sRight === '') break;
    const nLeft = Number(sLeft); const nRight = Number(sRight);
    if (Number.isNaN(nLeft) || Number.isNaN(nRight) || nLeft === nRight) break;
    stats[left].pf += nLeft; stats[left].pa += nRight;
    stats[right].pf += nRight; stats[right].pa += nLeft;
    if (nLeft > nRight) { stats[left].setWins++; stats[right].setLosses++; if (left==='A') aWins++; else bWins++; }
    else { stats[right].setWins++; stats[left].setLosses++; if (right==='A') aWins++; else bWins++; }
  }
  const diff: Record<AB, number> = { A: stats.A.pf - stats.A.pa, B: stats.B.pf - stats.B.pa };
  const teamKeys: AB[] = ['A','B'];
  const sorted = [...teamKeys].sort((x,y)=> stats[y].setWins-stats[x].setWins || diff[y]-diff[x] || teamKeys.indexOf(x)-teamKeys.indexOf(y));

  const matchDetails = { spares, sets: sets.map(s=>({ label:s.label, teams:s.teams, scores:s.scores })) };

  const { data: prevRows } = await supabase
    .from('game_results')
    .select('team_name')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier_number', tierNumber);

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
      league_points: 0,
      match_details: matchDetails,
    };
    const { error: upsertErr } = await supabase
      .from('game_results')
      .upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
    if (upsertErr) throw upsertErr;
  }

  await supabase.from('weekly_schedules').update({ is_completed: true }).eq('id', tierId);

  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .in('name', teamKeys.map(k => teamNames[k]).filter(Boolean));
  if (teamsErr) throw teamsErr;
  const nameToId = new Map<string, number>(); (teamsRows||[]).forEach((t:any)=>nameToId.set(t.name, t.id));

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

    const addWins = stats[k].setWins, addLosses = stats[k].setLosses, addDiff = diff[k];

    if (!standingRow) {
      const { error: insErr } = await supabase.from('standings').insert({
        league_id: leagueId, team_id: teamId, wins: addWins, losses: addLosses, points: 0, point_differential: addDiff,
      }); if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase.from('standings').update({
        wins: (standingRow as any).wins + addWins,
        losses: (standingRow as any).losses + addLosses,
        points: (standingRow as any).points,
        point_differential: (standingRow as any).point_differential + addDiff,
      }).eq('id', (standingRow as any).id); if (updErr) throw updErr;
    }
  }

  await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });
  await applyTwoTeamMovementAfterStandings({
    leagueId, weekNumber, tierNumber, isTopTier, pointsTierOffset, teamNames, sortedKeys: sorted,
  });
}

export interface SubmitThreeTeamEliteParams extends SubmitThreeTeamParams {}

export async function submitThreeTeamEliteSixScoresAndMove(params: SubmitThreeTeamEliteParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, sets, spares, isTopTier, pointsTierOffset } = params;
  type ABC = 'A'|'B'|'C';
  const stats: Record<ABC, { wins: number; losses: number; pf: number; pa: number }> = { A:{wins:0,losses:0,pf:0,pa:0}, B:{wins:0,losses:0,pf:0,pa:0}, C:{wins:0,losses:0,pf:0,pa:0} };
  sets.forEach((entry) => {
    const [L, R] = entry.teams as [ABC,ABC];
    const sL = entry.scores[L] ?? '', sR = entry.scores[R] ?? '';
    if (sL === '' || sR === '') return;
    const nL = Number(sL), nR = Number(sR);
    if (Number.isNaN(nL) || Number.isNaN(nR) || nL === nR) return;
    stats[L].pf += nL; stats[L].pa += nR; stats[R].pf += nR; stats[R].pa += nL;
    if (nL > nR) { stats[L].wins++; stats[R].losses++; } else { stats[R].wins++; stats[L].losses++; }
  });
  const diff: Record<ABC, number> = { A: stats.A.pf - stats.A.pa, B: stats.B.pf - stats.B.pa, C: stats.C.pf - stats.C.pa };
  const order: ABC[] = ['A','B','C'];
  const sorted = [...order].sort((x,y)=> stats[y].wins-stats[x].wins || diff[y]-diff[x] || order.indexOf(x)-order.indexOf(y));
  const matchDetails = { spares, sets: sets.map(s=>({label:s.label, teams:s.teams, scores:s.scores})) };

  for (const k of order) {
    const teamName = teamNames[k] || '';
    if (!teamName) continue;
    const payload: any = {
      league_id: leagueId, week_number: weekNumber, tier_number: tierNumber,
      team_name: teamName, wins: stats[k].wins, losses: stats[k].losses,
      sets_won: stats[k].wins, sets_lost: stats[k].losses, points_for: stats[k].pf, points_against: stats[k].pa,
      tier_position: (sorted.indexOf(k)+1), league_points: 0, match_details: matchDetails,
    };
    const { error: upErr } = await supabase.from('game_results').upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
    if (upErr) throw upErr;
  }
  await supabase.from('weekly_schedules').update({ is_completed: true }).eq('id', tierId);

  const { data: teamsRows } = await supabase.from('teams').select('id, name').eq('league_id', leagueId).in('name', order.map(k=>teamNames[k]).filter(Boolean));
  const nameToId = new Map<string, number>(); (teamsRows||[]).forEach((t:any)=>nameToId.set(t.name,t.id));
  for (const k of order) {
    const name = teamNames[k] || ''; if (!name) continue; const teamId = nameToId.get(name); if (!teamId) continue;
    const { data: standingRow, error: standingErr } = await supabase.from('standings').select('id, wins, losses, points, point_differential').eq('league_id', leagueId).eq('team_id', teamId).maybeSingle();
    if (standingErr && (standingErr as any).code !== 'PGRST116') throw standingErr;
    if (!standingRow) {
      const { error: insErr } = await supabase.from('standings').insert({ league_id: leagueId, team_id: teamId, wins: stats[k].wins, losses: stats[k].losses, points: 0, point_differential: diff[k] }); if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase.from('standings').update({ wins: (standingRow as any).wins + stats[k].wins, losses: (standingRow as any).losses + stats[k].losses, points: (standingRow as any).points, point_differential: (standingRow as any).point_differential + diff[k] }).eq('id', (standingRow as any).id); if (updErr) throw updErr;
    }
  }
  await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });
  await applyEliteThreeTeamMovementAfterStandings({ leagueId, weekNumber, tierNumber, isTopTier, isBottomTier: pointsTierOffset === 0, teamNames, sortedKeys: sorted as any });

  // Safety fallback for elite 3-team respecting odd/even cross-tier rules
  try {
    const destWeek = weekNumber + 1;
    const isOdd = (weekNumber % 2) === 1;
    const winner = sorted[0] as 'A'|'B'|'C';
    const neutral = sorted[1] as 'A'|'B'|'C';
    const loser = sorted[2] as 'A'|'B'|'C';

    type Assignment = { tier: number; pos: 'A'|'B'|'C'; name: string | null };
    const assignments: Assignment[] = [];
    if (isOdd) {
      assignments.push({ tier: tierNumber, pos: 'A', name: teamNames[winner] || null });
      assignments.push({ tier: tierNumber, pos: 'B', name: teamNames[neutral] || null });
      assignments.push({ tier: tierNumber, pos: 'C', name: teamNames[loser] || null });
    } else {
      assignments.push({ tier: isTopTier ? tierNumber : Math.max(1, tierNumber - 1), pos: isTopTier ? 'A' : 'B', name: teamNames[winner] || null });
      assignments.push({ tier: tierNumber, pos: 'B', name: teamNames[neutral] || null });
      assignments.push({ tier: (pointsTierOffset === 0) ? tierNumber : tierNumber + 1, pos: (pointsTierOffset === 0) ? 'C' : 'A', name: teamNames[loser] || null });
    }

    try {
      // Optional debug
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env: any = (import.meta as any)?.env;
      if (env?.VITE_DEBUG_MOVEMENT) {
        console.info('[Elite3-6 fallback]', `W${weekNumber}->W${destWeek} T${tierNumber}`, assignments);
      }
    } catch {/* ignore */}

    for (const a of assignments) {
      if (!a.name) continue;
      // Ensure row exists; if missing, create from current week template
      let { data: row } = await supabase
        .from('weekly_schedules')
        .select('id, tier_number, location, time_slot, court, format, team_a_name, team_b_name, team_c_name')
        .eq('league_id', leagueId)
        .eq('week_number', destWeek)
        .eq('tier_number', a.tier)
        .maybeSingle();
      if (!row) {
        const { data: tmpl } = await supabase
          .from('weekly_schedules')
          .select('location,time_slot,court,format')
          .eq('league_id', leagueId)
          .eq('week_number', weekNumber)
          .eq('tier_number', a.tier)
          .maybeSingle();
        const insertPayload: any = {
          league_id: leagueId,
          week_number: destWeek,
          tier_number: a.tier,
          location: (tmpl as any)?.location || 'TBD',
          time_slot: (tmpl as any)?.time_slot || 'TBD',
          court: (tmpl as any)?.court || 'TBD',
          format: (tmpl as any)?.format || '3-teams-elite-6-sets',
          team_a_name: null, team_b_name: null, team_c_name: null,
        };
        await supabase.from('weekly_schedules').insert([insertPayload]);
        const { data: reread } = await supabase
          .from('weekly_schedules')
          .select('id, team_a_name, team_b_name, team_c_name')
          .eq('league_id', leagueId)
          .eq('week_number', destWeek)
          .eq('tier_number', a.tier)
          .maybeSingle();
        row = reread as any;
      }
      // Clear duplicates of this name across dest week A/B/C
      const { data: rowsToClear } = await supabase
        .from('weekly_schedules')
        .select('id, team_a_name, team_b_name, team_c_name')
        .eq('league_id', leagueId)
        .eq('week_number', destWeek);
      for (const r of rowsToClear || []) {
        const updates: Record<string, any> = {};
        (['a','b','c'] as const).forEach((p) => {
          const key2 = `team_${p}_name` as const;
          if (((r as any)[key2] as string | null) === a.name) updates[key2] = null;
        });
        if (Object.keys(updates).length) {
          await supabase.from('weekly_schedules').update(updates).eq('id', (r as any).id);
        }
      }

      const key = `team_${a.pos.toLowerCase()}_name` as 'team_a_name'|'team_b_name'|'team_c_name';
      const update: any = { [key]: a.name, updated_at: new Date().toISOString() };
      const { error: updErr } = await supabase.from('weekly_schedules').update(update).eq('id', (row as any).id);
      try { if (!updErr) { const env: any = (import.meta as any)?.env; if (env?.VITE_DEBUG_MOVEMENT) console.info('[Elite3-6 fallback][placed]', a); } } catch {/* ignore */}
    }
  } catch {/* ignore */}
}

export async function submitThreeTeamEliteNineScoresAndMove(params: SubmitThreeTeamEliteParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, sets, spares, isTopTier, pointsTierOffset } = params;
  type ABC = 'A'|'B'|'C';
  // Group sets by pairing and apply best-of-3 per pairing
  const PAIRS: Array<[ABC,ABC]> = [['A','C'], ['A','B'], ['B','C']];
  const pairWins = new Map<string, { left: ABC; right: ABC; leftWins: number; rightWins: number; diff: number }>();
  const keyFor = (L:ABC,R:ABC) => `${L}-${R}`;
  for (const [L,R] of PAIRS) pairWins.set(keyFor(L,R), { left: L, right: R, leftWins: 0, rightWins: 0, diff: 0 });

  const addSet = (L:ABC,R:ABC, sL?: string, sR?: string, isDecider=false) => {
    const k = keyFor(L,R); const rec = pairWins.get(k)!;
    const l = sL ?? '', r = sR ?? '';
    if (l === '' || r === '') return false;
    const nL = Number(l), nR = Number(r);
    if (Number.isNaN(nL) || Number.isNaN(nR) || nL === nR) return false;
    rec.diff += (nL - nR);
    if (nL > nR) rec.leftWins++; else rec.rightWins++;
    return true;
  };

  // Consume incoming sets in order, applying per-pair Bo3 (stop after 2 wins)
  const stats: Record<ABC, { matchWins: number; matchLosses: number; pf: number; pa: number }> = { A:{matchWins:0,matchLosses:0,pf:0,pa:0}, B:{matchWins:0,matchLosses:0,pf:0,pa:0}, C:{matchWins:0,matchLosses:0,pf:0,pa:0} };
  // Helper to accumulate pf/pa only from considered sets
  const applyPFPA = (L:ABC,R:ABC, sL?: string, sR?: string) => {
    const l = sL ?? '', r = sR ?? '';
    if (l === '' || r === '') return;
    const nL = Number(l), nR = Number(r);
    if (Number.isNaN(nL) || Number.isNaN(nR) || nL === nR) return;
    stats[L].pf += nL; stats[L].pa += nR; stats[R].pf += nR; stats[R].pa += nL;
  };

  // Iterate three pairings in expected order; for each, scan corresponding sets by label
  const byLabel = new Map(sets.map(s => [s.label, s] as const));
  const setLabels = (L:ABC,R:ABC) => [
    `${L} vs ${R} (Set 1)`, `${L} vs ${R} (Set 2)`, `${L} vs ${R} (Set 3)`,
  ];
  for (const [L,R] of PAIRS) {
    let lWins = 0, rWins = 0;
    const labels = setLabels(L,R);
    for (let i = 0; i < labels.length; i++) {
      if (lWins === 2 || rWins === 2) break;
      const row = byLabel.get(labels[i]);
      if (!row) continue;
      const sL = (row.scores as any)[L] ?? '';
      const sR = (row.scores as any)[R] ?? '';
      const added = addSet(L,R,sL,sR, i===2);
      if (added) {
        applyPFPA(L,R,sL,sR);
        const rec = pairWins.get(keyFor(L,R))!;
        lWins = rec.leftWins; rWins = rec.rightWins;
      }
    }
    // award match win/loss
    if (lWins !== rWins) {
      if (lWins > rWins) { stats[L].matchWins++; stats[R].matchLosses++; }
      else { stats[R].matchWins++; stats[L].matchLosses++; }
    }
  }

  const diff: Record<ABC, number> = { A: stats.A.pf - stats.A.pa, B: stats.B.pf - stats.B.pa, C: stats.C.pf - stats.C.pa };
  const order: ABC[] = ['A','B','C'];
  const tieGroupSize = (w: number) => order.filter(t => stats[t].matchWins === w).length;
  const getH2H = (X: ABC, Y: ABC) => {
    const k1 = keyFor(X,Y), k2 = keyFor(Y,X);
    if (pairWins.has(k1)) return (pairWins.get(k1)!.diff);
    if (pairWins.has(k2)) return -(pairWins.get(k2)!.diff);
    return 0;
  };
  const sorted = [...order].sort((x,y)=> {
    if (stats[y].matchWins !== stats[x].matchWins) return stats[y].matchWins - stats[x].matchWins;
    const size = tieGroupSize(stats[x].matchWins);
    if (size === 2) {
      const h2h = getH2H(x,y);
      if (h2h !== 0) return h2h > 0 ? -1 : 1;
    }
    return order.indexOf(x) - order.indexOf(y);
  });

  const matchDetails = { spares, sets: sets.map(s=>({label:s.label, teams:s.teams, scores:s.scores})) };
  for (const k of order) {
    const teamName = teamNames[k] || '';
    if (!teamName) continue;
    const payload: any = {
      league_id: leagueId, week_number: weekNumber, tier_number: tierNumber,
      team_name: teamName, wins: stats[k].matchWins, losses: stats[k].matchLosses,
      sets_won: 0, sets_lost: 0, points_for: stats[k].pf, points_against: stats[k].pa,
      tier_position: (sorted.indexOf(k)+1), league_points: 0, match_details: matchDetails,
    };
    const { error: upErr } = await supabase.from('game_results').upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
    if (upErr) throw upErr;
  }
  await supabase.from('weekly_schedules').update({ is_completed: true }).eq('id', tierId);

  const { data: teamsRows } = await supabase.from('teams').select('id, name').eq('league_id', leagueId).in('name', order.map(k=>teamNames[k]).filter(Boolean));
  const nameToId = new Map<string, number>(); (teamsRows||[]).forEach((t:any)=>nameToId.set(t.name,t.id));
  for (const k of order) {
    const name = teamNames[k] || ''; if (!name) continue; const teamId = nameToId.get(name); if (!teamId) continue;
    const { data: standingRow, error: standingErr } = await supabase.from('standings').select('id, wins, losses, points, point_differential').eq('league_id', leagueId).eq('team_id', teamId).maybeSingle();
    if (standingErr && (standingErr as any).code !== 'PGRST116') throw standingErr;
    if (!standingRow) {
      const { error: insErr } = await supabase.from('standings').insert({ league_id: leagueId, team_id: teamId, wins: stats[k].matchWins, losses: stats[k].matchLosses, points: 0, point_differential: diff[k] }); if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase.from('standings').update({ wins: (standingRow as any).wins + stats[k].matchWins, losses: (standingRow as any).losses + stats[k].matchLosses, points: (standingRow as any).points, point_differential: (standingRow as any).point_differential + diff[k] }).eq('id', (standingRow as any).id); if (updErr) throw updErr;
    }
  }
  await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });
  await applyEliteThreeTeamMovementAfterStandings({ leagueId, weekNumber, tierNumber, isTopTier, isBottomTier: pointsTierOffset === 0, teamNames, sortedKeys: sorted as any });

  // Safety fallback for elite 3-team (9 sets) respecting odd/even cross-tier rules
  try {
    const destWeek = weekNumber + 1;
    const isOdd = (weekNumber % 2) === 1;
    const winner = sorted[0] as 'A'|'B'|'C';
    const neutral = sorted[1] as 'A'|'B'|'C';
    const loser = sorted[2] as 'A'|'B'|'C';

    type Assignment = { tier: number; pos: 'A'|'B'|'C'; name: string | null };
    const assignments: Assignment[] = [];
    if (isOdd) {
      assignments.push({ tier: tierNumber, pos: 'A', name: teamNames[winner] || null });
      assignments.push({ tier: tierNumber, pos: 'B', name: teamNames[neutral] || null });
      assignments.push({ tier: tierNumber, pos: 'C', name: teamNames[loser] || null });
    } else {
      assignments.push({ tier: isTopTier ? tierNumber : Math.max(1, tierNumber - 1), pos: isTopTier ? 'A' : 'B', name: teamNames[winner] || null });
      assignments.push({ tier: tierNumber, pos: 'B', name: teamNames[neutral] || null });
      assignments.push({ tier: (pointsTierOffset === 0) ? tierNumber : tierNumber + 1, pos: (pointsTierOffset === 0) ? 'C' : 'A', name: teamNames[loser] || null });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env: any = (import.meta as any)?.env;
      if (env?.VITE_DEBUG_MOVEMENT) {
        console.info('[Elite3-9 fallback]', `W${weekNumber}->W${destWeek} T${tierNumber}`, assignments);
      }
    } catch {/* ignore */}

    for (const a of assignments) {
      if (!a.name) continue;
      const { data: row } = await supabase
        .from('weekly_schedules')
        .select('id, team_a_name, team_b_name, team_c_name')
        .eq('league_id', leagueId)
        .eq('week_number', destWeek)
        .eq('tier_number', a.tier)
        .maybeSingle();
      if (!row) continue;
      const key = `team_${a.pos.toLowerCase()}_name` as 'team_a_name'|'team_b_name'|'team_c_name';
      const update: any = { [key]: a.name, updated_at: new Date().toISOString() };
      const { error: updErr } = await supabase.from('weekly_schedules').update(update).eq('id', (row as any).id);
      try { if (!updErr) { const env: any = (import.meta as any)?.env; if (env?.VITE_DEBUG_MOVEMENT) console.info('[Elite3-9 fallback][placed]', a); } } catch {/* ignore */}
    }
  } catch {/* ignore */}
}

// ======================================================
// 4-TEAM HEAD-TO-HEAD SUBMISSION
// ======================================================
type ABCD = 'A'|'B'|'C'|'D';

export interface SubmitFourTeamParams {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  tierId: number;
  teamNames: Record<ABCD, string>;
  game1: {
    court1: Array<{ label: string; scores: Record<'A'|'B', string> }>;
    court2: Array<{ label: string; scores: Record<'C'|'D', string> }>;
  };
  game2: {
    court1: Array<{ label: string; scores: Record<'WC1'|'WC2', string> }>;
    court2: Array<{ label: string; scores: Record<'LC1'|'LC2', string> }>;
  };
  pointsTierOffset: number;
  isTopTier: boolean;
}

export interface SubmitSixTeamParams {
  leagueId: number;
  weekNumber: number;
  tierNumber: number;
  tierId: number;
  teamNames: Record<SixTeamKey, string>;
  game1: {
    court1: Array<{ label: string; scores: Record<'A'|'B', string> }>;
    court2: Array<{ label: string; scores: Record<'C'|'D', string> }>;
    court3: Array<{ label: string; scores: Record<'E'|'F', string> }>;
  };
  game2: {
    court1: Array<{ label: string; scores: Record<'G2C1_L'|'G2C1_R', string> }>;
    court2: Array<{ label: string; scores: Record<'G2C2_L'|'G2C2_R', string> }>;
    court3: Array<{ label: string; scores: Record<'G2C3_L'|'G2C3_R', string> }>;
  };
  spares: Record<SixTeamKey, string>;
  pointsTierOffset: number;
  isTopTier: boolean;
}

export async function submitSixTeamHeadToHeadScoresAndMove(params: SubmitSixTeamParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, game1, game2, spares, pointsTierOffset, isTopTier } = params;

  console.log('6-team submission params:', {
    tierNumber,
    pointsTierOffset,
    isTopTier,
    expectedBonus: pointsTierOffset * 5,
    isBottomTier: pointsTierOffset === 0,
  });

  type Totals = { setWins: number; setLosses: number; pf: number; pa: number };
  const totals: Record<SixTeamKey, Totals> = {
    A: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    B: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    C: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    D: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    E: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
    F: { setWins: 0, setLosses: 0, pf: 0, pa: 0 },
  };

  type PairStat = { left: SixTeamKey; right: SixTeamKey; leftWins: number; rightWins: number; diff: number };
  const makePair = (left: SixTeamKey, right: SixTeamKey): PairStat => ({ left, right, leftWins: 0, rightWins: 0, diff: 0 });

  // Track Game 2-only points for differential display in standings
  const g2: Record<SixTeamKey, { pf: number; pa: number }> = {
    A: { pf: 0, pa: 0 },
    B: { pf: 0, pa: 0 },
    C: { pf: 0, pa: 0 },
    D: { pf: 0, pa: 0 },
    E: { pf: 0, pa: 0 },
    F: { pf: 0, pa: 0 },
  };

  const applySet = (
    leftKey: SixTeamKey,
    rightKey: SixTeamKey,
    rawLeft: string | undefined,
    rawRight: string | undefined,
    pair: PairStat,
    context: string,
    isGame2 = false,
  ) => {
    const left = rawLeft ?? '';
    const right = rawRight ?? '';
    if (left === '' || right === '') {
      throw new Error(`Incomplete 6-team head-to-head scorecard: missing scores for ${context}`);
    }
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) {
      throw new Error(`Invalid numeric value in 6-team head-to-head scorecard (${context})`);
    }
    if (leftNum === rightNum) {
      throw new Error(`Tied set detected in 6-team head-to-head scorecard (${context})`);
    }

    totals[leftKey].pf += leftNum;
    totals[leftKey].pa += rightNum;
    totals[rightKey].pf += rightNum;
    totals[rightKey].pa += leftNum;
    if (isGame2) {
      g2[leftKey].pf += leftNum; g2[leftKey].pa += rightNum;
      g2[rightKey].pf += rightNum; g2[rightKey].pa += leftNum;
    }

    if (leftNum > rightNum) {
      totals[leftKey].setWins += 1;
      totals[rightKey].setLosses += 1;
      pair.leftWins += 1;
    } else {
      totals[rightKey].setWins += 1;
      totals[leftKey].setLosses += 1;
      pair.rightWins += 1;
    }

    pair.diff += leftNum - rightNum;
  };

  const pairC1 = makePair('A', 'B');
  const pairC2 = makePair('C', 'D');
  const pairC3 = makePair('E', 'F');

  game1.court1.forEach((row, idx) => applySet('A', 'B', row.scores?.A, row.scores?.B, pairC1, `Game 1 Court 1 Set ${idx + 1}`));
  game1.court2.forEach((row, idx) => applySet('C', 'D', row.scores?.C, row.scores?.D, pairC2, `Game 1 Court 2 Set ${idx + 1}`));
  game1.court3.forEach((row, idx) => applySet('E', 'F', row.scores?.E, row.scores?.F, pairC3, `Game 1 Court 3 Set ${idx + 1}`));

  const decidePair = (pair: PairStat): { winner: SixTeamKey; loser: SixTeamKey } => {
    if (pair.leftWins !== pair.rightWins) {
      return pair.leftWins > pair.rightWins
        ? { winner: pair.left, loser: pair.right }
        : { winner: pair.right, loser: pair.left };
    }
    if (pair.diff !== 0) {
      return pair.diff > 0
        ? { winner: pair.left, loser: pair.right }
        : { winner: pair.right, loser: pair.left };
    }
    // Fall back to positional priority (left beats right) to mirror scorecard tie-breaker
    return { winner: pair.left, loser: pair.right };
  };

  const g1c1 = decidePair(pairC1);
  const g1c2 = decidePair(pairC2);
  const g1c3 = decidePair(pairC3);

  const pairG2C1 = makePair(g1c1.winner, g1c2.winner);
  const pairG2C2 = makePair(g1c1.loser, g1c3.winner);
  const pairG2C3 = makePair(g1c2.loser, g1c3.loser);

  game2.court1.forEach((row, idx) => applySet(g1c1.winner, g1c2.winner, row.scores?.G2C1_L, row.scores?.G2C1_R, pairG2C1, `Game 2 Court 1 Set ${idx + 1}`, true));
  game2.court2.forEach((row, idx) => applySet(g1c1.loser, g1c3.winner, row.scores?.G2C2_L, row.scores?.G2C2_R, pairG2C2, `Game 2 Court 2 Set ${idx + 1}`, true));
  game2.court3.forEach((row, idx) => applySet(g1c2.loser, g1c3.loser, row.scores?.G2C3_L, row.scores?.G2C3_R, pairG2C3, `Game 2 Court 3 Set ${idx + 1}`, true));

  // Decide Game 2 winners/losers by court
  const g2c1 = decidePair(pairG2C1);
  const g2c2 = decidePair(pairG2C2);
  const g2c3 = decidePair(pairG2C3);

  // Build final placement order by courts: C1 W, C1 L, C2 W, C2 L, C3 W, C3 L
  const sortedKeys = [g2c1.winner, g2c1.loser, g2c2.winner, g2c2.loser, g2c3.winner, g2c3.loser] as SixTeamKey[];

  const teamStats = sortedKeys.map((team) => ({
    team,
    setWins: totals[team].setWins,
    setLosses: totals[team].setLosses,
    diff: totals[team].pf - totals[team].pa,
    prevPosition: team,
  }));

  const tierBonus = 5 * Math.max(0, pointsTierOffset);
  const basePoints = [8, 7, 6, 5, 4, 3];
  const weeklyLeaguePoints: Record<SixTeamKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  teamStats.forEach((teamStat, rank) => {
    weeklyLeaguePoints[teamStat.team] = basePoints[rank] + tierBonus;
  });

  console.log('Points calculation (6-team H2H):', {
    tierBonus,
    weeklyLeaguePoints,
    rankings: teamStats.map((ts, idx) => ({ rank: idx + 1, team: ts.team, name: teamNames[ts.team], points: weeklyLeaguePoints[ts.team] })),
  });

  const movementSummary = teamStats.reduce<Record<number, string>>((acc, teamStat, idx) => {
    const place = idx + 1;
    // Mapping by court-based placements
    switch (place) {
      case 1: // Court 1 winner
        acc[place] = isTopTier ? 'Stay -> A' : 'Up tier -> F';
        break;
      case 2: // Court 1 loser
        acc[place] = 'Same tier -> C';
        break;
      case 3: // Court 2 winner
        acc[place] = 'Same tier -> B';
        break;
      case 4: // Court 2 loser
        acc[place] = 'Same tier -> E';
        break;
      case 5: // Court 3 winner
        acc[place] = 'Same tier -> D';
        break;
      default: // 6: Court 3 loser
        acc[place] = pointsTierOffset === 0 ? 'Stay -> F' : 'Down tier -> A';
        break;
    }
    return acc;
  }, {});

  const matchDetails = {
    game1,
    game2,
    spares,
    teamStats: teamStats.map((ts) => ({ team: ts.team, setWins: ts.setWins, setLosses: ts.setLosses, diff: ts.diff })),
    movement: movementSummary,
  };

  const { data: prevRows } = await supabase
    .from('game_results')
    .select('team_name,wins,losses,points_for,points_against,league_points')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier_number', tierNumber);

  for (const teamStat of teamStats) {
    const teamName = teamNames[teamStat.team];
    if (!teamName) continue;

    const payload = {
      league_id: leagueId,
      week_number: weekNumber,
      tier_number: tierNumber,
      team_name: teamName,
      wins: teamStat.setWins,
      losses: teamStat.setLosses,
      // Store Game 2-only PF/PA so standings differential reflects Game 2 only when adjusted
      points_for: g2[teamStat.team].pf,
      points_against: g2[teamStat.team].pa,
      league_points: weeklyLeaguePoints[teamStat.team],
      match_details: matchDetails,
    };

    const { error: upsertErr } = await supabase
      .from('game_results')
      .upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
    if (upsertErr) throw upsertErr;
  }

  const { error: scheduleErr } = await supabase
    .from('weekly_schedules')
    .update({ is_completed: true })
    .eq('id', tierId);
  if (scheduleErr) throw scheduleErr;

  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('active', true);
  if (teamsErr) throw teamsErr;
  const nameToId = new Map<string, number>();
  (teamsRows || []).forEach((row: any) => nameToId.set(normalizeName(row.name), row.id));

  for (const teamStat of teamStats) {
    const teamName = teamNames[teamStat.team];
    const teamId = nameToId.get(normalizeName(teamName));
    if (!teamId) continue;

    const { data: standingRow, error: standingErr } = await supabase
      .from('standings')
      .select('id,wins,losses,points,point_differential')
      .eq('league_id', leagueId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (standingErr && (standingErr as any).code !== 'PGRST116') throw standingErr;

    const addWins = teamStat.setWins;
    const addLosses = teamStat.setLosses;
    // Differential should count Game 2 only
    const addDiff = g2[teamStat.team].pf - g2[teamStat.team].pa;
    const addPoints = weeklyLeaguePoints[teamStat.team];

    const prevRow = (prevRows || []).find((row: any) => row.team_name === teamName);
    const subWins = prevRow?.wins || 0;
    const subLosses = prevRow?.losses || 0;
    const subDiff = (prevRow?.points_for || 0) - (prevRow?.points_against || 0);
    const subPoints = prevRow?.league_points || 0;

    if (!standingRow) {
      const { error: insertErr } = await supabase
        .from('standings')
        .insert({
          league_id: leagueId,
          team_id: teamId,
          wins: addWins - subWins,
          losses: addLosses - subLosses,
          points: addPoints - subPoints,
          point_differential: addDiff - subDiff,
        });
      if (insertErr) throw insertErr;
    } else {
      const { error: updateErr } = await supabase
        .from('standings')
        .update({
          wins: (standingRow as any).wins - subWins + addWins,
          losses: (standingRow as any).losses - subLosses + addLosses,
          points: (standingRow as any).points - subPoints + addPoints,
          point_differential: (standingRow as any).point_differential - subDiff + addDiff,
        })
        .eq('id', (standingRow as any).id);
      if (updateErr) throw updateErr;
    }
  }

  const { error: recalcErr } = await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });
  if (recalcErr) throw recalcErr;

  await applySixTeamMovementAfterStandings({
    leagueId,
    weekNumber,
    tierNumber,
    isTopTier,
    pointsTierOffset,
    teamNames,
    teamStats,
  });
}

export async function submitFourTeamHeadToHeadScoresAndMove(params: SubmitFourTeamParams): Promise<void> {
  const { leagueId, weekNumber, tierNumber, tierId, teamNames, game1, game2, pointsTierOffset, isTopTier } = params;

  // Helper to tally a pair of sets
  const applyPair = (lKey: ABCD, rKey: ABCD, rows: Array<Record<string,string>>, stats: Record<ABCD, { setWins:number; setLosses:number; pf:number; pa:number }>) => {
    for (const row of rows) {
      const sl = row[lKey] ?? ''; const sr = row[rKey] ?? '';
      if (sl === '' || sr === '') return false;
      const nl = Number(sl), nr = Number(sr);
      if (Number.isNaN(nl) || Number.isNaN(nr) || nl === nr) return false;
      stats[lKey].pf += nl; stats[lKey].pa += nr;
      stats[rKey].pf += nr; stats[rKey].pa += nl;
      if (nl > nr) { stats[lKey].setWins++; stats[rKey].setLosses++; }
      else { stats[rKey].setWins++; stats[lKey].setLosses++; }
    }
    return true;
  };

  const stats: Record<ABCD, { setWins:number; setLosses:number; pf:number; pa:number }> = {
    A: { setWins:0, setLosses:0, pf:0, pa:0 },
    B: { setWins:0, setLosses:0, pf:0, pa:0 },
    C: { setWins:0, setLosses:0, pf:0, pa:0 },
    D: { setWins:0, setLosses:0, pf:0, pa:0 },
  };

  // Tally Game 1
  const g1c1Rows = game1.court1.map(s => ({ A: (s.scores as any).A ?? '', B: (s.scores as any).B ?? '' }));
  const g1c2Rows = game1.court2.map(s => ({ C: (s.scores as any).C ?? '', D: (s.scores as any).D ?? '' }));
  const g1done = applyPair('A','B', g1c1Rows as any, stats) && applyPair('C','D', g1c2Rows as any, stats);

  // Determine winners/losers from Game 1 for mapping
  const evalCourt = (rows: Array<Record<string,string>>, L: ABCD, R: ABCD): { winner: ABCD|null, loser: ABCD|null } => {
    let lw=0, rw=0, diff=0; for(const row of rows){ const sl = row[L]??''; const sr=row[R]??''; const nl=Number(sl), nr=Number(sr); if(sl===''||sr===''||Number.isNaN(nl)||Number.isNaN(nr)||nl===nr) return {winner:null, loser:null}; diff += (nl-nr); if(nl>nr) lw++; else rw++; }
    if (lw!==rw) return { winner: (lw>rw? L:R), loser: (lw>rw? R:L) };
    if (diff!==0) return { winner: (diff>0? L:R), loser: (diff>0? R:L) };
    return { winner:null, loser:null };
  };
  const g1c1 = evalCourt(g1c1Rows as any, 'A','B');
  const g1c2 = evalCourt(g1c2Rows as any, 'C','D');

  // Tally Game 2
  let game2Done = false;
  if (g1c1.winner && g1c2.winner && g1c1.loser && g1c2.loser) {
    const w1 = g1c1.winner, w2 = g1c2.winner, l1 = g1c1.loser, l2 = g1c2.loser;
    const g2c1Rows = game2.court1.map(s => ({ [w1]: (s.scores as any).WC1 ?? '', [w2]: (s.scores as any).WC2 ?? '' })) as any;
    const g2c2Rows = game2.court2.map(s => ({ [l1]: (s.scores as any).LC1 ?? '', [l2]: (s.scores as any).LC2 ?? '' })) as any;
    const c1Done = applyPair(w1, w2, g2c1Rows, stats);
    const c2Done = applyPair(l1, l2, g2c2Rows, stats);
    game2Done = c1Done && c2Done;
  }

  if (!g1done || !game2Done) {
    throw new Error('Incomplete 4-team scorecard');
  }

  // Compute points: Base 3/4/5/6 + 3*offset by final placements
  const base = [3,4,5,6];
  const bonus = 3 * Math.max(0, pointsTierOffset);
  // Determine final placements via Game 2 winners/losers again for ranking
  const w1 = g1c1.winner as ABCD; const l1 = g1c1.loser as ABCD; const w2 = g1c2.winner as ABCD; const l2 = g1c2.loser as ABCD;
  const scoreRows = (rows: Array<Record<string,string>>, L: ABCD, R: ABCD) => {
    let lw=0, rw=0, diff=0; for(const row of rows){ const sl=row[L]??''; const sr=row[R]??''; const nl=Number(sl), nr=Number(sr); diff += (nl-nr); if(nl>nr) lw++; else rw++; }
    if (lw!==rw) return lw>rw? L:R; return diff>0? L:R;
  };
  const g2c1Rows = game2.court1.map(s => ({ [w1]: (s.scores as any).WC1 ?? '', [w2]: (s.scores as any).WC2 ?? '' })) as any;
  const g2c2Rows = game2.court2.map(s => ({ [l1]: (s.scores as any).LC1 ?? '', [l2]: (s.scores as any).LC2 ?? '' })) as any;
  const c1Winner = scoreRows(g2c1Rows, w1, w2);
  const c1Loser = c1Winner === w1 ? w2 : w1;
  const c2Winner = scoreRows(g2c2Rows, l1, l2);
  const c2Loser = c2Winner === l1 ? l2 : l1;
  const points: Record<ABCD, number> = { A:0,B:0,C:0,D:0 };
  points[c2Loser] = base[0] + bonus; // 4th
  points[c2Winner] = base[1] + bonus; // 3rd
  points[c1Loser] = base[2] + bonus;  // 2nd
  points[c1Winner] = base[3] + bonus; // 1st

  const matchDetails = { game1, game2 } as any;

  // Snapshot previous rows
  const { data: prevRows } = await supabase
    .from('game_results')
    .select('team_name,wins,losses,points_for,points_against,league_points')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier_number', tierNumber);

  const prevStats: Record<ABCD, { wins:number; losses:number; diff:number }> = { A:{wins:0,losses:0,diff:0}, B:{wins:0,losses:0,diff:0}, C:{wins:0,losses:0,diff:0}, D:{wins:0,losses:0,diff:0} };
  const nameToKey = new Map<string, ABCD>([[teamNames.A,'A'],[teamNames.B,'B'],[teamNames.C,'C'],[teamNames.D,'D']]);
  (prevRows||[]).forEach((r:any)=>{ const k=nameToKey.get(r.team_name); if(!k) return; prevStats[k].wins=r.wins||0; prevStats[k].losses=r.losses||0; const pf=r.points_for||0, pa=r.points_against||0; prevStats[k].diff = pf-pa; });

  // Upsert game_results
  for (const k of (['A','B','C','D'] as ABCD[])) {
    const tname = teamNames[k]; if (!tname) continue;
    const payload: any = {
      league_id: leagueId,
      week_number: weekNumber,
      tier_number: tierNumber,
      team_name: tname,
      wins: stats[k].setWins,
      losses: stats[k].setLosses,
      sets_won: stats[k].setWins,
      sets_lost: stats[k].setLosses,
      points_for: stats[k].pf,
      points_against: stats[k].pa,
      tier_position: 0,
      league_points: points[k],
      match_details: matchDetails,
    };
    const { error: upErr } = await supabase
      .from('game_results')
      .upsert(payload, { onConflict: 'league_id,week_number,tier_number,team_name', ignoreDuplicates: false });
    if (upErr) throw upErr;
  }

  // Mark weekly tier completed
  await supabase.from('weekly_schedules').update({ is_completed: true }).eq('id', tierId);

  // Update standings
  const { data: teamsRows, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .in('name', (['A','B','C','D'] as ABCD[]).map(k => teamNames[k]).filter(Boolean));
  if (teamsErr) throw teamsErr;
  const nmToId = new Map<string, number>(); (teamsRows||[]).forEach((t:any)=>nmToId.set(t.name,t.id));

  for (const k of (['A','B','C','D'] as ABCD[])) {
    const name = teamNames[k]; if (!name) continue; const teamId = nmToId.get(name); if (!teamId) continue;
    const { data: standingRow, error: standingErr } = await supabase
      .from('standings')
      .select('id, wins, losses, points, point_differential')
      .eq('league_id', leagueId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (standingErr && (standingErr as any).code !== 'PGRST116') throw standingErr;

    const addWins = stats[k].setWins, addLosses = stats[k].setLosses, addDiff = stats[k].pf - stats[k].pa, addPoints = points[k];
    const prevRowForTeam = (prevRows||[]).find((r:any)=>r.team_name===name);
    const subPoints = prevRowForTeam && typeof prevRowForTeam.league_points==='number'? prevRowForTeam.league_points : 0;

    if (!standingRow) {
      const { error: insErr } = await supabase.from('standings').insert({
        league_id: leagueId, team_id: teamId, wins: addWins, losses: addLosses, points: addPoints - subPoints, point_differential: addDiff,
      }); if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase.from('standings').update({
        wins: (standingRow as any).wins + addWins,
        losses: (standingRow as any).losses + addLosses,
        points: (standingRow as any).points - subPoints + addPoints,
        point_differential: (standingRow as any).point_differential + addDiff,
      }).eq('id', (standingRow as any).id); if (updErr) throw updErr;
    }
  }

  // Recalc positions and apply movement
  await supabase.rpc('recalculate_standings_positions', { p_league_id: leagueId });

  await applyFourTeamMovementAfterStandings({
    leagueId,
    weekNumber,
    tierNumber,
    isTopTier,
    pointsTierOffset,
    teamNames,
    game1,
    game2,
  });
}






