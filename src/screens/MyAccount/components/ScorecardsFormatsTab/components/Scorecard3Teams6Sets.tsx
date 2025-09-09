import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';

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
}

export function Scorecard3Teams6Sets({ teamNames, onSubmit, isTopTier = false, pointsTierOffset = 0, resultsLabel }: Scorecard3Teams6SetsProps) {
  const [scores, setScores] = useState<Record<number, { A?: string; B?: string; C?: string }>>({});
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '' });

  // Clamp score inputs to 0..21 and integers; allow empty while typing
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
            const bothEntered = n1 !== null && n2 !== null && !Number.isNaN(n1) && !Number.isNaN(n2);
            const isTie = bothEntered && n1 === n2;
            const winner: TeamKey | null = bothEntered && !isTie ? (n1! > n2! ? t1 : t2) : null;
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
                      max={21}
                      step={1}
                      value={row[t1] ?? ''}
                      onChange={(e) => handleScoreChange(idx, t1, e.target.value)}
                      aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : 'border-gray-300'}`}
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
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : 'border-gray-300'}`}
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

        {/* Weekly summary (wins/losses, differential, movement, points) */}
        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px]">
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
            const sorted = [...order].sort((x, y) => {
              const a = stats[x];
              const b = stats[y];
              if (b.wins !== a.wins) return b.wins - a.wins;
              if (b.diff !== a.diff) return b.diff - a.diff;
              return order.indexOf(x) - order.indexOf(y);
            });
            const movement: Record<TeamKey, string> = { A: 'Stay', B: 'Stay', C: 'Stay' };
            const role: Record<TeamKey, 'winner' | 'neutral' | 'loser'> = { A: 'neutral', B: 'neutral', C: 'neutral' };
            if (sorted.length === 3) {
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
            // Points calculation based on role with tier bonus (+2 per tier from bottom)
            const basePoints: Record<'winner' | 'neutral' | 'loser', number> = { winner: 5, neutral: 4, loser: 3 };
            const points: Record<TeamKey, number> = { A: 0, B: 0, C: 0 };
            (['A','B','C'] as TeamKey[]).forEach(k => {
              points[k] = basePoints[role[k]] + 2 * Math.max(0, pointsTierOffset);
            });

            const headerCell = (text: string) => (
              <div className="text-[12px] font-semibold text-[#B20000]">{text}</div>
            );
            const rowCell = (content: string | number, emphasize = false) => (
              <div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>
            );
            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">{resultsLabel ?? 'Weekly Summary'}</div>
                <div className="grid grid-cols-5 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {headerCell('Differential')}
                  {headerCell('Movement')}
                  {headerCell('Points')}
                  {(order as TeamKey[]).map(k => (
                    <>
                      {rowCell(role[k] === 'winner' ? `${k} (W)` : role[k] === 'loser' ? `${k} (L)` : k, true)}
                      {rowCell(`${stats[k].wins}-${stats[k].losses}`)}
                      {rowCell(fmtDiff(stats[k].diff))}
                      {rowCell(movement[k])}
                      {rowCell(`+${points[k]}`, true)}
                    </>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
        {/* Actions */}
        <div className="flex items-center justify-between pt-0.5">
          {SETS.some((entry, i) => {
            const row = scores[i] || {} as Record<TeamKey, string>;
            const s1 = row[entry.teams[0]] ?? '';
            const s2 = row[entry.teams[1]] ?? '';
            if (s1 === '' || s2 === '') return false;
            const n1 = Number(s1), n2 = Number(s2);
            return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
          }) && (
            <span className="text-[11px] text-red-600">Resolve all ties: scores cannot be equal.</span>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={SETS.some((entry, i) => {
              const row = scores[i] || {} as Record<TeamKey, string>;
              const s1 = row[entry.teams[0]] ?? '';
              const s2 = row[entry.teams[1]] ?? '';
              if (s1 === '' || s2 === '') return false;
              const n1 = Number(s1), n2 = Number(s2);
              return !Number.isNaN(n1) && !Number.isNaN(n2) && n1 === n2;
            })}
            className="rounded-[10px] px-4 py-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Note: When used in a modal for tier score submission, this component can be wrapped in a dialog and passed handlers. */}
    </form>
  );
}






