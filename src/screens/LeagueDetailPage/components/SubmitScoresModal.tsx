import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import type { WeeklyScheduleTier } from '../../LeagueSchedulePage/types';
import { Scorecard3Teams6Sets } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard3Teams6Sets';
import { Scorecard4TeamsHeadToHead } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard4TeamsHeadToHead';
import { Scorecard2Teams4Sets } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard2Teams4Sets';
import { Scorecard2TeamsBestOf5 } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard2TeamsBestOf5';
import { Scorecard6TeamsHeadToHead } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard6TeamsHeadToHead';
import { Scorecard2TeamsEliteBestOf5 } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard2TeamsEliteBestOf5';
import { Scorecard3TeamsElite9Sets } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard3TeamsElite9Sets';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { submitThreeTeamScoresAndMove, submitTwoTeamScoresAndMove, submitTwoTeamBestOf5ScoresAndMove, submitFourTeamHeadToHeadScoresAndMove, submitSixTeamHeadToHeadScoresAndMove, submitTwoTeamEliteBestOf5ScoresAndMove, submitThreeTeamEliteSixScoresAndMove, submitThreeTeamEliteNineScoresAndMove } from '../../LeagueSchedulePage/services/scoreSubmission';
import { getTierDisplayLabel } from '../../LeagueSchedulePage/utils/formatUtils';
import { getFormatLabel } from '../../LeagueSchedulePage/utils/formatUtils';

interface SubmitScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyTier: WeeklyScheduleTier;
  onSuccess?: () => void; // notify parent to refresh state after success
}

