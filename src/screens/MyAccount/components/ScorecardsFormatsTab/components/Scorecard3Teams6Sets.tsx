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

export function Scorecard3Teams6Sets() {
  const [teamNames, setTeamNames] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '' });
  const [scores, setScores] = useState<Record<number, { A?: string; B?: string; C?: string }>>({});
  const [spares, setSpares] = useState<Record<TeamKey, string>>({ A: '', B: '', C: '' });

  const handleTeamName = (team: TeamKey, value: string) => {
    setTeamNames(prev => ({ ...prev, [team]: value }));
  };

  const handleScoreChange = (rowIndex: number, team: TeamKey, value: string) => {
    setScores(prev => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [team]: value } }));
  };

  const handleSparesChange = (team: TeamKey, value: string) => {
    setSpares(prev => ({ ...prev, [team]: value }));
  };

  return (
    <form
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 max-w-2xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: wire up submit handler via props when integrating in modal
      }}
    >
      {/* Team names header (placeholders for A/B/C) */}
      <div className="rounded-md">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base sm:text-lg font-semibold text-[#6F6F6F]">Team Names</h4>
          <span className="text-[10px] font-semibold text-white uppercase tracking-widest bg-[#B20000] px-2 py-1 rounded-md">3 Teams • 6 Sets</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['A','B','C'] as TeamKey[]).map((t) => (
            <div key={t}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position {t}</label>
              <input
                type="text"
                value={teamNames[t]}
                onChange={(e) => handleTeamName(t, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                placeholder={`Team ${t} name`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sets grid */}
      <div className="rounded-md">
        <h4 className="text-base sm:text-lg font-semibold text-[#6F6F6F] mb-2">Set Scores</h4>
        <div className="grid grid-cols-1 gap-2">
          {SETS.map((entry, idx) => {
            const [t1, t2] = entry.teams;
            const row = scores[idx] || {};
            return (
              <div
                key={`${entry.setLabel}-${idx}`}
                className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 border border-gray-200 rounded-md p-2"
              >
                <div className="text-sm text-[#6F6F6F] font-medium">{entry.setLabel}</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-10 text-right">{t1}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row[t1] ?? ''}
                    onChange={(e) => handleScoreChange(idx, t1, e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-10 text-right">{t2}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row[t2] ?? ''}
                    onChange={(e) => handleScoreChange(idx, t2, e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
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
        <h4 className="text-base sm:text-lg font-semibold text-[#6F6F6F] mb-2">Spare Players (this week)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['A','B','C'] as TeamKey[]).map((t) => (
            <div key={`spares-${t}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team {t}</label>
              <textarea
                value={spares[t]}
                onChange={(e) => handleSparesChange(t, e.target.value)}
                className="w-full min-h-[88px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#B20000] focus:ring-1 focus:ring-[#B20000]/60"
                placeholder="List spare players, one per line"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end pt-1">
        <Button type="submit" className="rounded-[10px] px-6 py-2.5">
          Submit Scorecard
        </Button>
      </div>

      {/* Note: When used in a modal for tier score submission, this component can be wrapped in a dialog and passed handlers. */}
    </form>
  );
}
