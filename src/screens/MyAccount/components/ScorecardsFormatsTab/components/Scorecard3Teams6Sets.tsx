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
}

export function Scorecard3Teams6Sets({ teamNames, onSubmit }: Scorecard3Teams6SetsProps) {
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
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                    placeholder="0"
                  />
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
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                    placeholder="0"
                  />
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
        {/* Actions */}
        <div className="flex items-center justify-end pt-0.5">
          <Button type="submit" size="sm" className="rounded-[10px] px-4 py-2">
            Submit
          </Button>
        </div>
      </div>

      {/* Note: When used in a modal for tier score submission, this component can be wrapped in a dialog and passed handlers. */}
    </form>
  );
}




