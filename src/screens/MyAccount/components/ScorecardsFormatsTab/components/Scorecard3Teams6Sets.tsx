import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';

type TeamKey = 'A' | 'B' | 'C';

type ScoreEntry = {
  setLabel: string;
  teams: [TeamKey, TeamKey];
};

const SETS: ReadonlyArray<ScoreEntry> = [
  { setLabel: 'A vs B — Set 1', teams: ['A', 'B'] },
  { setLabel: 'A vs B — Set 2', teams: ['A', 'B'] },
  { setLabel: 'A vs C — Set 1', teams: ['A', 'C'] },
  { setLabel: 'A vs C — Set 2', teams: ['A', 'C'] },
  { setLabel: 'B vs C — Set 1', teams: ['B', 'C'] },
  { setLabel: 'B vs C — Set 2', teams: ['B', 'C'] },
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

  const handleScoreChange = (rowIndex: number, team: TeamKey, value: string) => {
    setScores(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [team]: value } }));
  };

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  return (
    <form
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 max-w-xl space-y-3"
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
      {/* Team names header (placeholders for A/B/C) */}
      <div className="rounded-md">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm sm:text-base font-semibold text-[#6F6F6F]">Team Names</h4>
          <span className="text-[10px] font-semibold text-white uppercase tracking-widest bg-[#B20000] px-2 py-1 rounded-md">3 Teams • 6 Sets</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['A','B','C'] as TeamKey[]).map((t) => (
            <div key={t} className="border border-gray-200 rounded-md p-2">
              <div className="text-[11px] font-medium text-gray-600 mb-1">Position {t}</div>
              <div className="text-sm font-semibold text-[#6F6F6F] truncate" title={teamNames[t] || `Team ${t}`}>
                {teamNames[t] || `Team ${t}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sets grid */}
      <div className="rounded-md">
        <h4 className="text-sm sm:text-base font-semibold text-[#6F6F6F] mb-1">Set Scores</h4>
        <div className="grid grid-cols-1 gap-1.5">
          {SETS.map((entry, idx) => {
            const [t1, t2] = entry.teams;
            const row = scores[idx] || {};
            return (
              <div
                key={`${entry.setLabel}-${idx}`}
                className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border border-gray-200 rounded-md p-2"
              >
                <div className="text-[13px] text-[#6F6F6F] font-medium">{entry.setLabel}</div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-gray-600 w-8 text-right">{t1}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row[t1] ?? ''}
                    onChange={(e) => handleScoreChange(idx, t1, e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-gray-600 w-8 text-right">{t2}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row[t2] ?? ''}
                    onChange={(e) => handleScoreChange(idx, t2, e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                    placeholder="0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spare players sections */}
      <div className="rounded-md">
        <h4 className="text-sm sm:text-base font-semibold text-[#6F6F6F] mb-1">Spare Players (this week)</h4>
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
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end pt-0.5">
        <Button type="submit" size="sm" className="rounded-[10px] px-4 py-2">
          Submit Scorecard
        </Button>
      </div>

      {/* Note: When used in a modal for tier score submission, this component can be wrapped in a dialog and passed handlers. */}
    </form>
  );
}
