import { useEffect, useMemo, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../../../../components/ui/button';

type TeamKey = 'A' | 'B' | 'C' | 'D';

interface Scorecard4TeamsHeadToHeadProps {
  teamNames: Record<TeamKey, string>;
  onSubmit?: (payload: {
    teamNames: Record<TeamKey, string>;
    game1: {
      court1: Array<{ label: string; scores: Record<'A'|'B', string> }>;
      court2: Array<{ label: string; scores: Record<'C'|'D', string> }>;
    };
    game2: {
      court1: Array<{ label: string; scores: Record<'WC1'|'WC2', string> }>;
      court2: Array<{ label: string; scores: Record<'LC1'|'LC2', string> }>;
    };
    spares: Record<TeamKey, string>;
  }) => void;
  isTopTier?: boolean;
  pointsTierOffset?: number;
  resultsLabel?: string;
  tierNumber?: number;
  initial?: {
    game1?: {
      court1?: Array<{ label: string; scores: Record<'A'|'B', string> }>;
      court2?: Array<{ label: string; scores: Record<'C'|'D', string> }>;
    };
    game2?: {
      court1?: Array<{ label: string; scores: Record<'WC1'|'WC2', string> }>;
      court2?: Array<{ label: string; scores: Record<'LC1'|'LC2', string> }>;
    };
    spares?: Record<TeamKey, string>;
  };
  submitting?: boolean;
}

// Helper: clamp numeric input to 0..25 (allow blank)
const clampScore = (value: string): string => {
  if (value === '') return '';
  const n = Math.floor(Number(value));
  if (Number.isNaN(n)) return '';
  return String(Math.max(0, Math.min(25, n)));
};

export function Scorecard4TeamsHeadToHead({ teamNames, onSubmit, isTopTier = false, pointsTierOffset = 0, resultsLabel, tierNumber, initial, submitting = false }: Scorecard4TeamsHeadToHeadProps) {
  // Game 1: Court 1 (A vs B), Court 2 (C vs D) — 2 sets each
  const [g1c1, setG1C1] = useState<Array<{ A?: string; B?: string }>>([{},{ }]);
  const [g1c2, setG1C2] = useState<Array<{ C?: string; D?: string }>>([{},{ }]);
  // Game 2: dynamic — 2 sets each
  const [g2c1, setG2C1] = useState<Array<{ WC1?: string; WC2?: string }>>([{},{ }]);
  const [g2c2, setG2C2] = useState<Array<{ LC1?: string; LC2?: string }>>([{},{ }]);

  // Spares
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '', D: '' });

  useEffect(() => {
    if (!initial) return;
    if (initial.game1?.court1 && initial.game1.court1.length) {
      const pre = initial.game1.court1.map(r => ({ A: (r.scores as any).A ?? '', B: (r.scores as any).B ?? '' }));
      setG1C1(pre as any);
    }
    if (initial.game1?.court2 && initial.game1.court2.length) {
      const pre = initial.game1.court2.map(r => ({ C: (r.scores as any).C ?? '', D: (r.scores as any).D ?? '' }));
      setG1C2(pre as any);
    }
    if (initial.game2?.court1 && initial.game2.court1.length) {
      const pre = initial.game2.court1.map(r => ({ WC1: (r.scores as any).WC1 ?? '', WC2: (r.scores as any).WC2 ?? '' }));
      setG2C1(pre as any);
    }
    if (initial.game2?.court2 && initial.game2.court2.length) {
      const pre = initial.game2.court2.map(r => ({ LC1: (r.scores as any).LC1 ?? '', LC2: (r.scores as any).LC2 ?? '' }));
      setG2C2(pre as any);
    }
    if (initial.spares) {
      setSpares({ A: initial.spares.A || '', B: initial.spares.B || '', C: initial.spares.C || '', D: initial.spares.D || '' });
    }
  }, [initial]);

  // Determine winners/losers of Game 1 by court (2 sets: use set wins, then points differential if 1-1)
  const g1Outcome = useMemo(() => {
    const evalCourt = (rows: Array<Record<string, string>>, leftKey: string, rightKey: string) => {
      let leftSetWins = 0, rightSetWins = 0, diff = 0;
      for (const row of rows) {
        const sl = row[leftKey] ?? '';
        const sr = row[rightKey] ?? '';
        if (sl === '' || sr === '') return { decided: false as const };
        const nl = Number(sl), nr = Number(sr);
        if (Number.isNaN(nl) || Number.isNaN(nr) || nl === nr) return { decided: false as const };
        diff += (nl - nr);
        if (nl > nr) leftSetWins++; else rightSetWins++;
      }
      if (leftSetWins === rightSetWins) {
        if (diff === 0) return { decided: false as const };
        return { decided: true as const, winner: diff > 0 ? 'L' : 'R', loser: diff > 0 ? 'R' : 'L' };
      }
      return { decided: true as const, winner: leftSetWins > rightSetWins ? 'L' : 'R', loser: leftSetWins > rightSetWins ? 'R' : 'L' };
    };
    const c1 = evalCourt(g1c1 as any, 'A', 'B');
    const c2 = evalCourt(g1c2 as any, 'C', 'D');
    return { c1, c2 };
  }, [g1c1, g1c2]);

  // Labels for Game 2 based on Game 1 outcomes
  const g2Labels = useMemo(() => {
    const c1 = g1Outcome.c1; const c2 = g1Outcome.c2;
    const map = { WC1: '', WC2: '', LC1: '', LC2: '' } as Record<'WC1'|'WC2'|'LC1'|'LC2', string>;
    if (c1.decided && c2.decided) {
      map.WC1 = (c1.winner === 'L') ? teamNames.A : teamNames.B; // Court 1 winner
      map.LC1 = (c1.loser === 'L') ? teamNames.A : teamNames.B;  // Court 1 loser
      map.WC2 = (c2.winner === 'L') ? teamNames.C : teamNames.D; // Court 2 winner
      map.LC2 = (c2.loser === 'L') ? teamNames.C : teamNames.D;  // Court 2 loser
    }
    return map;
  }, [g1Outcome, teamNames]);

  // Summary: compute weekly record and differential for A-D using both games; Game 2 depends on decisons
  const summary = useMemo(() => {
    const stats: Record<TeamKey, { setWins: number; setLosses: number; diff: number }> = {
      A: { setWins: 0, setLosses: 0, diff: 0 },
      B: { setWins: 0, setLosses: 0, diff: 0 },
      C: { setWins: 0, setLosses: 0, diff: 0 },
      D: { setWins: 0, setLosses: 0, diff: 0 },
    };
    const addPair = (lKey: TeamKey, rKey: TeamKey, rows: Array<Record<string, string>>) => {
      for (const row of rows) {
        const sl = row[lKey] ?? '';
        const sr = row[rKey] ?? '';
        if (sl === '' || sr === '') return false;
        const nl = Number(sl), nr = Number(sr);
        if (Number.isNaN(nl) || Number.isNaN(nr) || nl === nr) return false;
        stats[lKey].diff += (nl - nr);
        stats[rKey].diff += (nr - nl);
        if (nl > nr) { stats[lKey].setWins++; stats[rKey].setLosses++; }
        else { stats[rKey].setWins++; stats[lKey].setLosses++; }
      }
      return true;
    };
    const g1c1Done = addPair('A','B', g1c1 as any);
    const g1c2Done = addPair('C','D', g1c2 as any);
    const game1Decided = g1c1Done && g1c2Done && g1Outcome.c1.decided && g1Outcome.c2.decided;
    let game2Done = false;
    if (game1Decided) {
      // Map dynamic labels to actual teams for Game 2
      const w1 = (g1Outcome.c1.winner === 'L') ? 'A' : 'B';
      const l1 = (g1Outcome.c1.loser  === 'L') ? 'A' : 'B';
      const w2 = (g1Outcome.c2.winner === 'L') ? 'C' : 'D';
      const l2 = (g1Outcome.c2.loser  === 'L') ? 'C' : 'D';

      // Court 1: WC1 vs WC2
      const rows1 = g2c1.map(r => ({ [w1]: r.WC1 ?? '', [w2]: r.WC2 ?? '' })) as Array<Record<string, string>>;
      // Court 2: LC1 vs LC2
      const rows2 = g2c2.map(r => ({ [l1]: r.LC1 ?? '', [l2]: r.LC2 ?? '' })) as Array<Record<string, string>>;
      const done1 = addPair(w1 as TeamKey, w2 as TeamKey, rows1);
      const done2 = addPair(l1 as TeamKey, l2 as TeamKey, rows2);
      game2Done = done1 && done2;
    }
    return { stats, game1Decided, game2Done };
  }, [g1c1, g1c2, g2c1, g2c2, g1Outcome]);

  const setInput = (setter: any, index: number, key: string, val: string) => {
    const clamped = clampScore(val);
    setter((prev: any[]) => {
      const next = prev.slice();
      next[index] = { ...(next[index] || {}), [key]: clamped };
      return next;
    });
  };

  const headerCell = (text: string) => (
    <div className="text-[12px] font-semibold text-[#B20000]">{text}</div>
  );
  const rowCell = (content: ReactNode, emphasize = false) => (
    <div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>
  );

  const fmtDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  // Validation helpers
  const anySetTie = useMemo(() => {
    const checkRows = (rows: Array<Record<string, string>>, l: string, r: string) => rows.some(row => {
      const sl = row[l] ?? ''; const sr = row[r] ?? '';
      if (sl === '' || sr === '') return false;
      const nl = Number(sl), nr = Number(sr);
      return !Number.isNaN(nl) && !Number.isNaN(nr) && nl === nr;
    });
    return (
      checkRows(g1c1 as any, 'A','B') ||
      checkRows(g1c2 as any, 'C','D') ||
      g2c1.some(r => { const a=r.WC1??''; const b=r.WC2??''; return a!==''&&b!==''&&Number(a)===Number(b); }) ||
      g2c2.some(r => { const a=r.LC1??''; const b=r.LC2??''; return a!==''&&b!==''&&Number(a)===Number(b); })
    );
  }, [g1c1, g1c2, g2c1, g2c2]);

  const canSubmit = summary.game2Done && !anySetTie;

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  return (
    <form
      className="max-w-2xl shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        if (onSubmit) {
          onSubmit({
            teamNames,
            game1: {
              court1: g1c1.map((r, i) => ({ label: `Game 1 - Court 1 (Set ${i+1})`, scores: { A: r.A ?? '', B: r.B ?? '' } })),
              court2: g1c2.map((r, i) => ({ label: `Game 1 - Court 2 (Set ${i+1})`, scores: { C: r.C ?? '', D: r.D ?? '' } })),
            },
            game2: {
              court1: g2c1.map((r, i) => ({ label: `Game 2 - Court 1 (Set ${i+1})`, scores: { WC1: r.WC1 ?? '', WC2: r.WC2 ?? '' } })),
              court2: g2c2.map((r, i) => ({ label: `Game 2 - Court 2 (Set ${i+1})`, scores: { LC1: r.LC1 ?? '', LC2: r.LC2 ?? '' } })),
            },
            spares
          });
        }
      }}
    >
      {/* Team names */}
      <div className="bg-[#B20000] text-white rounded-t-lg px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {(['A','B','C','D'] as TeamKey[]).map((t) => (
            <div key={t} className="p-0">
              <div className="text-[11px] font-medium text-white/90">Position {t}</div>
              <div className="text-sm font-semibold text-white truncate" title={teamNames[t] || `Team ${t}`}>
                {teamNames[t] || `Team ${t}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#F8F8F8] rounded-b-lg px-3 sm:px-4 py-3 space-y-4">
        {/* Game 1 */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="text-sm font-semibold text-[#B20000] mb-2">Game 1</div>
          <div className="grid grid-cols-1 gap-0.5">
            {[0,1].map(i => {
              const row = g1c1[i] || {};
              const n1 = row.A === '' ? null : Number(row.A);
              const n2 = row.B === '' ? null : Number(row.B);
              const hasLeft = n1 !== null && !Number.isNaN(n1);
              const hasRight = n2 !== null && !Number.isNaN(n2);
              const both = hasLeft && hasRight;
              const isTie = both && n1 === n2;
              const diff = both && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0;
              return (
                <div key={`g1c1-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563]">Court 1 (Set {i+1})</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">A</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.A ?? ''} onChange={e => setInput(setG1C1, i, 'A', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n1 as number) > (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n1 as number) < (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">B</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.B ?? ''} onChange={e => setInput(setG1C1, i, 'B', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n2 as number) > (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n2 as number) < (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="h-px bg-gray-200 my-3" />
            {[0,1].map(i => {
              const row = g1c2[i] || {};
              const n1 = row.C === '' ? null : Number(row.C);
              const n2 = row.D === '' ? null : Number(row.D);
              const hasLeft = n1 !== null && !Number.isNaN(n1);
              const hasRight = n2 !== null && !Number.isNaN(n2);
              const both = hasLeft && hasRight;
              const isTie = both && n1 === n2;
              const diff = both && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0;
              return (
                <div key={`g1c2-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563]">Court 2 (Set {i+1})</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">C</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.C ?? ''} onChange={e => setInput(setG1C2, i, 'C', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n1 as number) > (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n1 as number) < (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-8 text-right">D</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.D ?? ''} onChange={e => setInput(setG1C2, i, 'D', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n2 as number) > (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n2 as number) < (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game 2 (dynamic) */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="text-sm font-semibold text-[#B20000] mb-2">Game 2</div>
          {/* Legend for dynamic pairings */}
          <div className="text-[12px] text-[#6B7280] mb-1">{g2Labels.WC1 || 'W-C1'} vs {g2Labels.WC2 || 'W-C2'}</div>
          <div className="grid grid-cols-1 gap-0.5">
            {[0,1].map(i => {
              const row = g2c1[i] || {};
              const n1 = row.WC1 === '' ? null : Number(row.WC1);
              const n2 = row.WC2 === '' ? null : Number(row.WC2);
              const hasLeft = n1 !== null && !Number.isNaN(n1);
              const hasRight = n2 !== null && !Number.isNaN(n2);
              const both = hasLeft && hasRight;
              const isTie = both && n1 === n2;
              const diff = both && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0;
              return (
                <div key={`g2c1-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563]">Court 1 (Set {i+1})</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-14 text-right">W-C1</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.WC1 ?? ''} onChange={e => setInput(setG2C1, i, 'WC1', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n1 as number) > (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n1 as number) < (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-14 text-right">W-C2</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.WC2 ?? ''} onChange={e => setInput(setG2C1, i, 'WC2', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n2 as number) > (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n2 as number) < (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Legend for losers pairing */}
            <div className="text-[12px] text-[#6B7280] mt-2 mb-1">{g2Labels.LC1 || 'L-C1'} vs {g2Labels.LC2 || 'L-C2'}</div>
            {[0,1].map(i => {
              const row = g2c2[i] || {};
              const n1 = row.LC1 === '' ? null : Number(row.LC1);
              const n2 = row.LC2 === '' ? null : Number(row.LC2);
              const hasLeft = n1 !== null && !Number.isNaN(n1);
              const hasRight = n2 !== null && !Number.isNaN(n2);
              const both = hasLeft && hasRight;
              const isTie = both && n1 === n2;
              const diff = both && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0;
              return (
                <div key={`g2c2-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                  <div className="text-[13px] text-[#4B5563]">Court 2 (Set {i+1})</div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-14 text-right">L-C1</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.LC1 ?? ''} onChange={e => setInput(setG2C2, i, 'LC1', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n1 as number) > (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n1 as number) < (n2 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-gray-600 w-14 text-right">L-C2</label>
                    <input type="number" inputMode="numeric" min={0} max={25} step={1}
                      value={row.LC2 ?? ''} onChange={e => setInput(setG2C2, i, 'LC2', e.target.value)} aria-invalid={isTie}
                      className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`}
                      placeholder="0" />
                    {both && !isTie && (n2 as number) > (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                    )}
                    {both && !isTie && (n2 as number) < (n1 as number) && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spare players sections */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {(['A','B','C','D'] as TeamKey[]).map((t) => (
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
            const order: TeamKey[] = ['A','B','C','D'];
            const allEntered = summary.game2Done && !anySetTie;

            // Movement (courts are sub-tiers):
            // - Court 1 winner: Up one tier to highest position (e.g., D). If top tier, Stay -> D
            // - Court 1 loser: Stay in same tier -> Court 2 C
            // - Court 2 winner: Stay in same tier -> Court 1 B
            // - Court 2 loser: Down one tier to A. If bottom tier, Stay -> A
            const move: Record<TeamKey, string> = { A:'Stay', B:'Stay', C:'Stay', D:'Stay' };
            if (summary.game2Done && g1Outcome.c1.decided && g1Outcome.c2.decided) {
              const w1 = (g1Outcome.c1.winner === 'L') ? 'A' : 'B';
              const l1 = (g1Outcome.c1.loser  === 'L') ? 'A' : 'B';
              const w2 = (g1Outcome.c2.winner === 'L') ? 'C' : 'D';
              const l2 = (g1Outcome.c2.loser  === 'L') ? 'C' : 'D';

              // Evaluate Game 2 Court 1 (winners match)
              let wc1Wins = 0, wc2Wins = 0, wcDiff = 0;
              for (const row of g2c1) {
                const s1 = row.WC1 ?? ''; const s2 = row.WC2 ?? '';
                if (s1 === '' || s2 === '') { wc1Wins = wc2Wins = 0; wcDiff = 0; break; }
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) { wc1Wins = wc2Wins = 0; wcDiff = 0; break; }
                wcDiff += (n1 - n2);
                if (n1 > n2) wc1Wins++; else wc2Wins++;
              }
              let g2c1Winner: TeamKey | null = null; let g2c1Loser: TeamKey | null = null;
              if (wc1Wins !== wc2Wins) { g2c1Winner = (wc1Wins > wc2Wins) ? (w1 as TeamKey) : (w2 as TeamKey); }
              else if (wcDiff !== 0) { g2c1Winner = (wcDiff > 0) ? (w1 as TeamKey) : (w2 as TeamKey); }
              if (g2c1Winner) {
                g2c1Loser = (g2c1Winner === (w1 as TeamKey)) ? (w2 as TeamKey) : (w1 as TeamKey);
                move[g2c1Winner] = isTopTier ? 'Stay -> A' : 'Up';
                move[g2c1Loser] = 'Stay -> Court 2 C';
              }

              // Evaluate Game 2 Court 2 (losers match)
              let lc1Wins = 0, lc2Wins = 0, lcDiff = 0;
              for (const row of g2c2) {
                const s1 = row.LC1 ?? ''; const s2 = row.LC2 ?? '';
                if (s1 === '' || s2 === '') { lc1Wins = lc2Wins = 0; lcDiff = 0; break; }
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) { lc1Wins = lc2Wins = 0; lcDiff = 0; break; }
                lcDiff += (n1 - n2);
                if (n1 > n2) lc1Wins++; else lc2Wins++;
              }
              let g2c2Winner: TeamKey | null = null; let g2c2Loser: TeamKey | null = null;
              if (lc1Wins !== lc2Wins) { g2c2Winner = (lc1Wins > lc2Wins) ? (l1 as TeamKey) : (l2 as TeamKey); }
              else if (lcDiff !== 0) { g2c2Winner = (lcDiff > 0) ? (l1 as TeamKey) : (l2 as TeamKey); }
              if (g2c2Winner) {
                g2c2Loser = (g2c2Winner === (l1 as TeamKey)) ? (l2 as TeamKey) : (l1 as TeamKey);
                move[g2c2Winner] = 'Stay -> Court 1 B';
                const isBottomTier = pointsTierOffset === 0;
                move[g2c2Loser] = isBottomTier ? 'Stay -> D' : 'Down';
              }
            }

            // Points recap: Base 3/4/5/6 (4th->1st) +3 per tier above lowest
            const tierDisplay = typeof tierNumber === 'number' ? tierNumber : (Math.max(0, pointsTierOffset) + 1);
            const tierBonus = 3 * Math.max(0, pointsTierOffset);
            const points: Record<TeamKey, number> = { A: 0, B: 0, C: 0, D: 0 };
            if (summary.game2Done) {
              // Determine ranks from Game 2 results
              const w1 = (g1Outcome.c1.winner === 'L') ? 'A' : 'B';
              const l1 = (g1Outcome.c1.loser  === 'L') ? 'A' : 'B';
              const w2 = (g1Outcome.c2.winner === 'L') ? 'C' : 'D';
              const l2 = (g1Outcome.c2.loser  === 'L') ? 'C' : 'D';
              // Winners match result
              let wc1Wins = 0, wc2Wins = 0, wcDiff = 0;
              for (const row of g2c1) {
                const s1 = row.WC1 ?? ''; const s2 = row.WC2 ?? '';
                if (s1 === '' || s2 === '') { wc1Wins = wc2Wins = 0; wcDiff = 0; break; }
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) { wc1Wins = wc2Wins = 0; wcDiff = 0; break; }
                wcDiff += (n1 - n2);
                if (n1 > n2) wc1Wins++; else wc2Wins++;
              }
              let c1Winner: TeamKey | null = null; let c1Loser: TeamKey | null = null;
              if (wc1Wins !== wc2Wins) { c1Winner = (wc1Wins > wc2Wins) ? (w1 as TeamKey) : (w2 as TeamKey); }
              else if (wcDiff !== 0) { c1Winner = (wcDiff > 0) ? (w1 as TeamKey) : (w2 as TeamKey); }
              if (c1Winner) c1Loser = (c1Winner === (w1 as TeamKey)) ? (w2 as TeamKey) : (w1 as TeamKey);

              // Losers match result
              let lc1Wins = 0, lc2Wins = 0, lcDiff = 0;
              for (const row of g2c2) {
                const s1 = row.LC1 ?? ''; const s2 = row.LC2 ?? '';
                if (s1 === '' || s2 === '') { lc1Wins = lc2Wins = 0; lcDiff = 0; break; }
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) { lc1Wins = lc2Wins = 0; lcDiff = 0; break; }
                lcDiff += (n1 - n2);
                if (n1 > n2) lc1Wins++; else lc2Wins++;
              }
              let c2Winner: TeamKey | null = null; let c2Loser: TeamKey | null = null;
              if (lc1Wins !== lc2Wins) { c2Winner = (lc1Wins > lc2Wins) ? (l1 as TeamKey) : (l2 as TeamKey); }
              else if (lcDiff !== 0) { c2Winner = (lcDiff > 0) ? (l1 as TeamKey) : (l2 as TeamKey); }
              if (c2Winner) c2Loser = (c2Winner === (l1 as TeamKey)) ? (l2 as TeamKey) : (l1 as TeamKey);

              if (c1Winner && c1Loser && c2Winner && c2Loser) {
                const rank4 = c2Loser as TeamKey; // 4th
                const rank3 = c2Winner as TeamKey; // 3rd
                const rank2 = c1Loser as TeamKey;  // 2nd
                const rank1 = c1Winner as TeamKey; // 1st
                const base = [3,4,5,6];
                points[rank4] = base[0] + tierBonus;
                points[rank3] = base[1] + tierBonus;
                points[rank2] = base[2] + tierBonus;
                points[rank1] = base[3] + tierBonus;
              }
            }

            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">{resultsLabel ?? 'Weekly Summary'}</div>
                <span className="absolute right-4 top-3 text-[11px] text-[#4B5563]">
                  <span className="font-semibold">Tier {tierDisplay}:</span> Base 3/4/5/6 Bonus +{tierBonus}
                </span>
                <div className="grid grid-cols-5 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {headerCell('Differential')}
                  {headerCell('Movement')}
                  {headerCell('Points')}
                  {order.map(k => (
                    <Fragment key={`sum-${k}`}>
                      {rowCell(k, true)}
                      {rowCell(`${summary.stats[k].setWins}-${summary.stats[k].setLosses}`)}
                      {rowCell(fmtDiff(summary.stats[k].diff))}
                      {rowCell(allEntered ? move[k] : '-')}
                      {rowCell(allEntered ? `+${points[k] || 0}` : '-', true)}
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px]">
            {anySetTie && <span className="text-red-600">Resolve all ties: scores cannot be equal.</span>}
            {!anySetTie && !canSubmit && <span className="text-gray-600">Complete Game 1 and Game 2 (both courts) to enable submit.</span>}
          </span>
          <Button type="submit" size="sm" disabled={submitting || !canSubmit}
            className="rounded-[10px] px-4 py-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed">
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </div>
    </form>
  );
}
