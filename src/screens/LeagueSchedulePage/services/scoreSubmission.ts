import { supabase } from '../../../lib/supabase';
import { applyMovementAfterStandings, applyTwoTeamMovementAfterStandings } from './movement';
import { applyFourTeamMovementAfterStandings } from './movement';

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

  // Update standings with deltas
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

  // Update standings deltas
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
