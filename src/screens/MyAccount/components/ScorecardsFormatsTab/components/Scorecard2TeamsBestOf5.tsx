import { useEffect, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../../../components/ui/button';

type TeamKey = 'A' | 'B';

type ScoreEntry = {
  setLabel: string;
  teams: [TeamKey, TeamKey];
};

const SETS: ReadonlyArray<ScoreEntry> = [
  { setLabel: 'A vs B (Set 1)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 2)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 3)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 4)', teams: ['A', 'B'] },
  { setLabel: 'A vs B (Set 5)', teams: ['A', 'B'] },
] as const;

interface Scorecard2TeamsBestOf5Props {
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
  initialSets?: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
  initialSpares?: Record<TeamKey, string>;
  submitting?: boolean;
}

export function Scorecard2TeamsBestOf5({ teamNames, onSubmit, isTopTier = false, pointsTierOffset = 0, resultsLabel, tierNumber, initialSets, initialSpares, submitting = false }: Scorecard2TeamsBestOf5Props) {
  const [scores, setScores] = useState<Record<number, { A?: string; B?: string }>>({});
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '' });

  // Prefill from initial values when provided
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSets, initialSpares]);

  const clampScore = (value: string): string => {
    if (value === '') return '';
    const n = Math.floor(Number(value));
    if (Number.isNaN(n)) return '';
    return String(Math.max(0, Math.min(21, n)));
  };

  const handleScoreChange = (rowIndex: number, team: TeamKey, value: string) => {
    const clamped = clampScore(value);
    setScores(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [team]: clamped } }));
  };

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  return (
    <form
      className="max-w-xl shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        // Reject ties anywhere
        const hasTie = SETS.some((entry, i) => {
          const row = (scores[i] || {}) as Record<TeamKey, string>;
          const s1 = row[entry.teams[0]] ?? '';
          const s2 = row[entry.teams[1]] ?? '';
          if (s1 === '' || s2 === '') return false;
          const n1 = Number(s1), n2 = Number(s2);
          return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
        });
        if (hasTie) return;
        // Require match decided (first to 3 set wins)
        let aWins = 0, bWins = 0;
        let decided = false;
        for (let i = 0; i < SETS.length; i++) {
          const row = (scores[i] || {}) as Record<TeamKey, string>;
          const s1 = row['A'] ?? '';
          const s2 = row['B'] ?? '';
          if (s1 === '' || s2 === '') break; // allow remaining sets blank
          const n1 = Number(s1), n2 = Number(s2);
          if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) break;
          if (n1 > n2) aWins++; else bWins++;
          if (aWins === 3 || bWins === 3) { decided = true; break; }
        }
        if (!decided) return;
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
      {/* Team names row (A/B) */}
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

      {/* Body: sets + spares + actions */}
      <div className="bg-[#F8F8F8] rounded-b-lg px-3 sm:px-4 py-3 space-y-3">
        {/* Sets grid */}
        <div>
          <div className="grid grid-cols-1 gap-0.5">
            {SETS.map((entry, idx) => {
              const [t1, t2] = entry.teams;
              const row = (scores[idx] || {}) as Record<TeamKey, string>;
              const s1 = row[t1] ?? '';
              const s2 = row[t2] ?? '';
              const n1 = s1 === '' ? null : Number(s1);
              const n2 = s2 === '' ? null : Number(s2);
              const hasLeft = n1 !== null && !Number.isNaN(n1);
              const hasRight = n2 !== null && !Number.isNaN(n2);
              const bothEntered = hasLeft && hasRight;
              const isTie = bothEntered && n1 === n2;
              const winner: TeamKey | null = bothEntered && !isTie ? (n1! > n2! ? t1 : t2) : null;
              return (
                <>
                  <div key={`set-${idx}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                    <div className="text-[13px] text-[#4B5563] font-medium">{entry.setLabel}</div>
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] text-gray-600 w-8 text-right">{t1}</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={21}
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
                        max={21}
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
                </>
              );
            })}
          </div>
        </div>

        {/* Spare players sections */}
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

        {/* Weekly summary (wins/losses, differential, movement, points) */}
        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] relative">
          {(() => {
            const stats: Record<TeamKey, { wins: number; losses: number; diff: number; setWins: number; setLosses: number }> = {
              A: { wins: 0, losses: 0, diff: 0, setWins: 0, setLosses: 0 },
              B: { wins: 0, losses: 0, diff: 0, setWins: 0, setLosses: 0 },
            };
            // Traverse sets in order; stop counting once a team reaches 3 set wins
            let aWins = 0, bWins = 0;
            for (let i = 0; i < SETS.length; i++) {
              if (aWins === 3 || bWins === 3) break;
              const entry = SETS[i];
              const row = (scores[i] || {}) as Record<TeamKey, string>;
              const sLeft = row[entry.teams[0]] ?? '';
              const sRight = row[entry.teams[1]] ?? '';
              if (sLeft === '' || sRight === '') break; // allow remaining sets empty
              const nLeft = Number(sLeft);
              const nRight = Number(sRight);
              if (Number.isNaN(nLeft) || Number.isNaN(nRight) || nLeft === nRight) {
                // invalid or tie -> handled elsewhere; don't count further
                break;
              }
              const left = entry.teams[0];
              const right = entry.teams[1];
              const diff = nLeft - nRight;
              stats[left].diff += diff;
              stats[right].diff -= diff;
              if (nLeft > nRight) {
                stats[left].wins += 1; stats[left].setWins += 1;
                stats[right].losses += 1; stats[right].setLosses += 1;
                if (left === 'A') aWins++; else bWins++;
              } else {
                stats[right].wins += 1; stats[right].setWins += 1;
                stats[left].losses += 1; stats[left].setLosses += 1;
                if (right === 'A') aWins++; else bWins++;
              }
            }
            const order: TeamKey[] = ['A','B'];
            // Match considered entered/decided when A or B reached 3 set wins with valid non-tie scores
            const allEntered = (stats.A.setWins === 3 || stats.B.setWins === 3);
            const sorted = [...order].sort((x, y) => {
              const a = stats[x];
              const b = stats[y];
              if (b.setWins !== a.setWins) return b.setWins - a.setWins;
              if (b.diff !== a.diff) return b.diff - a.diff;
              return order.indexOf(x) - order.indexOf(y);
            });
            const movement: Record<TeamKey, string> = { A: 'Stay', B: 'Stay' };
            const role: Record<TeamKey, 'winner' | 'loser'> = { A: 'loser', B: 'loser' };
            if (allEntered && sorted.length === 2) {
              role[sorted[0]] = 'winner';
              role[sorted[1]] = 'loser';
              if (isTopTier) {
                movement[sorted[0]] = 'Stay -> A';
                movement[sorted[1]] = 'Down';
              } else if (pointsTierOffset === 0) {
                movement[sorted[0]] = 'Up';
                movement[sorted[1]] = 'Stay -> B';
              } else {
                movement[sorted[0]] = 'Up';
                movement[sorted[1]] = 'Down';
              }
            }
            const fmtDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);

            // Points system (standardized):
            // Start 2 points, +1 per set win (max +3), +1 bonus per tier up from bottom
            const tierDisplay = typeof tierNumber === 'number' ? tierNumber : (Math.max(0, pointsTierOffset) + 1);
            const tierBonus = Math.max(0, pointsTierOffset);
            const points: Record<TeamKey, number> = { A: 0, B: 0 };
            (['A','B'] as TeamKey[]).forEach(k => {
              const start = 2;
              const setBonus = Math.min(stats[k].setWins, 3);
              points[k] = start + setBonus + tierBonus;
            });

            const headerCell = (text: string) => (
              <div className="text-[12px] font-semibold text-[#B20000]">{text}</div>
            );
            const rowCell = (content: ReactNode, emphasize = false) => (
              <div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>
            );
            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">{resultsLabel ?? 'Weekly Summary'}</div>
                <span className="absolute right-4 top-3 text-[11px] text-[#4B5563]">
                  <span className="font-semibold">Tier {tierDisplay}:</span> Base 2, +1/set win (max +3) Bonus +{tierBonus}
                </span>
                <div className="grid grid-cols-5 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {headerCell('Differential')}
                  {headerCell('Movement')}
                  {headerCell('Points')}
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
                      {rowCell(`${stats[k].setWins}-${stats[k].setLosses}`)}
                      {rowCell(fmtDiff(stats[k].diff))}
                      {rowCell(allEntered ? movement[k] : '-')}
                      {rowCell(allEntered ? `+${points[k]}` : '-', true)}
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
            // Decide completeness: first to 3 with valid non-tie scores in that deciding path
            let aWins = 0, bWins = 0, decided = false;
            for (let i = 0; i < SETS.length; i++) {
              const row = scores[i] || {} as Record<TeamKey, string>;
              const s1 = row['A'] ?? '';
              const s2 = row['B'] ?? '';
              if (s1 === '' || s2 === '') break;
              const n1 = Number(s1), n2 = Number(s2);
              if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) break;
              if (n1 > n2) aWins++; else bWins++;
              if (aWins === 3 || bWins === 3) { decided = true; break; }
            }
            return (
              <span className="text-[11px]">
                {anyTie && <span className="text-red-600">Resolve all ties: scores cannot be equal.</span>}
                {!anyTie && !decided && <span className="text-gray-600">Enter sets until a team reaches 3 wins.</span>}
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
              let aWins = 0, bWins = 0, decided = false;
              for (let i = 0; i < SETS.length; i++) {
                const row = scores[i] || {} as Record<TeamKey, string>;
                const s1 = row['A'] ?? '';
                const s2 = row['B'] ?? '';
                if (s1 === '' || s2 === '') break;
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) break;
                if (n1 > n2) aWins++; else bWins++;
                if (aWins === 3 || bWins === 3) { decided = true; break; }
              }
              return anyTie || !decided;
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
