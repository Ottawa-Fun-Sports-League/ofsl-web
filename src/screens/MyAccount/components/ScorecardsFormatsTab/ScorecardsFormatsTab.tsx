import { useState } from 'react';
import { GAME_FORMATS } from '../../../LeagueSchedulePage/utils/formatUtils';
import { ScorecardsHeader } from './components/ScorecardsHeader';
import { Scorecard3Teams6Sets } from './components/Scorecard3Teams6Sets';

export function ScorecardsFormatsTab() {
  const [selectedId, setSelectedId] = useState<string>(GAME_FORMATS[0]?.value ?? '');
  const selected = GAME_FORMATS.find(f => f.value === selectedId);

  return (
    <div className="space-y-6">
      <ScorecardsHeader />

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 font-semibold text-[#6F6F6F]">Volleyball Formats</div>
          <ul className="divide-y divide-gray-200">
            {GAME_FORMATS.map((fmt) => {
              const active = fmt.value === selectedId;
              return (
                <li key={fmt.value}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(fmt.value)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      active ? 'bg-[#B20000]/5 text-[#B20000] font-medium' : 'hover:bg-gray-50 text-[#6F6F6F]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Content */}
        <section className="flex-1">
          {selected ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-[#6F6F6F]">{selected.label}</h3>
              {selected.value === '3-teams-6-sets' ? (
                <Scorecard3Teams6Sets />
              ) : (
                <div className="border rounded-md p-4 text-sm text-gray-700">
                  This view will show the scorecard for "{selected.label}". Build-out will follow after the 3-team reference.
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Select a format from the sidebar to begin.</p>
          )}
        </section>
      </div>
    </div>
  );
}
