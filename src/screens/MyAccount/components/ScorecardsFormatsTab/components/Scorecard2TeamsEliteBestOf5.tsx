import { useEffect, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../../../components/ui/button';
import { supabase } from '../../../../../lib/supabase';
import { computeWeeklyNameRanksFromResults } from '../../../../LeagueSchedulePage/utils/rankingUtils';
import { buildWeekTierLabels } from '../../../../LeagueSchedulePage/utils/formatUtils';

type TeamKey = 'A' | 'B';

interface Scorecard2TeamsEliteBestOf5Props {
  teamNames: Record<TeamKey, string>;
  onSubmit?: (payload: {
    teamNames: Record<TeamKey, string>;
    sets: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
    spares: Record<TeamKey, string>;
  }) => void;
  tierNumber?: number;
  leagueId?: number;
  weekNumber?: number;
  initialSets?: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
  initialSpares?: Record<TeamKey, string>;
  submitting?: boolean;
}

type ScoreEntry = { setLabel: string; teams: [TeamKey, TeamKey] };
const SETS: ReadonlyArray<ScoreEntry> = [
  { setLabel: 'A vs B (Set 1)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 2)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 3)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 4)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 5)', teams: ['A', 'B'] },
];

export function Scorecard2TeamsEliteBestOf5({ teamNames, onSubmit, tierNumber, leagueId, weekNumber, initialSets, initialSpares, submitting = false }: Scorecard2TeamsEliteBestOf5Props) {
  const [scores, setScores] = useState<Record<number, { A?: string; B?: string }>>({});
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '' });
  const [weekRanksByName, setWeekRanksByName] = useState<Record<string, number> | null>(null);
  const [weekTiers, setWeekTiers] = useState<Array<{ id?: number | null; week_number: number; tier_number: number; format?: string | null }>>([]);
  const [baseResults, setBaseResults] = useState<Array<{ week_number: number; tier_number: number; team_name: string | null; tier_position: number | null }>>([]);
  const [nextWeekPlacements, setNextWeekPlacements] = useState<Array<{ id?: number | null; tier_number: number; format?: string | null; team_a_name?: string | null; team_b_name?: string | null; team_c_name?: string | null; team_d_name?: string | null; team_e_name?: string | null; team_f_name?: string | null }>>([]);

  useEffect(() => {
    if (initialSpares) {
      setSpares({ A: initialSpares.A || '', B: initialSpares.B || '' });
    }
    if (initialSets && initialSets.length) {
      const byLabel = new Map(initialSets.map((s) => [s.label, s] as const));
      const pre: Record<number, { A?: string; B?: string }> = {};
      SETS.forEach((entry, idx) => {
        const found = byLabel.get(entry.setLabel);
        if (found) {
          pre[idx] = {
            A: (found.scores as any).A ?? '',
            B: (found.scores as any).B ?? '',
          };
        }
      });
      setScores(pre);
    }
  }, [initialSets, initialSpares]);

  // Load current week tier structures and existing results for rank context
  useEffect(() => {
    const loadWeekContext = async () => {
      try {
        if (!leagueId || !weekNumber) return;
        const nextWeek = weekNumber + 1;
        const [{ data: tiers }, { data: results }, { data: placements }] = await Promise.all([
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
          supabase
            .from('weekly_schedules')
            .select('id,tier_number,format,team_a_name,team_b_name,team_c_name,team_d_name,team_e_name,team_f_name')
            .eq('league_id', leagueId)
            .eq('week_number', nextWeek)
            .order('tier_number', { ascending: true }),
        ]);
        setWeekTiers((tiers || []) as any);
        setBaseResults((results || []) as any);
        setNextWeekPlacements((placements || []) as any);
      } catch (e) {
        // Non-fatal
      }
    };
    void loadWeekContext();
  }, [leagueId, weekNumber]);

  const clampScore = (value: string): string => {
    if (value === '') return '';
    const n = Math.floor(Number(value));
    if (Number.isNaN(n)) return '';
    return String(Math.max(0, Math.min(40, n)));
  };

  const handleScoreChange = (rowIndex: number, team: TeamKey, value: string) => {
    const clamped = clampScore(value);
    setScores(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [team]: clamped } }));
  };

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  const setOutcome = (a?: string, b?: string, isDecider: boolean = false) => {
    if (!a || !b) return { decided: false } as const;
    const n1 = Number(a), n2 = Number(b);
    if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) return { decided: false } as const;
    const hi = Math.max(n1, n2), lo = Math.min(n1, n2);
    const target = isDecider ? 15 : 25;
    if (hi < target) return { decided: false } as const;
    if ((hi - lo) < 2) return { decided: false } as const;
    return { decided: true, winner: n1 > n2 ? 'A' : 'B', diff: Math.abs(n1 - n2) } as const;
  };

  const decidedPathWins = () => {
    let aWins = 0, bWins = 0;
    for (let i = 0; i < SETS.length; i++) {
      const row = (scores[i] || {}) as Record<TeamKey, string>;
      const res = setOutcome(row.A, row.B, i === 4);
      if (!res.decided) break;
      if ((res as any).winner === 'A') aWins++; else bWins++;
      if (aWins === 3 || bWins === 3) break;
    }
    return { aWins, bWins };
  };

  useEffect(() => {
    const computePlacementRanks = (): Record<string, number> | null => {
      if (!nextWeekPlacements || nextWeekPlacements.length === 0) return null;
      const enriched = nextWeekPlacements.map((row, idx) => ({ ...row, __id: (row.id ?? idx + 1) as number }));
      const labelMap = buildWeekTierLabels(enriched.map(row => ({ id: row.__id, tier_number: row.tier_number, format: String(row.format || '') })));
      const orderIndex = (row: typeof enriched[number]) => {
        const label = labelMap.get(row.__id);
        if (!label) return Number.MAX_SAFE_INTEGER;
        const match = /^([0-9]+)([A|B])?$/.exec(label);
        if (!match) return Number.MAX_SAFE_INTEGER;
        const tierNum = Number(match[1]);
        const suffix = match[2] || '';
        if (suffix === 'A') return tierNum * 10 + 1;
        if (suffix === 'B') return tierNum * 10 + 2;
        return tierNum * 10;
      };
      const sorted = [...enriched].sort((a, b) => orderIndex(a) - orderIndex(b));
      const placementRanks: Record<string, number> = {};
      const seen = new Set<string>();
      let rank = 1;
      const positions = ['team_a_name','team_b_name','team_c_name','team_d_name','team_e_name','team_f_name'] as const;
      for (const row of sorted) {
        for (const pos of positions) {
          const raw = (row as any)[pos] as string | null | undefined;
          if (!raw) continue;
          const name = raw.trim();
          if (!name) continue;
          const normalized = name.toLowerCase();
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          placementRanks[name] = rank++;
        }
      }
      return Object.keys(placementRanks).length ? placementRanks : null;
    };

    const computeResultRanks = (): Record<string, number> | null => {
      if (!leagueId || !weekNumber || !tierNumber) return null;
      const { aWins, bWins } = decidedPathWins();
      if (aWins < 3 && bWins < 3) return null;
      const curTier = typeof tierNumber === 'number' ? tierNumber : 0;
      const winner = aWins > bWins ? 'A' : 'B';
      const loser = winner === 'A' ? 'B' : 'A';
      const curNames: Record<TeamKey, string> = { A: teamNames.A || '', B: teamNames.B || '' };
      const merged = (baseResults || []).filter(r => !(r.week_number === weekNumber && r.tier_number === curTier));
      merged.push({ week_number: weekNumber!, tier_number: curTier, team_name: curNames[winner], tier_position: 1 });
      merged.push({ week_number: weekNumber!, tier_number: curTier, team_name: curNames[loser], tier_position: 2 });
      const nameRanksByWeek = computeWeeklyNameRanksFromResults(
        (weekTiers || []) as any,
        merged as any,
      );
      const map = nameRanksByWeek[weekNumber!];
      return map || null;
    };

    const placementRanks = computePlacementRanks();
    if (placementRanks && Object.keys(placementRanks).length) {
      setWeekRanksByName(placementRanks);
      return;
    }

    const resultRanks = computeResultRanks();
    if (resultRanks && Object.keys(resultRanks).length) {
      setWeekRanksByName(resultRanks);
    } else {
      setWeekRanksByName(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, teamNames, tierNumber, leagueId, weekNumber, baseResults, weekTiers, nextWeekPlacements]);

  return (
    <form
      className="max-w-xl shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const { aWins, bWins } = decidedPathWins();
        if ((aWins < 3 && bWins < 3)) return;
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
      <div className="bg-[#B20000] text-white rounded-t-lg px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['A','B'] as TeamKey[]).map((t) => (
            <div key={t} className="p-0">
              <div className="text-[11px] font-medium text-white/90">Position {t}</div>
              <div className="text-sm font-semibold text-white truncate" title={teamNames[t] || `Team ${t}`}>
                {teamNames[t] || `Team ${t}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#F8F8F8] rounded-b-lg px-3 sm:px-4 py-3 space-y-3">
        <div>
          <div className="grid grid-cols-1 gap-0.5">
            {SETS.map((entry, idx) => {
              const row = (scores[idx] || {}) as Record<TeamKey, string>;
              const sA = row.A ?? '';
              const sB = row.B ?? '';
              const nA = sA === '' ? null : Number(sA);
              const nB = sB === '' ? null : Number(sB);
              const both = nA !== null && !Number.isNaN(nA) && nB !== null && !Number.isNaN(nB);
              const isTie = both && nA! === nB!;
              // Display W/L tags only when valid under win-by-2 rule near set end
              // Sets 1-4: target 25, win by 2 after 23; Set 5: target 15, win by 2 after 13
              let displayWinner: TeamKey | undefined = undefined;
              if (both && !isTie) {
                const maxScore = Math.max(nA as number, nB as number);
                const diff = Math.abs((nA as number) - (nB as number));
                const threshold = idx === 4 ? 13 : 23;
                const isPreThreshold = maxScore <= threshold;
                const meetsDeuce = diff >= 2;
                if (isPreThreshold || meetsDeuce) {
                  displayWinner = ((nA as number) > (nB as number)) ? 'A' : 'B';
                }
              }
              return (
                <div key={`set-${idx}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563] font-medium">{entry.setLabel}{idx === 4 ? ' (to 15)' : ''}</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">A</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={40}
                      step={1}
                      value={row.A ?? ''}
                      onChange={(e) => handleScoreChange(idx, 'A', e.target.value)}
                      aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${
                        isTie ? 'border-red-400' : (nA !== null ? 'border-green-400' : 'border-yellow-300')
                      }`}
                      placeholder="0"
                    />
                    {displayWinner === 'A' && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{both && !isTie ? Math.abs((nA as number) - (nB as number)) : 0}</span>
                    )}
                    {both && !isTie && displayWinner === 'B' && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{Math.abs((nA as number) - (nB as number))}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">B</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={40}
                      step={1}
                      value={row.B ?? ''}
                      onChange={(e) => handleScoreChange(idx, 'B', e.target.value)}
                      aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${
                        isTie ? 'border-red-400' : (nB !== null ? 'border-green-400' : 'border-yellow-300')
                      }`}
                      placeholder="0"
                    />
                    {displayWinner === 'B' && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{both && !isTie ? Math.abs((nA as number) - (nB as number)) : 0}</span>
                    )}
                    {both && !isTie && displayWinner === 'A' && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{Math.abs((nA as number) - (nB as number))}</span>
                    )}
              </div>
            </div>
          );
        })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['A','B'] as TeamKey[]).map((t) => (
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

        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] relative">
          {(() => {
            const { aWins, bWins } = decidedPathWins();
            const order: TeamKey[] = ['A','B'];
            const role: Record<TeamKey, 'winner'|'loser'|'pending'> = { A:'pending', B:'pending' };
            if (aWins === 3 || bWins === 3) {
              role[aWins === 3 ? 'A' : 'B'] = 'winner';
              role[aWins === 3 ? 'B' : 'A'] = 'loser';
            }
            const headerCell = (text: string) => (
              <div className="text-[12px] font-semibold text-[#B20000]">{text}</div>
            );
            const rowCell = (content: ReactNode, emphasize = false) => (
              <div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>
            );
            const tierDisplay = typeof tierNumber === 'number' ? tierNumber : '';
            const ranking = (team: TeamKey) => {
              if (!(aWins === 3 || bWins === 3)) return '-';
              const name = team === 'A' ? (teamNames.A || '') : (teamNames.B || '');
              const rk = weekRanksByName && name ? weekRanksByName[name] : undefined;
              return rk != null ? String(rk) : '-';
            };
            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">Weekly Summary</div>
                {tierDisplay && (
                  <span className="absolute right-4 top-3 text-[11px] text-[#4B5563]">
                    <span className="font-semibold">Tier {tierDisplay}</span>
                  </span>
                )}
                <div className="grid grid-cols-4 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {headerCell('Movement')}
                  {headerCell('Weekly Ranking')}
                  {order.map(k => (
                    <Fragment key={`summary-${k}`}>
                      {rowCell(
                        <div className="flex items-center gap-1">
                          <span>{k}</span>
                          {role[k] === 'winner' && (
                            <span className="inline-flex items-center rounded border border-green-200 bg-green-100 px-1.5 py-0 text-[10px] font-semibold leading-4 text-green-700">W</span>
                          )}
                          {role[k] === 'loser' && (
                            <span className="inline-flex items-center rounded border border-red-200 bg-red-100 px-1.5 py-0 text-[10px] font-semibold leading-4 text-red-700">L</span>
                          )}
                        </div>,
                        true
                      )}
                      {rowCell(`${k==='A'?aWins:bWins}-${k==='A'?bWins:aWins}`)}
                      {rowCell(role[k] === 'pending' ? '-' : (role[k] === 'winner' ? 'Up' : 'Down'))}
                      {rowCell(ranking(k), true)}
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          {(() => {
            const { aWins, bWins } = decidedPathWins();
            return (
              <span className="text-[11px]">
                {(aWins < 3 && bWins < 3) && (
                  <span className="text-gray-600">Enter valid set scores until a team reaches 3 wins (Sets 1–4 to 25; Set 5 to 15; all win by 2).</span>
                )}
              </span>
            );
          })()}
          <Button
            type="submit"
            size="sm"
            disabled={submitting || (() => { const { aWins, bWins } = decidedPathWins(); return (aWins < 3 && bWins < 3); })()}
            className="rounded-[10px] px-4 py-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </div>
    </form>
  );
}
