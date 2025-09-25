import { useEffect, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../../../components/ui/button';
//

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
  // Ranking context removed — hide weekly ranking column for elite scorecard
  void leagueId; void weekNumber; void tierNumber; // avoid unused param warnings

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
  // Ranking context removed

  const clampScore = (value: string, rowIndex?: number): string => {
    if (value === '') return '';
    const n = Math.floor(Number(value));
    if (Number.isNaN(n)) return '';
    // Elite: cap sets 1-4 at 25, set 5 at 15
    const max = rowIndex === 4 ? 15 : 25;
    return String(Math.max(0, Math.min(max, n)));
  };

  const handleScoreChange = (rowIndex: number, team: TeamKey, value: string) => {
    const clamped = clampScore(value, rowIndex);
    setScores(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [team]: clamped } }));
  };

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  const setOutcome = (a?: string, b?: string, isDecider: boolean = false) => {
    if (!a || !b) return { decided: false } as const;
    const n1 = Number(a), n2 = Number(b);
    if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) return { decided: false } as const;
    const winner = n1 > n2 ? 'A' : 'B';
    const winningScore = Math.max(n1, n2);
    // Elite rule: sets 1-4 valid when winner is exactly 21 or 25; set 5 valid when winner is exactly 15
    if (isDecider) {
      if (winningScore !== 15) return { decided: false } as const;
    } else {
      if (winningScore !== 21 && winningScore !== 25) return { decided: false } as const;
    }
    return { decided: true, winner, diff: Math.abs(n1 - n2) } as const;
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

  // Weekly ranking hidden: remove recomputation effect

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
              // Show W/L only when the set is decided under elite rules (winner score 21 or 25, no ties)
              let displayWinner: TeamKey | undefined = undefined;
              if (both && !isTie) {
                const res = setOutcome(sA, sB, idx === 4);
                if (res.decided) displayWinner = (res as any).winner as TeamKey;
              }
              return (
                <div key={`set-${idx}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563] font-medium">{entry.setLabel}</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">A</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={idx === 4 ? 15 : 25}
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
                      max={idx === 4 ? 15 : 25}
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
            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">Weekly Summary</div>
                <div className="grid grid-cols-2 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
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
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-gray-600">First to 3 sets wins.</span>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || (() => {
              const { aWins, bWins } = decidedPathWins();
              const anyTie = SETS.some((_, i) => {
                const row = (scores[i] || {}) as Record<TeamKey, string>;
                const a = row.A ?? '';
                const b = row.B ?? '';
                if (a === '' || b === '') return false;
                const n1 = Number(a), n2 = Number(b);
                return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
              });
              return anyTie || (aWins < 3 && bWins < 3);
            })()}
            className="rounded-[10px] px-4 py-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </div>
    </form>
  );
}
