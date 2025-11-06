import React, { useEffect, useMemo, useState } from 'react';

type TeamKey = 'A'|'B'|'C'|'D'|'E'|'F';

interface Scorecard6TeamsHeadToHeadProps {
  teamNames: Record<TeamKey, string>;
  onSubmit?: (payload: {
    teamNames: Record<TeamKey, string>;
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
    spares: Record<TeamKey, string>;
  }) => void;
  isTopTier?: boolean;
  pointsTierOffset?: number;
  tierNumber?: number;
  resultsLabel?: string;
  initial?: {
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
    spares?: Record<TeamKey, string>;
  };
  submitting?: boolean;
}

const clampScore = (value: string): string => {
  if (value === '') return '';
  const n = Math.floor(Number(value));
  if (Number.isNaN(n)) return '';
  return String(Math.max(0, Math.min(25, n)));
};

export function Scorecard6TeamsHeadToHead({
  teamNames,
  onSubmit,
  initial,
  submitting = false,
  isTopTier = false,
  pointsTierOffset = 0,
  tierNumber,
  resultsLabel
}: Scorecard6TeamsHeadToHeadProps) {
  // Game 1 inputs (2 sets each)
  const [g1c1, setG1C1] = useState<Array<{ A?: string; B?: string }>>([{},{ }]);
  const [g1c2, setG1C2] = useState<Array<{ C?: string; D?: string }>>([{},{ }]);
  const [g1c3, setG1C3] = useState<Array<{ E?: string; F?: string }>>([{},{ }]);

  // Game 2 inputs with new pairing structure
  const [g2c1, setG2C1] = useState<Array<{ G2C1_L?: string; G2C1_R?: string }>>([{},{ }]); // Winner C1 vs Winner C2
  const [g2c2, setG2C2] = useState<Array<{ G2C2_L?: string; G2C2_R?: string }>>([{},{ }]); // Loser C1 vs Winner C3
  const [g2c3, setG2C3] = useState<Array<{ G2C3_L?: string; G2C3_R?: string }>>([{},{ }]); // Loser C2 vs Loser C3

  // Spares
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '', D: '', E: '', F: '' });

  useEffect(() => {
    if (!initial) return;
    if (initial.game1?.court1?.length) setG1C1(initial.game1.court1.map(r => ({ A: (r.scores as any).A ?? '', B: (r.scores as any).B ?? '' })) as any);
    if (initial.game1?.court2?.length) setG1C2(initial.game1.court2.map(r => ({ C: (r.scores as any).C ?? '', D: (r.scores as any).D ?? '' })) as any);
    if (initial.game1?.court3?.length) setG1C3(initial.game1.court3.map(r => ({ E: (r.scores as any).E ?? '', F: (r.scores as any).F ?? '' })) as any);
    if (initial.game2?.court1?.length) setG2C1(initial.game2.court1.map(r => ({ G2C1_L: (r.scores as any).G2C1_L ?? '', G2C1_R: (r.scores as any).G2C1_R ?? '' })) as any);
    if (initial.game2?.court2?.length) setG2C2(initial.game2.court2.map(r => ({ G2C2_L: (r.scores as any).G2C2_L ?? '', G2C2_R: (r.scores as any).G2C2_R ?? '' })) as any);
    if (initial.game2?.court3?.length) setG2C3(initial.game2.court3.map(r => ({ G2C3_L: (r.scores as any).G2C3_L ?? '', G2C3_R: (r.scores as any).G2C3_R ?? '' })) as any);
    if (initial.spares) {
      setSpares({ A: initial.spares.A || '', B: initial.spares.B || '', C: initial.spares.C || '', D: initial.spares.D || '', E: initial.spares.E || '', F: initial.spares.F || '' });
    }
  }, [initial]);

  const setInput = <T extends Record<string, any>>(setter: (fn: (prev: T[]) => T[]) => void, rowIndex: number, key: string, value: string) => {
    setter(prev => {
      const cp = prev.slice();
      const row = { ...(cp[rowIndex] || {}) } as any;
      row[key] = clampScore(value);
      cp[rowIndex] = row;
      return cp as any;
    });
  };

  // Determine winners/losers of Game 1 for all three courts
  const g1Outcome = useMemo(() => {
    const evalRows = (rows: Array<Record<string, string>>, L: string, R: string) => {
      let lw=0, rw=0, diff=0;
      for(const r of rows){
        const sl=r[L]??''; const sr=r[R]??'';
        if(sl===''||sr==='') return { decided:false as const };
        const nl=Number(sl), nr=Number(sr);
        if(Number.isNaN(nl)||Number.isNaN(nr)||nl===nr) return { decided:false as const };
        diff += (nl-nr);
        if(nl>nr) lw++; else rw++;
      }

      // If sets are tied, use differential as tie-breaker
      if (lw===rw) {
        if (diff===0) {
          // If both sets and differential are tied, use positional tie-breaker (A > B > C > D > E > F)
          return { decided:true as const, winner: 'L', loser: 'R' }; // Left position always beats right position
        }
        return { decided:true as const, winner: diff>0? 'L':'R', loser: diff>0? 'R':'L' };
      }

      // Clear set winner
      return { decided:true as const, winner: lw>rw? 'L':'R', loser: lw>rw? 'R':'L' };
    };
    return {
      c1: evalRows(g1c1 as any, 'A','B'),
      c2: evalRows(g1c2 as any, 'C','D'),
      c3: evalRows(g1c3 as any, 'E','F')
    };
  }, [g1c1, g1c2, g1c3]);

  const g2Labels = useMemo(() => {
    const labels = {
      G2C1_L: '', G2C1_R: '',  // Court 1: Winner C1 vs Winner C2
      G2C2_L: '', G2C2_R: '',  // Court 2: Loser C1 vs Winner C3
      G2C3_L: '', G2C3_R: ''   // Court 3: Loser C2 vs Loser C3
    };

    if (g1Outcome.c1.decided && g1Outcome.c2.decided && g1Outcome.c3.decided) {
      // Court 1: Winner Court 1 vs Winner Court 2
      labels.G2C1_L = (g1Outcome.c1.winner === 'L') ? teamNames.A : teamNames.B; // Winner C1
      labels.G2C1_R = (g1Outcome.c2.winner === 'L') ? teamNames.C : teamNames.D; // Winner C2

      // Court 2: Loser Court 1 vs Winner Court 3
      labels.G2C2_L = (g1Outcome.c1.loser === 'L') ? teamNames.A : teamNames.B;  // Loser C1
      labels.G2C2_R = (g1Outcome.c3.winner === 'L') ? teamNames.E : teamNames.F; // Winner C3

      // Court 3: Loser Court 2 vs Loser Court 3
      labels.G2C3_L = (g1Outcome.c2.loser === 'L') ? teamNames.C : teamNames.D;  // Loser C2
      labels.G2C3_R = (g1Outcome.c3.loser === 'L') ? teamNames.E : teamNames.F;  // Loser C3
    }
    return labels;
  }, [g1Outcome, teamNames]);

  const anySetTie = useMemo(() => {
    const check = (rows: Array<Record<string,string>>, L: string, R: string) => rows.some(r => { const sl=r[L]??''; const sr=r[R]??''; if(sl===''||sr==='') return false; const nl=Number(sl), nr=Number(sr); return !Number.isNaN(nl)&&!Number.isNaN(nr)&&nl===nr; });
    return (
      check(g1c1 as any,'A','B') || check(g1c2 as any,'C','D') || check(g1c3 as any,'E','F') ||
      g2c1.some(r => { const a=r.G2C1_L??''; const b=r.G2C1_R??''; return a!==''&&b!==''&&Number(a)===Number(b); }) ||
      g2c2.some(r => { const a=r.G2C2_L??''; const b=r.G2C2_R??''; return a!==''&&b!==''&&Number(a)===Number(b); }) ||
      g2c3.some(r => { const a=r.G2C3_L??''; const b=r.G2C3_R??''; return a!==''&&b!==''&&Number(a)===Number(b); })
    );
  }, [g1c1,g1c2,g1c3,g2c1,g2c2,g2c3]);

  const game1Done = useMemo(() => {
    const has = (rows: Array<Record<string,string>>, L:string, R:string) => rows.every(r => { const sl=r[L]??''; const sr=r[R]??''; if(sl===''||sr==='') return false; const nl=Number(sl), nr=Number(sr); return !Number.isNaN(nl)&&!Number.isNaN(nr)&&nl!==nr; });
    return has(g1c1 as any,'A','B') && has(g1c2 as any,'C','D') && has(g1c3 as any,'E','F');
  }, [g1c1,g1c2,g1c3]);

  const game2Ready = g1Outcome.c1.decided && g1Outcome.c2.decided && g1Outcome.c3.decided;
  const game2Done = useMemo(() => {
    const has = (rows: Array<Record<string,string>>, L:string, R:string) => rows.every(r => { const sl=r[L]??''; const sr=r[R]??''; if(sl===''||sr==='') return false; const nl=Number(sl), nr=Number(sr); return !Number.isNaN(nl)&&!Number.isNaN(nr)&&nl!==nr; });
    return has(g2c1 as any,'G2C1_L','G2C1_R') && has(g2c2 as any,'G2C2_L','G2C2_R') && has(g2c3 as any,'G2C3_L','G2C3_R');
  }, [g2c1,g2c2,g2c3]);

  // Summary: compute weekly record and differential for A-F using both games
  const summary = useMemo(() => {
    const stats: Record<TeamKey, { setWins: number; setLosses: number; diff: number }> = {
      A: { setWins: 0, setLosses: 0, diff: 0 },
      B: { setWins: 0, setLosses: 0, diff: 0 },
      C: { setWins: 0, setLosses: 0, diff: 0 },
      D: { setWins: 0, setLosses: 0, diff: 0 },
      E: { setWins: 0, setLosses: 0, diff: 0 },
      F: { setWins: 0, setLosses: 0, diff: 0 },
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
    const g1c3Done = addPair('E','F', g1c3 as any);
    const game1Decided = g1c1Done && g1c2Done && g1c3Done && g1Outcome.c1.decided && g1Outcome.c2.decided && g1Outcome.c3.decided;
    let game2Done = false;
    if (game1Decided && game2Ready) {
      // Map dynamic labels to actual teams for Game 2
      const wc1 = (g1Outcome.c1.winner === 'L') ? 'A' : 'B'; // Winner C1
      const wc2 = (g1Outcome.c2.winner === 'L') ? 'C' : 'D'; // Winner C2
      const lc1 = (g1Outcome.c1.loser === 'L') ? 'A' : 'B';  // Loser C1
      const wc3 = (g1Outcome.c3.winner === 'L') ? 'E' : 'F'; // Winner C3
      const lc2 = (g1Outcome.c2.loser === 'L') ? 'C' : 'D';  // Loser C2
      const lc3 = (g1Outcome.c3.loser === 'L') ? 'E' : 'F';  // Loser C3

      // Court 1: Winner C1 vs Winner C2
      const rows1 = g2c1.map(r => ({ [wc1]: r.G2C1_L ?? '', [wc2]: r.G2C1_R ?? '' })) as Array<Record<string, string>>;
      // Court 2: Loser C1 vs Winner C3
      const rows2 = g2c2.map(r => ({ [lc1]: r.G2C2_L ?? '', [wc3]: r.G2C2_R ?? '' })) as Array<Record<string, string>>;
      // Court 3: Loser C2 vs Loser C3
      const rows3 = g2c3.map(r => ({ [lc2]: r.G2C3_L ?? '', [lc3]: r.G2C3_R ?? '' })) as Array<Record<string, string>>;
      const done1 = addPair(wc1 as TeamKey, wc2 as TeamKey, rows1);
      const done2 = addPair(lc1 as TeamKey, wc3 as TeamKey, rows2);
      const done3 = addPair(lc2 as TeamKey, lc3 as TeamKey, rows3);
      game2Done = done1 && done2 && done3;
    }
    return { stats, game1Decided, game2Done };
  }, [g1c1, g1c2, g1c3, g2c1, g2c2, g2c3, g1Outcome, game2Ready]);

  // Helper functions for summary table
  const headerCell = (text: string) => (
    <div className="text-[12px] font-semibold text-[#B20000]">{text}</div>
  );
  const rowCell = (content: React.ReactNode, emphasize = false) => (
    <div className={`text-[12px] text-[#4B5563] ${emphasize ? 'font-semibold' : ''}`}>{content}</div>
  );
  const fmtDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  const canSubmit = game1Done && game2Ready && game2Done && !anySetTie;

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  return (
    <form
      className="max-w-3xl shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit && onSubmit({
          teamNames,
          game1: {
            court1: g1c1.map((r,i)=>({ label: `Game 1 - Court 1 (Set ${i+1})`, scores: { A: r.A ?? '', B: r.B ?? '' } })),
            court2: g1c2.map((r,i)=>({ label: `Game 1 - Court 2 (Set ${i+1})`, scores: { C: r.C ?? '', D: r.D ?? '' } })),
            court3: g1c3.map((r,i)=>({ label: `Game 1 - Court 3 (Set ${i+1})`, scores: { E: r.E ?? '', F: r.F ?? '' } })),
          },
          game2: {
            court1: g2c1.map((r,i)=>({ label: `Game 2 - Court 1 (Set ${i+1})`, scores: { G2C1_L: r.G2C1_L ?? '', G2C1_R: r.G2C1_R ?? '' } })),
            court2: g2c2.map((r,i)=>({ label: `Game 2 - Court 2 (Set ${i+1})`, scores: { G2C2_L: r.G2C2_L ?? '', G2C2_R: r.G2C2_R ?? '' } })),
            court3: g2c3.map((r,i)=>({ label: `Game 2 - Court 3 (Set ${i+1})`, scores: { G2C3_L: r.G2C3_L ?? '', G2C3_R: r.G2C3_R ?? '' } })),
          },
          spares
        });
      }}
    >
      {/* Team names banner */}
      <div className="bg-[#B20000] text-white rounded-t-lg px-4 py-3">
        <div className="space-y-2">
          {/* First row: A, B, C */}
          <div className="grid grid-cols-3 gap-2">
            {(['A','B','C'] as TeamKey[]).map(k => (
              <div key={k}>
                <div className="text-[11px] font-medium text-white/90">Position {k}</div>
                <div className="text-sm font-semibold truncate" title={teamNames[k] || `Team ${k}`}>
                  {teamNames[k] || `Team ${k}`}
                </div>
              </div>
            ))}
          </div>
          {/* Second row: D, E, F */}
          <div className="grid grid-cols-3 gap-2">
            {(['D','E','F'] as TeamKey[]).map(k => (
              <div key={k}>
                <div className="text-[11px] font-medium text-white/90">Position {k}</div>
                <div className="text-sm font-semibold truncate" title={teamNames[k] || `Team ${k}`}>
                  {teamNames[k] || `Team ${k}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#F8F8F8] rounded-b-lg px-3 sm:px-4 py-3 space-y-4">
        {/* Game 1 */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="text-sm font-semibold text-[#B20000] mb-2">Game 1</div>
          {/* Court 1 (A vs B) */}
          {[0,1].map(i => {
            const row = g1c1[i]||{}; const n1=row.A===''?null:Number(row.A); const n2=row.B===''?null:Number(row.B);
            const hasLeft = n1 !== null && !Number.isNaN(n1);
            const hasRight = n2 !== null && !Number.isNaN(n2);
            const both = hasLeft && hasRight;
            const tie = both && n1===n2;
            const diff = both && !tie ? Math.abs((n1 as number)-(n2 as number)) : 0;
            return (
              <div key={`g1c1-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                <div className="text-[13px] text-[#4B5563]">Court 1 (Set {i+1})</div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-8 text-right">A</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.A ?? ''} onChange={e=>setInput(setG1C1,i,'A',e.target.value)} aria-invalid={!!tie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${tie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !tie && (n1 as number) > (n2 as number) && (<span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>)}
                  {both && !tie && (n1 as number) < (n2 as number) && (<span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>)}
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-8 text-right">B</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.B ?? ''} onChange={e=>setInput(setG1C1,i,'B',e.target.value)} aria-invalid={!!tie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${tie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !tie && (n2 as number) > (n1 as number) && (<span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>)}
                  {both && !tie && (n2 as number) < (n1 as number) && (<span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>)}
                </div>
              </div>
            );
          })}
          <div className="h-px bg-gray-200 my-3" />
          {/* Court 2 (C vs D) */}
          {[0,1].map(i => {
            const row = g1c2[i]||{}; const n1=row.C===''?null:Number(row.C); const n2=row.D===''?null:Number(row.D);
            const hasLeft = n1 !== null && !Number.isNaN(n1);
            const hasRight = n2 !== null && !Number.isNaN(n2);
            const both = hasLeft && hasRight;
            const tie = both && n1===n2; const diff = both && !tie ? Math.abs((n1 as number)-(n2 as number)) : 0;
            return (
              <div key={`g1c2-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                <div className="text-[13px] text-[#4B5563]">Court 2 (Set {i+1})</div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-8 text-right">C</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.C ?? ''} onChange={e=>setInput(setG1C2,i,'C',e.target.value)} aria-invalid={!!tie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${tie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !tie && (n1 as number) > (n2 as number) && (<span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>)}
                  {both && !tie && (n1 as number) < (n2 as number) && (<span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>)}
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-8 text-right">D</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.D ?? ''} onChange={e=>setInput(setG1C2,i,'D',e.target.value)} aria-invalid={!!tie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${tie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !tie && (n2 as number) > (n1 as number) && (<span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>)}
                  {both && !tie && (n2 as number) < (n1 as number) && (<span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>)}
                </div>
              </div>
            );
          })}
          <div className="h-px bg-gray-200 my-3" />
          {/* Court 3 (E vs F) */}
          {[0,1].map(i => {
            const row = g1c3[i]||{}; const n1=row.E===''?null:Number(row.E); const n2=row.F===''?null:Number(row.F);
            const hasLeft = n1 !== null && !Number.isNaN(n1);
            const hasRight = n2 !== null && !Number.isNaN(n2);
            const both = hasLeft && hasRight;
            const tie = both && n1===n2; const diff = both && !tie ? Math.abs((n1 as number)-(n2 as number)) : 0;
            return (
              <div key={`g1c3-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                <div className="text-[13px] text-[#4B5563]">Court 3 (Set {i+1})</div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-8 text-right">E</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.E ?? ''} onChange={e=>setInput(setG1C3,i,'E',e.target.value)} aria-invalid={!!tie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${tie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !tie && (n1 as number) > (n2 as number) && (<span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>)}
                  {both && !tie && (n1 as number) < (n2 as number) && (<span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>)}
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-8 text-right">F</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.F ?? ''} onChange={e=>setInput(setG1C3,i,'F',e.target.value)} aria-invalid={!!tie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${tie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !tie && (n2 as number) > (n1 as number) && (<span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>)}
                  {both && !tie && (n2 as number) < (n1 as number) && (<span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Game 2 */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="text-sm font-semibold text-[#B20000] mb-2">Game 2</div>
          {/* Legend for dynamic pairings */}
          <div className="text-[12px] text-[#6B7280] mb-1">{g2Labels.G2C1_L || 'Winner C1'} vs {g2Labels.G2C1_R || 'Winner C2'}</div>
          {/* Court 1: Winner C1 vs Winner C2 */}
          {[0,1].map(i => {
            const row = g2c1[i] || {};
            const n1 = row.G2C1_L === '' ? null : Number(row.G2C1_L);
            const n2 = row.G2C1_R === '' ? null : Number(row.G2C1_R);
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
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.G2C1_L ?? ''} onChange={e=>setInput(setG2C1,i,'G2C1_L',e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !isTie && (n1 as number) > (n2 as number) && (
                    <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                  )}
                  {both && !isTie && (n1 as number) < (n2 as number) && (
                    <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-14 text-right">W-C2</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.G2C1_R ?? ''} onChange={e=>setInput(setG2C1,i,'G2C1_R',e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
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
          {/* Legend for Court 2 pairing */}
          <div className="text-[12px] text-[#6B7280] mt-2 mb-1">{g2Labels.G2C2_L || 'Loser C1'} vs {g2Labels.G2C2_R || 'Winner C3'}</div>
          {/* Court 2: Loser C1 vs Winner C3 */}
          {[0,1].map(i => {
            const row = g2c2[i] || {};
            const n1 = row.G2C2_L === '' ? null : Number(row.G2C2_L);
            const n2 = row.G2C2_R === '' ? null : Number(row.G2C2_R);
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
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.G2C2_L ?? ''} onChange={e=>setInput(setG2C2,i,'G2C2_L',e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !isTie && (n1 as number) > (n2 as number) && (
                    <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                  )}
                  {both && !isTie && (n1 as number) < (n2 as number) && (
                    <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-14 text-right">W-C3</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.G2C2_R ?? ''} onChange={e=>setInput(setG2C2,i,'G2C2_R',e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
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
          {/* Legend for Court 3 pairing */}
          <div className="text-[12px] text-[#6B7280] mt-2 mb-1">{g2Labels.G2C3_L || 'Loser C2'} vs {g2Labels.G2C3_R || 'Loser C3'}</div>
          {/* Court 3: Loser C2 vs Loser C3 */}
          {[0,1].map(i => {
            const row = g2c3[i] || {};
            const n1 = row.G2C3_L === '' ? null : Number(row.G2C3_L);
            const n2 = row.G2C3_R === '' ? null : Number(row.G2C3_R);
            const hasLeft = n1 !== null && !Number.isNaN(n1);
            const hasRight = n2 !== null && !Number.isNaN(n2);
            const both = hasLeft && hasRight;
            const isTie = both && n1 === n2;
            const diff = both && !isTie ? Math.abs((n1 as number) - (n2 as number)) : 0;
            return (
              <div key={`g2c3-${i}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-1 py-0.5">
                <div className="text-[13px] text-[#4B5563]">Court 3 (Set {i+1})</div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-14 text-right">L-C2</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.G2C3_L ?? ''} onChange={e=>setInput(setG2C3,i,'G2C3_L',e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasLeft ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
                  {both && !isTie && (n1 as number) > (n2 as number) && (
                    <span className="ml-2 text-[10px] font-semibold text-green-700">W +{diff}</span>
                  )}
                  {both && !isTie && (n1 as number) < (n2 as number) && (
                    <span className="ml-2 text-[10px] font-semibold text-red-600">L -{diff}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-gray-600 w-14 text-right">L-C3</label>
                  <input type="number" inputMode="numeric" min={0} max={25} step={1} value={row.G2C3_R ?? ''} onChange={e=>setInput(setG2C3,i,'G2C3_R',e.target.value)} aria-invalid={isTie} className={`w-16 px-2 py-1 border rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60 ${isTie ? 'border-red-400' : (hasRight ? 'border-green-400' : 'border-yellow-300')}`} placeholder="0" />
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

        {/* Spare players sections */}
        <div className="space-y-2">
          {/* First row: Teams A, B, C */}
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
          {/* Second row: Teams D, E, F */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['D','E','F'] as TeamKey[]).map((t) => (
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
        </div>

        {/* Weekly summary */}
        <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] relative">
          {(() => {
            const order: TeamKey[] = ['A','B','C','D','E','F'];
            const allEntered = summary.game2Done && !anySetTie;

            // Create array of teams with their Game 2 stats ONLY for ranking (winner calc per requirements)
            let teamStats: Array<{team: TeamKey, setWins: number, diff: number, prevPosition: TeamKey}> = [];
            let g2Display: Record<TeamKey, number> = { A:0, B:0, C:0, D:0, E:0, F:0 };
            if (summary.game2Done && game2Ready) {
              // Build Game 2 pairings (winners/losers from Game 1)
              const wc1 = (g1Outcome.c1.winner === 'L') ? 'A' : 'B'; // Winner C1
              const wc2 = (g1Outcome.c2.winner === 'L') ? 'C' : 'D'; // Winner C2
              const lc1 = (g1Outcome.c1.loser === 'L') ? 'A' : 'B';  // Loser C1
              const wc3 = (g1Outcome.c3.winner === 'L') ? 'E' : 'F'; // Winner C3
              const lc2 = (g1Outcome.c2.loser === 'L') ? 'C' : 'D';  // Loser C2
              const lc3 = (g1Outcome.c3.loser === 'L') ? 'E' : 'F';  // Loser C3

              // Initialize Game 2 stats
              const g2Stats: Record<TeamKey, { setWins: number; diff: number }> = {
                A: { setWins: 0, diff: 0 },
                B: { setWins: 0, diff: 0 },
                C: { setWins: 0, diff: 0 },
                D: { setWins: 0, diff: 0 },
                E: { setWins: 0, diff: 0 },
                F: { setWins: 0, diff: 0 },
              };

              const applyRows = (lKey: TeamKey, rKey: TeamKey, rows: Array<Record<string, string>>) => {
                for (const row of rows) {
                  const sl = row[lKey] ?? '';
                  const sr = row[rKey] ?? '';
                  if (sl === '' || sr === '') continue;
                  const nl = Number(sl), nr = Number(sr);
                  if (Number.isNaN(nl) || Number.isNaN(nr) || nl === nr) continue;
                  g2Stats[lKey].diff += (nl - nr);
                  g2Stats[rKey].diff += (nr - nl);
                  if (nl > nr) { g2Stats[lKey].setWins++; } else { g2Stats[rKey].setWins++; }
                }
              };

              // Map Game 2 rows to actual teams
              const rows1 = g2c1.map(r => ({ [wc1]: r.G2C1_L ?? '', [wc2]: r.G2C1_R ?? '' })) as Array<Record<string, string>>;
              const rows2 = g2c2.map(r => ({ [lc1]: r.G2C2_L ?? '', [wc3]: r.G2C2_R ?? '' })) as Array<Record<string, string>>;
              const rows3 = g2c3.map(r => ({ [lc2]: r.G2C3_L ?? '', [lc3]: r.G2C3_R ?? '' })) as Array<Record<string, string>>;

              applyRows(wc1 as TeamKey, wc2 as TeamKey, rows1);
              applyRows(lc1 as TeamKey, wc3 as TeamKey, rows2);
              applyRows(lc2 as TeamKey, lc3 as TeamKey, rows3);

              teamStats = order.map(team => ({
                team,
                setWins: g2Stats[team].setWins,
                diff: g2Stats[team].diff,
                prevPosition: team // A=1, B=2, C=3, D=4, E=5, F=6 (for tie-breaking)
              }));
              g2Display = {
                A: g2Stats.A.diff,
                B: g2Stats.B.diff,
                C: g2Stats.C.diff,
                D: g2Stats.D.diff,
                E: g2Stats.E.diff,
                F: g2Stats.F.diff,
              };

              // Sort teams by: 1) Game 2 set wins (desc), 2) Game 2 differential (desc), 3) Previous position (asc)
              teamStats.sort((a, b) => {
                if (a.setWins !== b.setWins) return b.setWins - a.setWins; // Higher wins first
                if (a.diff !== b.diff) return b.diff - a.diff; // Higher diff first
                return a.prevPosition.localeCompare(b.prevPosition); // A > B > C > D > E > F
              });

            }

            // Movement logic by court outcomes (Game 2 only)
            const move: Record<TeamKey, string> = { A:'Stay', B:'Stay', C:'Stay', D:'Stay', E:'Stay', F:'Stay' };
            let orderedByCourt: TeamKey[] = [];
            if (summary.game2Done && game2Ready) {
              // Determine final rankings based on Game 2 results (by court)
              const wc1 = (g1Outcome.c1.winner === 'L') ? 'A' : 'B'; // Winner C1
              const wc2 = (g1Outcome.c2.winner === 'L') ? 'C' : 'D'; // Winner C2
              const lc1 = (g1Outcome.c1.loser === 'L') ? 'A' : 'B';  // Loser C1
              const wc3 = (g1Outcome.c3.winner === 'L') ? 'E' : 'F'; // Winner C3
              const lc2 = (g1Outcome.c2.loser === 'L') ? 'C' : 'D';  // Loser C2
              const lc3 = (g1Outcome.c3.loser === 'L') ? 'E' : 'F';  // Loser C3

              // Evaluate Game 2 Court 1 (Winner C1 vs Winner C2)
              let g2c1Winner: TeamKey | null = null, g2c1Loser: TeamKey | null = null;
              let c1Wins = 0, c1Diff = 0;
              for (const row of g2c1) {
                const s1 = row.G2C1_L ?? ''; const s2 = row.G2C1_R ?? '';
                if (s1 === '' || s2 === '') break;
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) break;
                c1Diff += (n1 - n2);
                if (n1 > n2) c1Wins++; else c1Wins--;
              }
              if (c1Wins !== 0 || c1Diff !== 0) {
                const winnerIsLeft = c1Wins > 0 || (c1Wins === 0 && c1Diff > 0);
                g2c1Winner = winnerIsLeft ? (wc1 as TeamKey) : (wc2 as TeamKey);
                g2c1Loser = winnerIsLeft ? (wc2 as TeamKey) : (wc1 as TeamKey);
              }

              // Evaluate Game 2 Court 2 (Loser C1 vs Winner C3)
              let g2c2Winner: TeamKey | null = null, g2c2Loser: TeamKey | null = null;
              let c2Wins = 0, c2Diff = 0;
              for (const row of g2c2) {
                const s1 = row.G2C2_L ?? ''; const s2 = row.G2C2_R ?? '';
                if (s1 === '' || s2 === '') break;
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) break;
                c2Diff += (n1 - n2);
                if (n1 > n2) c2Wins++; else c2Wins--;
              }
              if (c2Wins !== 0 || c2Diff !== 0) {
                const winnerIsLeft = c2Wins > 0 || (c2Wins === 0 && c2Diff > 0);
                g2c2Winner = winnerIsLeft ? (lc1 as TeamKey) : (wc3 as TeamKey);
                g2c2Loser = winnerIsLeft ? (wc3 as TeamKey) : (lc1 as TeamKey);
              }

              // Evaluate Game 2 Court 3 (Loser C2 vs Loser C3)
              let g2c3Winner: TeamKey | null = null, g2c3Loser: TeamKey | null = null;
              let c3Wins = 0, c3Diff = 0;
              for (const row of g2c3) {
                const s1 = row.G2C3_L ?? ''; const s2 = row.G2C3_R ?? '';
                if (s1 === '' || s2 === '') break;
                const n1 = Number(s1), n2 = Number(s2);
                if (Number.isNaN(n1) || Number.isNaN(n2) || n1 === n2) break;
                c3Diff += (n1 - n2);
                if (n1 > n2) c3Wins++; else c3Wins--;
              }
              if (c3Wins !== 0 || c3Diff !== 0) {
                const winnerIsLeft = c3Wins > 0 || (c3Wins === 0 && c3Diff > 0);
                g2c3Winner = winnerIsLeft ? (lc2 as TeamKey) : (lc3 as TeamKey);
                g2c3Loser = winnerIsLeft ? (lc3 as TeamKey) : (lc2 as TeamKey);
              }

              // Assign movement based on court results
              if (summary.game2Done && game2Ready) {
                const isBottomTier = pointsTierOffset === 0;
                orderedByCourt = [
                  (g2c1Winner || wc1) as TeamKey,
                  (g2c1Loser || wc2) as TeamKey,
                  (g2c2Winner || lc1) as TeamKey,
                  (g2c2Loser || wc3) as TeamKey,
                  (g2c3Winner || lc2) as TeamKey,
                  (g2c3Loser || lc3) as TeamKey,
                ];

                const c1w = orderedByCourt[0], c1l = orderedByCourt[1], c2w = orderedByCourt[2], c2l = orderedByCourt[3], c3w = orderedByCourt[4], c3l = orderedByCourt[5];
                move[c1w] = isTopTier ? 'Stay -> A' : 'Up tier -> F';
                move[c1l] = 'Same tier -> C';
                move[c2w] = 'Same tier -> B';
                move[c2l] = 'Same tier -> E';
                move[c3w] = 'Same tier -> D';
                move[c3l] = isBottomTier ? 'Stay -> F' : 'Down tier -> A';
              }
            }

            // Points recap: Base 3/4/5/6/7/8 (6th->1st) +5 per tier above lowest
            const tierDisplay = typeof tierNumber === 'number' ? tierNumber : (Math.max(0, pointsTierOffset) + 1);
            const tierBonus = 5 * Math.max(0, pointsTierOffset);
            const points: Record<TeamKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

            // Calculate points based on Game 2 court outcomes
            if (summary.game2Done && game2Ready && orderedByCourt.length === 6) {
              const baseByCourtOrder = [8,7,6,5,4,3]; // C1W, C1L, C2W, C2L, C3W, C3L
              orderedByCourt.forEach((team, idx) => {
                points[team] = baseByCourtOrder[idx] + tierBonus;
              });
            }

            return (
              <div>
                <div className="text-[12px] font-medium mb-2 text-[#B20000]">{resultsLabel ?? 'Weekly Summary'}</div>
                <span className="absolute right-4 top-3 text-[11px] text-[#4B5563]">
                  <span className="font-semibold">Tier {tierDisplay}:</span> Base 3/4/5/6/7/8 Bonus +{tierBonus}
                </span>
                <div className="grid grid-cols-5 gap-x-4 items-center">
                  {headerCell('Team')}
                  {headerCell('Record')}
                  {headerCell('Differential')}
                  {headerCell('Movement')}
                  {headerCell('Points')}
                  {order.map(k => (
                    <React.Fragment key={`sum-${k}`}>
                      {rowCell(k, true)}
                      {rowCell(`${summary.stats[k].setWins}-${summary.stats[k].setLosses}`)}
                      {rowCell(fmtDiff(g2Display[k] || 0))}
                      {rowCell(allEntered ? move[k] : '-')}
                      {rowCell(allEntered ? `+${points[k] || 0}` : '-', true)}
                    </React.Fragment>
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
            {!anySetTie && !canSubmit && <span className="text-gray-600">Complete Game 1 and Game 2 (all three courts) to enable submit.</span>}
          </span>
          <button type="submit" disabled={!canSubmit || submitting} className={`px-3 py-1.5 rounded-md text-sm font-medium text-white ${canSubmit && !submitting ? 'bg-[#B20000] hover:bg-[#8B0000]' : 'bg-gray-400 cursor-not-allowed'}`}>
            {submitting ? 'Submitting…' : 'Submit scores'}
          </button>
        </div>
      </div>
    </form>
  );
}
