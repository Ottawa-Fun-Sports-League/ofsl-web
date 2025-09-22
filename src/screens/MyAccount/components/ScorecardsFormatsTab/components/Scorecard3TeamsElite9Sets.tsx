import { useEffect, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../../../components/ui/button';

type TeamKey = 'A' | 'B' | 'C';

type ScoreEntry = { setLabel: string; teams: [TeamKey, TeamKey]; decider?: boolean };

const SETS: ReadonlyArray<ScoreEntry> = [
  { setLabel: 'A vs C (Set 1)', teams: ['A','C'] },
  { setLabel: 'A vs C (Set 2)', teams: ['A','C'] },
  { setLabel: 'A vs C (Set 3)', teams: ['A','C'], decider: true },
  { setLabel: 'A vs B (Set 1)', teams: ['A','B'] },
  { setLabel: 'A vs B (Set 2)', teams: ['A','B'] },
  { setLabel: 'A vs B (Set 3)', teams: ['A','B'], decider: true },
  { setLabel: 'B vs C (Set 1)', teams: ['B','C'] },
  { setLabel: 'B vs C (Set 2)', teams: ['B','C'] },
  { setLabel: 'B vs C (Set 3)', teams: ['B','C'], decider: true },
] as const;

interface Scorecard3TeamsElite9SetsProps {
  teamNames: Record<TeamKey, string>;
  onSubmit?: (payload: {
    teamNames: Record<TeamKey, string>;
    sets: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
    spares: Record<TeamKey, string>;
  }) => void;
  tierNumber?: number;
  initialSets?: Array<{ label: string; teams: [TeamKey, TeamKey]; scores: Record<TeamKey, string> }>;
  initialSpares?: Record<TeamKey, string>;
  submitting?: boolean;
}

export function Scorecard3TeamsElite9Sets({ teamNames, onSubmit, tierNumber, initialSets, initialSpares, submitting = false }: Scorecard3TeamsElite9SetsProps) {
  const [scores, setScores] = useState<Record<number, { A?: string; B?: string; C?: string }>>({});
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '' });
  void tierNumber; // silence unused when removing top-right Tier display

  useEffect(() => {
    if (initialSpares) setSpares({ A: initialSpares.A || '', B: initialSpares.B || '', C: initialSpares.C || '' });
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
  }, [initialSets, initialSpares]);

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

  const setOutcome = (left: number, right: number, decider: boolean) => {
    if (left === right) return { decided: false } as const;
    const hi = Math.max(left, right), lo = Math.min(left, right);
    const target = decider ? 15 : 25;
    if (hi < target) return { decided: false } as const;
    if ((hi - lo) < 2) return { decided: false } as const;
    return { decided: true, winnerLeft: left > right } as const;
  };

  const computeSummary = () => {
    const matchWins: Record<TeamKey, number> = { A:0, B:0, C:0 };
    const matchLosses: Record<TeamKey, number> = { A:0, B:0, C:0 };
    const pf: Record<TeamKey, number> = { A:0, B:0, C:0 };
    const pa: Record<TeamKey, number> = { A:0, B:0, C:0 };
    const pairDiff = new Map<string, number>();
    const pairKey = (L: TeamKey, R: TeamKey) => `${L}-${R}`;
    const handlePair = (L: TeamKey, R: TeamKey) => {
      let lWins = 0, rWins = 0, diffLR = 0;
      const labels = [`${L} vs ${R} (Set 1)`, `${L} vs ${R} (Set 2)`, `${L} vs ${R} (Set 3)`];
      for (let i = 0; i < labels.length; i++) {
        if (lWins === 2 || rWins === 2) break;
        const rowIdx = SETS.findIndex(s => s.setLabel === labels[i]);
        const row = (scores[rowIdx] || {}) as Record<TeamKey, string>;
        const sL = row[L]; const sR = row[R];
        if (sL === undefined || sR === undefined || sL === '' || sR === '') break;
        const nL = Number(sL), nR = Number(sR);
        if (Number.isNaN(nL) || Number.isNaN(nR)) break;
        const oc = setOutcome(nL, nR, i === 2);
        if (!oc.decided) break;
        pf[L]+=nL; pa[L]+=nR; pf[R]+=nR; pa[R]+=nL;
        diffLR += (nL - nR);
        if (oc.winnerLeft) lWins++; else rWins++;
      }
      pairDiff.set(pairKey(L,R), diffLR);
      if (lWins !== rWins) {
        if (lWins > rWins) { matchWins[L]++; matchLosses[R]++; }
        else { matchWins[R]++; matchLosses[L]++; }
      }
    };
    handlePair('A','C'); handlePair('A','B'); handlePair('B','C');
    const diff: Record<TeamKey, number> = { A: pf.A - pa.A, B: pf.B - pa.B, C: pf.C - pa.C };
    const getHeadToHeadDiff = (X: TeamKey, Y: TeamKey) => {
      const k1 = `${X}-${Y}`; const k2 = `${Y}-${X}`;
      if (pairDiff.has(k1)) return pairDiff.get(k1) || 0;
      if (pairDiff.has(k2)) return -(pairDiff.get(k2) || 0);
      return 0;
    };
    return { matchWins, matchLosses, diff, getHeadToHeadDiff };
  };

  const canSubmit = () => {
    const { matchWins } = computeSummary();
    const totalMatches = matchWins.A + matchWins.B + matchWins.C; // each match win counted once
    return totalMatches === 3; // all three pairings decided
  };

  return (
    <form
      className="max-w-xl shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit()) return;
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

      <div className="bg-[#F8F8F8] rounded-b-lg px-3 sm:px-4 py-3 space-y-3">
        <div>
          <div className="grid grid-cols-1 gap-0.5">
            {SETS.map((entry, idx) => {
              const [L, R] = entry.teams;
              const row = (scores[idx] || {}) as Record<TeamKey, string>;
              const sL = row[L] ?? '';
              const sR = row[R] ?? '';
              const nL = sL === '' ? null : Number(sL);
              const nR = sR === '' ? null : Number(sR);
              const both = nL !== null && !Number.isNaN(nL) && nR !== null && !Number.isNaN(nR);
              const isTie = both && nL! === nR!;
              return (
                <>
                  <div key={`set-${idx}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                    <div className="text-[13px] text-[#4B5563] font-medium">{entry.setLabel}{entry.decider && ' (to 15)'}</div>
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] text-gray-600 w-8 text-right">{L}</label>
                      <input type="number" inputMode="numeric" min={0} max={40} step={1} value={row[L] ?? ''} onChange={(e) => handleScoreChange(idx, L, e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${ isTie ? 'border-red-400' : (nL !== null ? 'border-green-400' : 'border-yellow-300') }`} placeholder="0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] text-gray-600 w-8 text-right">{R}</label>
                      <input type="number" inputMode="numeric" min={0} max={40} step={1} value={row[R] ?? ''} onChange={(e) => handleScoreChange(idx, R, e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${ isTie ? 'border-red-400' : (nR !== null ? 'border-green-400' : 'border-yellow-300') }`} placeholder="0" />
                    </div>
                  </div>
                  {(idx === 2 || idx === 5) && (<div className="h-px bg-gray-200 my-1" />)}
                </>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['A','B','C'] as TeamKey[]).map((t) => (
            <div key={`spares-${t}`}>
              <label className="block text-xs font-medium text-gray-700 mb-1">Team {t}</label>
              <textarea value={spares[t]} onChange={(e) => handleSparesChange(t, e.target.value)} className="w-full min-h-[64px] px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60" placeholder="List spare players, one per line" />
            </div>
          ))}
        </div>

        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] relative">
          {(() => {
            const { matchWins, matchLosses, getHeadToHeadDiff } = computeSummary();
            const order: TeamKey[] = ['A','B','C'];
            const sorted = [...order].sort((x,y)=> {
              if (matchWins[y] !== matchWins[x]) return matchWins[y]-matchWins[x];
              const tiedGroupSize = order.filter(t => matchWins[t] === matchWins[x]).length;
              if (tiedGroupSize === 2) {
                const h2h = getHeadToHeadDiff(x, y);
                if (h2h !== 0) return h2h > 0 ? -1 : 1;
              }
              return order.indexOf(x) - order.indexOf(y);
            });
            const allDecided = canSubmit();
            const role: Record<TeamKey, 'winner' | 'neutral' | 'loser'> = { A:'neutral', B:'neutral', C:'neutral' };
            if (allDecided) { role[sorted[0]]='winner'; role[sorted[2]]='loser'; }
            const headerCell = (text: string) => (<div className="text-[12px] font-semibold text-[#B20000]">{text}</div>);
            const rowCell = (content: ReactNode, emphasize = false) => (<div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>);
            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">Weekly Summary (Elite 9 sets)</div>
                <div className="grid grid-cols-2 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {order.map(k => (
                    <Fragment key={`summary-${k}`}>
                      {rowCell(
                        <div className="flex items-center gap-1">
                          <span>{k}</span>
                          {role[k] === 'winner' && (<span className="inline-flex items-center rounded border border-green-200 bg-green-100 px-1.5 py-0 text-[10px] font-semibold leading-4 text-green-700">W</span>)}
                          {role[k] === 'loser' && (<span className="inline-flex items-center rounded border border-red-200 bg-red-100 px-1.5 py-0 text-[10px] font-semibold leading-4 text-red-700">L</span>)}
                        </div>, true)}
                      {rowCell(`${matchWins[k]}-${matchLosses[k]}`)}
                      
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px]">First two sets to 25 (win by 2); third set to 15 (win by 2). Submit once all three pairings are decided.</span>
          <Button type="submit" size="sm" disabled={submitting || !canSubmit()} className="rounded-[10px] px-4 py-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed">{submitting ? 'Saving…' : 'Submit'}</Button>
        </div>
      </div>
    </form>
  );
}
