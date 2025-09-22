import { useEffect, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../../../components/ui/button';
import { supabase } from '../../../../../lib/supabase';
import { computeWeeklyNameRanksFromResults } from '../../../../LeagueSchedulePage/utils/rankingUtils';

type TeamKey = 'A' | 'B' | 'C';

type ScoreEntry = {
  setLabel: string;
  teams: [TeamKey, TeamKey];
};

const SETS: ReadonlyArray<ScoreEntry> = [
  // Order: A vs C (2), A vs B (2), B vs C (2)
  { setLabel: 'A vs C (Set 1)', teams: ['A', 'C'] },
  { setLabel: 'A vs C (Set 2)', teams: ['A', 'C'] },
  { setLabel: 'A vs B (Set 1)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 2)', teams: ['A', 'B'] },
  { setLabel: 'B vs C (Set 1)', teams: ['B', 'C'] },
  { setLabel: 'B vs C (Set 2)', teams: ['B', 'C'] },
] as const;

interface Scorecard3Teams6SetsProps {
  teamNames: Record<TeamKey, string>;
  onSubmit?: (payload: {
    teamNames: Record<TeamKey, string>;
    sets: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
    spares: Record<TeamKey, string>;
  }) => void;
  isTopTier?: boolean;
  pointsTierOffset?: number; // 0 for bottom tier, 1 for second-from-bottom, etc.
  resultsLabel?: string;
  tierNumber?: number; // Actual league tier number for display (1 = top tier)
  leagueId?: number;
  weekNumber?: number;
  initialSets?: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
  initialSpares?: Record<TeamKey, string>;
  submitting?: boolean;
  eliteSummary?: boolean; // when true, show Team/Record/Movement/Ranking only (no points/bonus/differential)
}

export function Scorecard3Teams6Sets({ teamNames, onSubmit, isTopTier = false, pointsTierOffset = 0, resultsLabel, tierNumber, leagueId, weekNumber, initialSets, initialSpares, submitting = false, eliteSummary = false }: Scorecard3Teams6SetsProps) {
  const [scores, setScores] = useState<Record<number, { A?: string; B?: string; C?: string }>>({});
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '' });
  const [weekTiers, setWeekTiers] = useState<Array<{ week_number: number; tier_number: number; format?: string | null }>>([]);
  const [baseResults, setBaseResults] = useState<Array<{ week_number: number; tier_number: number; team_name: string | null; tier_position: number | null }>>([]);
  const [weekRanksByName, setWeekRanksByName] = useState<Record<string, number> | null>(null);

  // Prefill from initial values when provided
  useEffect(() => {
    if (initialSpares) {
      setSpares({ A: initialSpares.A || '', B: initialSpares.B || '', C: initialSpares.C || '' });
    }
    if (initialSets && initialSets.length) {
      const byLabel = new Map(initialSets.map((s) => [s.label, s] as const));
      const pre: Record<number, { A?: string; B?: string; C?: string }> = {};
      SETS.forEach((entry, idx) => {
        const found = byLabel.get(entry.setLabel);
        if (found) {
          pre[idx] = {
            A: (found.scores as any).A ?? '',
            B: (found.scores as any).B ?? '',
            C: (found.scores as any).C ?? '',
          };
        }
      });
      setScores(pre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSets, initialSpares]);

  // Clamp score inputs; in eliteSummary mode allow deuce beyond 21 (up to 40)
  const clampScore = (value: string): string => {
    if (value === '') return '';
    const n = Math.floor(Number(value));
    if (Number.isNaN(n)) return '';
    const max = eliteSummary ? 40 : 21;
    return String(Math.max(0, Math.min(max, n)));
  };

  const handleScoreChange = (rowIndex: number, team: TeamKey, value: string) => {
    const clamped = clampScore(value);
    setScores(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [team]: clamped } }));
  };

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  // Load tiers/results context to compute week-wide ranking in elite summary
  useEffect(() => {
    const loadWeekContext = async () => {
      try {
        if (!eliteSummary || !leagueId || !weekNumber) return;
        const [{ data: tiers }, { data: results }] = await Promise.all([
          supabase
            .from('weekly_schedules')
            .select('id,week_number,tier_number,format')
            .eq('league_id', leagueId)
            .eq('week_number', weekNumber)
            .order('tier_number', { ascending: true }),
          supabase
            .from('game_results')
            .select('team_name, week_number, tier_number, tier_position')
            .eq('league_id', leagueId)
            .eq('week_number', weekNumber),
        ]);
        setWeekTiers((tiers || []) as any);
        setBaseResults((results || []) as any);
      } catch {/* ignore */}
    };
    void loadWeekContext();
  }, [eliteSummary, leagueId, weekNumber]);

  // Recompute week-wide ranks when scores change (elite summary only)
  useEffect(() => {
    const recomputeRanks = () => {
      if (!eliteSummary || !leagueId || !weekNumber || !tierNumber) return;
      // Aggregate from current scores (same logic as below)
      const stats: Record<TeamKey, { wins: number; losses: number; diff: number }> = { A:{wins:0,losses:0,diff:0}, B:{wins:0,losses:0,diff:0}, C:{wins:0,losses:0,diff:0} } as any;
      const teamKeys: TeamKey[] = ['A','B','C'];
      const fmtDiff = (k: TeamKey) => stats[k].diff;
      // Tally wins/loses/diff similar to onSubmit block
      const SETS_LOCAL: Array<{ teams: [TeamKey,TeamKey]; idx:number }> = [
        { teams: ['A','C'], idx:0 }, { teams: ['A','C'], idx:1 },
        { teams: ['A','B'], idx:2 }, { teams: ['A','B'], idx:3 },
        { teams: ['B','C'], idx:4 }, { teams: ['B','C'], idx:5 },
      ];
      SETS_LOCAL.forEach(({teams: [L,R], idx}) => {
        const row = (scores[idx] || {}) as Record<TeamKey, string>;
        const sL = row[L] ?? '';
        const sR = row[R] ?? '';
        if (sL === '' || sR === '') return;
        const nL = Number(sL), nR = Number(sR);
        if (Number.isNaN(nL) || Number.isNaN(nR) || nL === nR) return;
        stats[L].diff += (nL - nR); stats[R].diff += (nR - nL);
        if (nL > nR) { stats[L].wins++; stats[R].losses++; } else { stats[R].wins++; stats[L].losses++; }
      });
      const sorted = [...teamKeys].sort((x, y) => {
        if (stats[y].wins !== stats[x].wins) return stats[y].wins - stats[x].wins;
        if (fmtDiff(y) !== fmtDiff(x)) return fmtDiff(y) - fmtDiff(x);
        return teamKeys.indexOf(x) - teamKeys.indexOf(y);
      });

      // Build merged results: other tiers + this tier's in-progress positions
      const merged = (baseResults || []).filter(r => !(r.week_number === weekNumber && r.tier_number === tierNumber));
      const names: Record<TeamKey, string> = { A: teamNames.A || '', B: teamNames.B || '', C: teamNames.C || '' };
      sorted.forEach((k, i) => {
        merged.push({ week_number: weekNumber!, tier_number: tierNumber!, team_name: names[k], tier_position: i + 1 });
      });

      const nameRanksByWeek = computeWeeklyNameRanksFromResults(
        (weekTiers || []) as any,
        merged as any,
      );
      const ranks = nameRanksByNameFromMap(nameRanksByWeek[weekNumber!]);
      setWeekRanksByName(ranks);
    };
    const nameRanksByNameFromMap = (m: Record<string, number> | undefined) => (m ? m : null);
    recomputeRanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, teamNames, eliteSummary, leagueId, weekNumber, tierNumber, weekTiers, baseResults]);

  return (
    <form
      className="max-w-xl shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const hasTie = SETS.some((entry, i) => {
          const row = scores[i] || {} as Record<TeamKey, string>;
          const s1 = row[entry.teams[0]] ?? '';
          const s2 = row[entry.teams[1]] ?? '';
          if (s1 === '' || s2 === '') return false;
          const n1 = Number(s1), n2 = Number(s2);
          return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
        });
        if (hasTie) return;
        if (onSubmit) {
          const sets = SETS.map((entry, idx) => ({
            label: entry.setLabel,
            teams: entry.teams,
            scores: (scores[idx] || {}) as Record<TeamKey, string>,
          }));
          onSubmit({ teamNames, sets, spares });
        }
      }}
    >
      {/* Team names row (A/B/C) */}
      <div className="bg-[#B20000] text-white rounded-t-lg px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['A','B','C'] as TeamKey[]).map((t) => (
            <div key={t} className="p-0">
              <div className="text-[11px] font-medium text-white/90">Position {t}</div>
              <div className="text-sm font-semibold text-white truncate" title={teamNames[t] || `Team ${t}`}>
                {teamNames[t] || `Team ${t}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Body: sets + spares + actions */}
      <div className="bg-[#F8F8F8] rounded-b-lg px-3 sm:px-4 py-3 space-y-3">
        {/* Sets grid */}
        <div>
        <div className="grid grid-cols-1 gap-0.5">
          {SETS.map((entry, idx) => {
            const [t1, t2] = entry.teams;
            const row = scores[idx] || {};
            const s1 = row[t1] ?? '';
            const s2 = row[t2] ?? '';
            const n1 = s1 === '' ? null : Number(s1);
            const n2 = s2 === '' ? null : Number(s2);
            const hasLeft = n1 !== null && !Number.isNaN(n1);
            const hasRight = n2 !== null && !Number.isNaN(n2);
            const bothEntered = hasLeft && hasRight;
            const isTie = bothEntered && n1 === n2;
            let winner: TeamKey | null = null;
            if (bothEntered && !isTie) {
              const maxScore = Math.max(n1 as number, n2 as number);
              const diff = Math.abs((n1 as number) - (n2 as number));
              const threshold = 19; // 21-point sets: win-by-2 after 19
              const isPreThreshold = maxScore <= threshold;
              const meetsDeuce = diff >= 2;
              if (isPreThreshold || meetsDeuce) {
                winner = (n1! > n2!) ? t1 : t2;
              }
            }
            return (
              <>
                <div key={`${entry.setLabel}-${idx}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563] font-medium">{entry.setLabel}</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">{t1}</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={eliteSummary ? 40 : 21}
                      step={1}
                      value={row[t1] ?? ''}
                      onChange={(e) => handleScoreChange(idx, t1, e.target.value)}
                      aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${
                        isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')
                      }`}
                      placeholder="0"
                    />
                    {winner === t1 && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{bothEntered && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0}</span>
                    )}
                    {bothEntered && !isTie && winner === t2 && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{Math.abs((n1 as number) - (n2 as number))}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">{t2}</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={eliteSummary ? 40 : 21}
                      step={1}
                      value={row[t2] ?? ''}
                      onChange={(e) => handleScoreChange(idx, t2, e.target.value)}
                      aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${
                        isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')
                      }`}
                      placeholder="0"
                    />
                    {winner === t2 && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{bothEntered && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0}</span>
                    )}
                    {bothEntered && !isTie && winner === t1 && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{Math.abs((n1 as number) - (n2 as number))}</span>
                    )}
                  </div>
                </div>
                {(idx === 1 || idx === 3) && (
                  <div className="h-px bg-gray-200 my-1" />
                )}
              </>
            );
          })}
        </div>
        
        </div>

        {/* Spare players sections */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['A','B','C'] as TeamKey[]).map((t) => (
            <div key={`spares-${t}`}>
              <label className="block text-xs font-medium text-gray-700 mb-1">Team {t}</label>
              <textarea
                value={spares[t]}
                onChange={(e) => handleSparesChange(t, e.target.value)}
                className="w-full min-h-[64px] px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                placeholder="List spare players, one per line"
              />
            </div>
          ))}
        </div>

        {/* Weekly summary */}
        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] relative">
          {(() => {
            const stats: Record<TeamKey, { wins: number; losses: number; diff: number }> = {
              A: { wins: 0, losses: 0, diff: 0 },
              B: { wins: 0, losses: 0, diff: 0 },
              C: { wins: 0, losses: 0, diff: 0 },
            };
            SETS.forEach((entry, i) => {
              const row = (scores[i] || {}) as Record<TeamKey, string>;
              const sLeft = row[entry.teams[0]] ?? '';
              const sRight = row[entry.teams[1]] ?? '';
              if (sLeft !== '' && sRight !== '') {
                const nLeft = Number(sLeft);
                const nRight = Number(sRight);
                if (!Number.isNaN(nLeft) && !Number.isNaN(nRight) && nLeft !== nRight) {
                  const left = entry.teams[0];
                  const right = entry.teams[1];
                  const diff = nLeft - nRight;
                  stats[left].diff += diff;
                  stats[right].diff -= diff;
                  if (nLeft > nRight) {
                    stats[left].wins += 1;
                    stats[right].losses += 1;
                  } else {
                    stats[right].wins += 1;
                    stats[left].losses += 1;
                  }
                }
              }
            });
            const order: TeamKey[] = ['A','B','C'];
            // Determine if all sets have valid, non-tie scores entered
            const allEntered = SETS.every((entry, i) => {
              const row = (scores[i] || {}) as Record<TeamKey, string>;
              const sLeft = row[entry.teams[0]] ?? '';
              const sRight = row[entry.teams[1]] ?? '';
              if (sLeft === '' || sRight === '') return false;
              const nLeft = Number(sLeft);
              const nRight = Number(sRight);
              if (Number.isNaN(nLeft) || Number.isNaN(nRight) || nLeft === nRight) return false;
              if (!eliteSummary) return true;
              const maxScore = Math.max(nLeft, nRight);
              const diff = Math.abs(nLeft - nRight);
              const threshold = 19;
              return (maxScore <= threshold) || (diff >= 2);
            });
            const sorted = [...order].sort((x, y) => {
              const a = stats[x];
              const b = stats[y];
              if (b.wins !== a.wins) return b.wins - a.wins;
              if (b.diff !== a.diff) return b.diff - a.diff;
              return order.indexOf(x) - order.indexOf(y);
            });
            const movement: Record<TeamKey, string> = { A: 'Stay', B: 'Stay', C: 'Stay' };
            const role: Record<TeamKey, 'winner' | 'neutral' | 'loser'> = { A: 'neutral', B: 'neutral', C: 'neutral' };
            if (allEntered && sorted.length === 3) {
              role[sorted[0]] = 'winner';
              role[sorted[1]] = 'neutral';
              role[sorted[2]] = 'loser';
              if (isTopTier) {
                movement[sorted[0]] = 'Stay -> A';
                movement[sorted[1]] = 'Stay -> B';
                movement[sorted[2]] = 'Down';
              } else if (pointsTierOffset === 0) {
                movement[sorted[0]] = 'Up';
                movement[sorted[1]] = 'Stay -> B';
                movement[sorted[2]] = 'Stay -> C';
              } else {
                movement[sorted[0]] = 'Up';
                movement[sorted[1]] = 'Stay';
                movement[sorted[2]] = 'Down';
              }
            }
            const fmtDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);

            const headerCell = (text: string) => (
              <div className="text-[12px] font-semibold text-[#B20000]">{text}</div>
            );
            const rowCell = (content: ReactNode, emphasize = false) => (
              <div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>
            );
            const tierBonus = 2 * Math.max(0, pointsTierOffset);
            const tierDisplay = typeof tierNumber === 'number' ? tierNumber : (Math.max(0, pointsTierOffset) + 1);
            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">{resultsLabel ?? 'Weekly Summary'}</div>
                {!eliteSummary && (
                  <span className="absolute right-4 top-3 text-[11px] text-[#4B5563]">
                    <span className="font-semibold">Tier {tierDisplay}:</span> Base 3/4/5 Bonus +{tierBonus}
                  </span>
                )}
                <div className={`grid ${eliteSummary ? 'grid-cols-4' : 'grid-cols-5'} gap-x-4 items-center`}>
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {!eliteSummary && headerCell('Differential')}
                  {headerCell('Movement')}
                  {eliteSummary ? headerCell('Weekly Ranking') : headerCell('Points')}
                  {(order as TeamKey[]).map(k => (
                    <Fragment key={`summary-${k}`}>
                      {rowCell(
                        <div className="flex items-center gap-1">
                          <span>{k}</span>
                          {allEntered && role[k] === 'winner' && (
                            <span className="inline-flex items-center rounded border border-green-200 bg-green-100 px-1.5 py-0 text-[10px] font-semibold leading-4 text-green-700">W</span>
                          )}
                          {allEntered && role[k] === 'loser' && (
                            <span className="inline-flex items-center rounded border border-red-200 bg-red-100 px-1.5 py-0 text-[10px] font-semibold leading-4 text-red-700">L</span>
                          )}
                        </div>,
                        true
                      )}
                      {rowCell(`${stats[k].wins}-${stats[k].losses}`)}
                      {!eliteSummary && rowCell(fmtDiff(stats[k].diff))}
                      {rowCell(allEntered ? movement[k] : '-')}
                      {eliteSummary
                        ? rowCell(
                            allEntered
                              ? (() => {
                                  const nm = k === 'A' ? teamNames.A : (k === 'B' ? teamNames.B : teamNames.C);
                                  const rk = nm && weekRanksByName ? weekRanksByName[nm] : undefined;
                                  return rk != null ? String(rk) : String((sorted.indexOf(k) + 1));
                                })()
                              : '-',
                            true
                          )
                        : rowCell(
                            allEntered
                              ? `+${(() => {
                                  const basePoints = { winner: 5, neutral: 4, loser: 3 } as const;
                                  return basePoints[role[k]] + 2 * Math.max(0, pointsTierOffset);
                                })()}`
                              : '-',
                            true
                          )
                      }
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
        {/* Actions */}
        <div className="flex items-center justify-between pt-0.5">
          {(() => {
            const anyTie = SETS.some((entry, i) => {
              const row = scores[i] || {} as Record<TeamKey, string>;
              const s1 = row[entry.teams[0]] ?? '';
              const s2 = row[entry.teams[1]] ?? '';
              if (s1 === '' || s2 === '') return false;
              const n1 = Number(s1), n2 = Number(s2);
              return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
            });
            const allComplete = SETS.every((entry, i) => {
              const row = scores[i] || {} as Record<TeamKey, string>;
              const s1 = row[entry.teams[0]] ?? '';
              const s2 = row[entry.teams[1]] ?? '';
              if (s1 === '' || s2 === '') return false;
              const n1 = Number(s1), n2 = Number(s2);
              if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) return false;
              if (!eliteSummary) return true;
              const maxScore = Math.max(n1, n2);
              const diff = Math.abs(n1 - n2);
              const threshold = 19;
              return (maxScore <= threshold) || (diff >= 2);
            });
            return (
              <span className="text-[11px]">
                {anyTie && <span className="text-red-600">Resolve all ties: scores cannot be equal.</span>}
                {!anyTie && !allComplete && <span className="text-gray-600">Enter all scores to enable submit.</span>}
              </span>
            );
          })()}
          <Button
            type="submit"
            size="sm"
            disabled={submitting || (() => {
              const anyTie = SETS.some((entry, i) => {
                const row = scores[i] || {} as Record<TeamKey, string>;
                const s1 = row[entry.teams[0]] ?? '';
                const s2 = row[entry.teams[1]] ?? '';
                if (s1 === '' || s2 === '') return false;
                const n1 = Number(s1), n2 = Number(s2);
                return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
              });
              const allComplete = SETS.every((entry, i) => {
                const row = scores[i] || {} as Record<TeamKey, string>;
                const s1 = row[entry.teams[0]] ?? '';
                const s2 = row[entry.teams[1]] ?? '';
                if (s1 === '' || s2 === '') return false;
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) return false;
                if (!eliteSummary) return true;
                const maxScore = Math.max(n1, n2);
                const diff = Math.abs(n1 - n2);
                const threshold = 19;
                return (maxScore <= threshold) || (diff >= 2);
              });
              return anyTie || !allComplete;
            })()}
            className="rounded-[10px] px-4 py-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </div>

      {/* Note: When used in a modal for tier score submission, this component can be wrapped in a dialog and passed handlers. */}
    </form>
  );
}