export function SubmitScoresModal({ isOpen, onClose, weeklyTier, onSuccess }: SubmitScoresModalProps) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const teamNames = {
    A: (weeklyTier as any).team_a_name || '',
    B: (weeklyTier as any).team_b_name || '',
    C: (weeklyTier as any).team_c_name || '',
  } as const;

  const [pointsOffset, setPointsOffset] = useState<number>(0);
  const [isTopTier, setIsTopTier] = useState<boolean>(false);
  const [resultsLabel, setResultsLabel] = useState<string>('Weekly Summary');
  const [saving, setSaving] = useState<boolean>(false);
  const [initialSets, setInitialSets] = useState<any[] | undefined>(undefined);
  const [initialSpares, setInitialSpares] = useState<Record<'A'|'B'|'C', string> | undefined>(undefined);
  const [initialH2H, setInitialH2H] = useState<{
    game1?: {
      court1?: Array<{ label: string; scores: Record<'A'|'B', string> }>;
      court2?: Array<{ label: string; scores: Record<'C'|'D', string> }>;
      court3?: Array<{ label: string; scores: Record<'E'|'F', string> }>;
    };
    game2?: {
      court1?: Array<{ label: string; scores: Record<'G2C1_L'|'G2C1_R', string> }>;
      court2?: Array<{ label: string; scores: Record<'G2C2_L'|'G2C2_R', string> }>;
      court3?: Array<{ label: string; scores: Record<'G2C3_L'|'G2C3_R', string> }>;
    };
    spares?: Record<'A'|'B'|'C'|'D'|'E'|'F', string>;
  } | undefined>(undefined);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null);

  useEffect(() => {
    const fetchMaxTier = async () => {
      try {
        const leagueId = (weeklyTier as any).league_id as number | undefined;
        const week = (weeklyTier as any).week_number as number | undefined;
        if (!leagueId || !week) {
          setPointsOffset(0);
          setIsTopTier((weeklyTier.tier_number || 1) === 1);
          setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''}`);
          return;
        }
        // Prefill from existing game_results if present
        try {
          const { data: existing } = await supabase
            .from('game_results')
            .select('match_details')
            .eq('league_id', leagueId)
            .eq('week_number', week)
            .eq('tier_number', (weeklyTier as any).tier_number)
            .limit(1);
          const md = (existing && existing[0] && (existing[0] as any).match_details) || null;
          if (md) {
            if (md.sets) setInitialSets(md.sets);
            if (md.spares) setInitialSpares(md.spares);
            if (md.game1 || md.game2) setInitialH2H({ game1: md.game1, game2: md.game2 });
          }
        } catch {/* ignore */}
        const { data, error } = await supabase
          .from('weekly_schedules')
          .select('tier_number')
          .eq('league_id', leagueId)
          .eq('week_number', week);
        if (error) throw error;
        const maxTier = Math.max(
          weeklyTier.tier_number || 1,
          ...((data || []).map(r => (r as any).tier_number as number) || [1])
        );
        const offset = Math.max(0, (maxTier - (weeklyTier.tier_number || 1)));
        setPointsOffset(offset);
        setIsTopTier((weeklyTier.tier_number || 1) === 1);

        // Compute results label date
        const { data: leagueRow } = await supabase
          .from('leagues')
          .select('start_date')
          .eq('id', leagueId)
          .single();
        if (leagueRow?.start_date) {
          const start = new Date(leagueRow.start_date + 'T00:00:00');
          const weekDate = new Date(start);
          weekDate.setDate(start.getDate() + ((week ?? 1) - 1) * 7);
          const formatted = weekDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''} - ${formatted}`);
          // Compute current week number from start date
          const now = new Date();
          const diffMs = now.getTime() - start.getTime();
          const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1;
          setCurrentWeekNumber(Math.max(1, weeks));
        } else {
          setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''}`);
          setCurrentWeekNumber(null);
        }
      } catch {
        setPointsOffset(0);
        setIsTopTier((weeklyTier.tier_number || 1) === 1);
        setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''}`);
      }
    };
    fetchMaxTier();
  }, [weeklyTier]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="submit-scores-description">
        <DialogHeader>
          <div className="flex items-start justify-between max-w-xl">
            <DialogTitle className="pr-3">Submit Scores - Tier {getTierDisplayLabel(weeklyTier.format, weeklyTier.tier_number ?? 0)}</DialogTitle>
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300 whitespace-normal leading-tight max-w-[12rem]">
              {getFormatLabel(String(weeklyTier.format || ''))}
            </span>
          </div>
        </DialogHeader>

        <div className="py-2">
          {weeklyTier.format === '3-teams-6-sets' ? (
            <Scorecard3Teams6Sets
              teamNames={teamNames as any}
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              tierNumber={weeklyTier.tier_number}
              resultsLabel={resultsLabel}
              initialSets={initialSets as any}
              initialSpares={initialSpares as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, sets, spares }) => {
                try {
                  setSaving(true);
                  // Enforce admin/facilitator permissions client-side as well
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    setSaving(false);
                    return;
                  }

                  const leagueId = (weeklyTier as any).league_id as number | undefined;
                  const weekNumber = (weeklyTier as any).week_number as number | undefined;
                  const tierNumber = weeklyTier.tier_number as number | undefined;
                  if (!leagueId || !weekNumber || !tierNumber) {
                    showToast('Missing league/week/tier context for submission.', 'error');
                    setSaving(false);
                    return;
                  }
                  // Editing window validation: allow edits only for previous week (no older than currentWeek-1)
                  // First submission is always allowed; edits are when prior results exist
                  const { data: existingRows } = await supabase
                    .from('game_results')
                    .select('id')
                    .eq('league_id', leagueId)
                    .eq('week_number', weekNumber)
                    .eq('tier_number', tierNumber)
                    .limit(1);
                  const isEditAttempt = (existingRows && existingRows.length > 0);
                  if (isEditAttempt && typeof currentWeekNumber === 'number' && weekNumber < (currentWeekNumber - 1)) {
                    showToast('Editing is restricted to the previous week only.', 'error');
                    setSaving(false);
                    return;
                  }

                  type TeamKey = 'A' | 'B' | 'C';
                  const teamKeys: TeamKey[] = ['A', 'B', 'C'];

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

                  // Rank teams (wins desc, differential desc, A/B/C order as tiebreaker)
                  const diff: Record<TeamKey, number> = {
                    A: stats.A.pf - stats.A.pa,
                    B: stats.B.pf - stats.B.pa,
                    C: stats.C.pf - stats.C.pa,
                  };
                  const sorted = [...teamKeys].sort((x, y) => {
                    if (stats[y].setWins !== stats[x].setWins) return stats[y].setWins - stats[x].setWins;
                    if (diff[y] !== diff[x]) return diff[y] - diff[x];
                    return teamKeys.indexOf(x) - teamKeys.indexOf(y);
                  });

                  // Determine roles and weekly league points (5/4/3 + 2*pointsOffset bonus)
                  const role: Record<TeamKey, 'winner' | 'neutral' | 'loser'> = { A: 'neutral', B: 'neutral', C: 'neutral' };
                  role[sorted[0]] = 'winner'; role[sorted[2]] = 'loser';
                  const basePoints: Record<'winner' | 'neutral' | 'loser', number> = { winner: 5, neutral: 4, loser: 3 };
                  const tierBonus = 2 * Math.max(0, pointsOffset);
                  const weeklyLeaguePoints: Record<TeamKey, number> = { A: 0, B: 0, C: 0 };
                  teamKeys.forEach((k) => { weeklyLeaguePoints[k] = basePoints[role[k]] + tierBonus; });

                  // Build match_details JSON to store spares + raw sets
                  const matchDetails = {
                    spares,
                    sets: sets.map(s => ({ label: s.label, teams: s.teams, scores: s.scores }))
                  };

                  // Snapshot previous results BEFORE upserting new results
                  const { data: prevRows } = await supabase
                    .from('game_results')
                    .select('team_name,wins,losses,points_for,points_against,league_points')
                    .eq('league_id', leagueId)
                    .eq('week_number', weekNumber)
                    .eq('tier_number', tierNumber);
                  const prevStats: Record<'A'|'B'|'C', { wins: number; losses: number; diff: number }> = { A: { wins:0, losses:0, diff:0 }, B:{wins:0,losses:0,diff:0}, C:{wins:0,losses:0,diff:0} };
                  const nameToKey = new Map<string, 'A'|'B'|'C'>([
                    [ (submittedNames as any).A || (teamNames as any).A || '', 'A'],
                    [ (submittedNames as any).B || (teamNames as any).B || '', 'B'],
                    [ (submittedNames as any).C || (teamNames as any).C || '', 'C'],
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
                  const prevSorted = [...teamKeys].sort((x, y) => {
                    if (prevStats[y].wins !== prevStats[x].wins) return prevStats[y].wins - prevStats[x].wins;
                    if (prevStats[y].diff !== prevStats[x].diff) return prevStats[y].diff - prevStats[x].diff;
                    return ['A','B','C'].indexOf(x) - ['A','B','C'].indexOf(y);
                  });
                  const prevRole: Record<'A'|'B'|'C','winner'|'neutral'|'loser'> = { A:'neutral', B:'neutral', C:'neutral' };
                  if (prevRows && prevRows.length) { prevRole[prevSorted[0]]='winner'; prevRole[prevSorted[2]]='loser'; }
                  const prevBasePoints: Record<'winner'|'neutral'|'loser', number> = { winner:5, neutral:4, loser:3 };
                  const prevBonus = 2 * Math.max(0, pointsOffset);
                  const prevPoints: Record<'A'|'B'|'C', number> = { A: prevBasePoints[prevRole.A]+prevBonus, B: prevBasePoints[prevRole.B]+prevBonus, C: prevBasePoints[prevRole.C]+prevBonus };

                  // Upsert per-team game_results
                  for (let i = 0; i < teamKeys.length; i++) {
                    const k = teamKeys[i];
                    const teamName = (submittedNames as any)[k] || (teamNames as any)[k] || '';
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


                  // Mark this weekly tier as completed
                  await supabase
                    .from('weekly_schedules')
                    .update({ is_completed: true })
                    .eq('id', (weeklyTier as any).id);

                  // Update standings: add setWins/setLosses as wins/losses, diff as point_differential, and weekly points
                  // Map team names to team_ids
                  const { data: teamsRows, error: teamsErr } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('league_id', leagueId)
                    .in('name', teamKeys.map(k => (submittedNames as any)[k] || (teamNames as any)[k]).filter(Boolean));
                  if (teamsErr) throw teamsErr;
                  const nameToId = new Map<string, number>();
                  (teamsRows || []).forEach((t: any) => nameToId.set(t.name, t.id));

                  for (const k of teamKeys) {
                    const name = (submittedNames as any)[k] || (teamNames as any)[k] || '';
                    if (!name) continue;
                    const teamId = nameToId.get(name);
                    if (!teamId) continue;

                    // Try fetch existing standing
                    const { data: standingRow, error: standingErr } = await supabase
                      .from('standings')
                      .select('id, wins, losses, points, point_differential')
                      .eq('league_id', leagueId)
                      .eq('team_id', teamId)
                      .maybeSingle();
                    if (standingErr && standingErr.code !== 'PGRST116') throw standingErr;

                    const addWins = stats[k].setWins;
                    const addLosses = stats[k].setLosses;
                    const addDiff = diff[k];
                    const addPoints = weeklyLeaguePoints[k];
                    const subWins = prevStats[k].wins || 0;
                    const subLosses = prevStats[k].losses || 0;
                    const subDiff = prevStats[k].diff || 0;
                    // Prefer stored league_points for exact subtraction if available
                    const prevRow = (prevRows || []).find((r: any) => r.team_name === name);
                    const subPoints = prevRow && typeof prevRow.league_points === 'number'
                      ? prevRow.league_points
                      : (prevRows && prevRows.length ? prevPoints[k] : 0);

                    if (!standingRow) {
                      const { error: insErr } = await supabase
                        .from('standings')
                        .insert({
                          league_id: leagueId,
                          team_id: teamId,
                          wins: addWins - subWins,
                          losses: addLosses - subLosses,
                          points: addPoints - subPoints,
                          point_differential: addDiff - subDiff,
                        });
                      if (insErr) throw insErr;
                    } else {
                      const { error: updErr } = await supabase
                        .from('standings')
                        .update({
                          wins: (standingRow as any).wins - subWins + addWins,
                          losses: (standingRow as any).losses - subLosses + addLosses,
                          points: (standingRow as any).points - subPoints + addPoints,
                          point_differential: (standingRow as any).point_differential - subDiff + addDiff,
                        })
                        .eq('id', (standingRow as any).id);
                      if (updErr) throw updErr;
                    }
                  }

                  // Recalculate current positions ordering
                  const { error: recalcErr } = await supabase.rpc('recalculate_standings_positions', {
                    p_league_id: leagueId,
                  });
                  if (recalcErr) {
                    console.warn('Positions recalculation failed', recalcErr);
                  }

                  // Consolidated submission + standings + movement
                  try {
                    await submitThreeTeamScoresAndMove({
                      leagueId,
                      weekNumber,
                      tierNumber,
                      tierId: (weeklyTier as any).id as number,
                      teamNames: {
                        A: (submittedNames as any).A || (teamNames as any).A || '',
                        B: (submittedNames as any).B || (teamNames as any).B || '',
                        C: (submittedNames as any).C || (teamNames as any).C || '',
                      },
                      sets,
                      spares,
                      pointsTierOffset: pointsOffset,
                      isTopTier,
                    });
                  } catch (moveErr) {
                    console.warn('Failed to submit scores + movement', moveErr);
                  }

                  showToast('Scores submitted and standings updated.', 'success');
                  // Broadcast standings update so other views can refresh immediately
                  try {
                    if (leagueId) {
                      window.dispatchEvent(new CustomEvent('ofsl:standings-updated', { detail: { leagueId } }));
                    }
                  } catch {}
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err: any) {
                  console.error('Failed to submit scores', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '2-teams-4-sets' ? (
            <Scorecard2Teams4Sets
              teamNames={{ A: teamNames.A, B: teamNames.B } as any}
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              tierNumber={weeklyTier.tier_number}
              initialSets={initialSets as any}
              initialSpares={initialSpares as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, sets, spares }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  await submitTwoTeamScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId: (weeklyTier as any).id as number,
                    teamNames: {
                      A: (submittedNames as any).A || (teamNames as any).A || '',
                      B: (submittedNames as any).B || (teamNames as any).B || '',
                    },
                    sets: sets as any,
                    spares: (spares as any) || {},
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                  });
                  showToast('Scores submitted and standings updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err: any) {
                  console.error('Failed to submit scores', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '2-teams-best-of-5' ? (
            <Scorecard2TeamsBestOf5
              teamNames={{ A: teamNames.A, B: teamNames.B } as any}
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              tierNumber={weeklyTier.tier_number}
              initialSets={initialSets as any}
              initialSpares={initialSpares as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, sets, spares }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  await submitTwoTeamBestOf5ScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId: (weeklyTier as any).id as number,
                    teamNames: {
                      A: (submittedNames as any).A || (teamNames as any).A || '',
                      B: (submittedNames as any).B || (teamNames as any).B || '',
                    },
                    sets: sets as any,
                    spares: (spares as any) || {},
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                  });
                  showToast('Scores submitted and standings updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err: any) {
                  console.error('Failed to submit scores', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '2-teams-elite' ? (
            <Scorecard2TeamsEliteBestOf5
              teamNames={{ A: teamNames.A, B: teamNames.B } as any}
              leagueId={(weeklyTier as any).league_id as number}
              weekNumber={(weeklyTier as any).week_number as number}
              tierNumber={weeklyTier.tier_number}
              initialSets={initialSets as any}
              initialSpares={initialSpares as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, sets, spares }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  await submitTwoTeamEliteBestOf5ScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId: (weeklyTier as any).id as number,
                    teamNames: {
                      A: (submittedNames as any).A || (teamNames as any).A || '',
                      B: (submittedNames as any).B || (teamNames as any).B || '',
                    },
                    sets: sets as any,
                    spares: (spares ?? {}) as any,
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                  });
                  showToast('Scores submitted; standings and next week updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err) {
                  console.error('Failed to submit scores (2-team elite Bo5)', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '4-teams-head-to-head' ? (
            <Scorecard4TeamsHeadToHead
              teamNames={{ A: teamNames.A, B: teamNames.B, C: teamNames.C, D: (weeklyTier as any).team_d_name || '' } as any}
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              tierNumber={weeklyTier.tier_number}
              initial={initialH2H as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, game1, game2 }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  await submitFourTeamHeadToHeadScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId: (weeklyTier as any).id as number,
                    teamNames: {
                      A: (submittedNames as any).A || (teamNames as any).A || '',
                      B: (submittedNames as any).B || (teamNames as any).B || '',
                      C: (submittedNames as any).C || (teamNames as any).C || '',
                      D: (submittedNames as any).D || ((weeklyTier as any).team_d_name || ''),
                    },
                    game1,
                    game2,
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                  });
                  showToast('Scores submitted and standings updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err: any) {
                  console.error('Failed to submit scores', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '6-teams-head-to-head' ? (
            <Scorecard6TeamsHeadToHead
              teamNames={{
                A: (weeklyTier as any).team_a_name || '',
                B: (weeklyTier as any).team_b_name || '',
                C: (weeklyTier as any).team_c_name || '',
                D: (weeklyTier as any).team_d_name || '',
                E: (weeklyTier as any).team_e_name || '',
                F: (weeklyTier as any).team_f_name || '',
              } as any}
              submitting={saving}
              initial={initialH2H as any}
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              tierNumber={weeklyTier.tier_number}
              onSubmit={async ({ teamNames: submittedNames, game1, game2, spares }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  const tierId = (weeklyTier as any).id as number;

                  const names = {
                    A: (submittedNames as any).A || (weeklyTier as any).team_a_name || '',
                    B: (submittedNames as any).B || (weeklyTier as any).team_b_name || '',
                    C: (submittedNames as any).C || (weeklyTier as any).team_c_name || '',
                    D: (submittedNames as any).D || (weeklyTier as any).team_d_name || '',
                    E: (submittedNames as any).E || (weeklyTier as any).team_e_name || '',
                    F: (submittedNames as any).F || (weeklyTier as any).team_f_name || '',
                  };

                  await submitSixTeamHeadToHeadScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId,
                    teamNames: names,
                    game1: game1 as any,
                    game2: game2 as any,
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                    spares: (spares ?? {}) as any,
                  });

                  showToast('6-team scores submitted; standings and next week updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err) {
                  console.error('Failed to submit 6-team scores', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '3-teams-elite-6-sets' ? (
            <Scorecard3Teams6Sets
              teamNames={teamNames as any}
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              eliteSummary={true}
              tierNumber={weeklyTier.tier_number}
              initialSets={initialSets as any}
              initialSpares={initialSpares as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, sets, spares }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  await submitThreeTeamEliteSixScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId: (weeklyTier as any).id as number,
                    teamNames: submittedNames as any,
                    sets: sets as any,
                    spares: (spares ?? {}) as any,
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                  });
                  showToast('Scores submitted; standings and next week updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err) {
                  console.error('Failed to submit scores (3-team elite 6 sets)', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : weeklyTier.format === '3-teams-elite-9-sets' ? (
            <Scorecard3TeamsElite9Sets
              teamNames={teamNames as any}
              tierNumber={weeklyTier.tier_number}
              initialSets={initialSets as any}
              initialSpares={initialSpares as any}
              submitting={saving}
              onSubmit={async ({ teamNames: submittedNames, sets, spares }) => {
                try {
                  setSaving(true);
                  const canSubmit = Boolean(userProfile?.is_admin || userProfile?.is_facilitator);
                  if (!canSubmit) {
                    showToast('Only admins or facilitators can submit scores.', 'error');
                    return;
                  }
                  const leagueId = (weeklyTier as any).league_id as number;
                  const weekNumber = (weeklyTier as any).week_number as number;
                  const tierNumber = (weeklyTier as any).tier_number as number;
                  await submitThreeTeamEliteNineScoresAndMove({
                    leagueId,
                    weekNumber,
                    tierNumber,
                    tierId: (weeklyTier as any).id as number,
                    teamNames: submittedNames as any,
                    sets: sets as any,
                    spares: (spares ?? {}) as any,
                    pointsTierOffset: pointsOffset,
                    isTopTier,
                  });
                  showToast('Scores submitted; standings and next week updated.', 'success');
                  try { onSuccess && (await onSuccess()); } catch {}
                  onClose();
                } catch (err) {
                  console.error('Failed to submit scores (3-team elite 9 sets)', err);
                  showToast('Failed to submit scores. Please try again.', 'error');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : (
            <div className="text-sm text-gray-700">
              Score submission for this format is not available yet. Please check back after the scorecard is built.
            </div>
          )}
        </div>

        {/* Footer intentionally omitted to match admin: close via overlay or X */}
      </DialogContent>
    </Dialog>
  );
}
