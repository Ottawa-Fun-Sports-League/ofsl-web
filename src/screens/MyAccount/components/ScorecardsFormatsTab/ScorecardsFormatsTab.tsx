import { useState } from 'react';
import { GAME_FORMATS } from '../../../LeagueSchedulePage/utils/formatUtils';
import { ScorecardsHeader } from './components/ScorecardsHeader';
import { Scorecard3Teams6Sets } from './components/Scorecard3Teams6Sets';
import { Scorecard3TeamsElite6Sets } from './components/Scorecard3TeamsElite6Sets';
import { Scorecard2Teams4Sets } from './components/Scorecard2Teams4Sets';
import { Scorecard2TeamsBestOf5 } from './components/Scorecard2TeamsBestOf5';
import { Scorecard4TeamsHeadToHead } from './components/Scorecard4TeamsHeadToHead';
import { Scorecard6TeamsHeadToHead } from './components/Scorecard6TeamsHeadToHead';
import { Scorecard2TeamsEliteBestOf5 } from './components/Scorecard2TeamsEliteBestOf5';
import { Scorecard3TeamsElite9Sets } from './components/Scorecard3TeamsElite9Sets';

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
                <>
                  <Scorecard3Teams6Sets
                    teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves', C: 'Prime Net' }}
                  />

                  {/* Format logic reference */}
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Points System</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>
                          Baseline (Lowest Tier): <span className="font-medium">3 / 4 / 5</span> (loser / neutral / winner)
                        </li>
                        <li>
                          Tier Bonus: <span className="font-medium">+2</span> per tier up from bottom tier
                        </li>
                        <li>
                          Example (Second tier from bottom): <span className="font-medium">5 / 6 / 7</span> (loser / neutral / winner)
                        </li>
                        <li>
                          Note: Middle team (neutral) remains in the same tier
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tie-Breaker Rules</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Tie exists: Compare overall set wins</li>
                        <li>3-way tie: Compare overall points differential (higher differential wins)</li>
                        <li>2-way tie: Compare head-to-head points differential (higher differential wins)</li>
                        <li>Still tied: Use previous week’s schedule position (A &gt; B &gt; C)</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tier Movement</h4>
                      <p className="text-[15px] text-[#4B5563] mb-2">Current week results move teams to the following week:</p>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Winners: move up one tier to position C</li>
                        <li>Losers: move down one tier to position A</li>
                        <li>Neutral (non-winning/non-losing): stays in the same tier, moves to position B</li>
                        <li>Top tier winners: stay in the same tier (cannot move up)</li>
                        <li>Bottom tier losers: stay in the same tier (cannot move down)</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : selected.value === '3-teams-elite-6-sets' ? (
                <>
                  <Scorecard3TeamsElite6Sets teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves', C: 'Prime Net' }} />
                </>
              ) : selected.value === '3-teams-elite-9-sets' ? (
                <>
                  <Scorecard3TeamsElite9Sets teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves', C: 'Prime Net' }} />
                </>
              ) : selected.value === '2-teams-4-sets' ? (
                <>
                  <Scorecard2Teams4Sets
                    teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves' }}
                  />

                  {/* Format logic reference */}
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Points System</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>
                          Baseline (Lowest Tier): <span className="font-medium">3 / 5</span> (loser / winner)
                        </li>
                        <li>
                          Tier Bonus: <span className="font-medium">+2</span> per tier up from bottom tier
                        </li>
                        <li>
                          Example (Second tier from bottom): <span className="font-medium">5 / 7</span> (loser / winner)
                        </li>
                        <li>
                          Note: No neutral team in 2-team format
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tie-Breaker Rules</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Tie exists: Compare overall set wins</li>
                        <li>Still tied: Compare overall points differential (higher differential wins)</li>
                        <li>Still tied: Use previous week’s schedule position (A &gt; B)</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tier Movement</h4>
                      <p className="text-[15px] text-[#4B5563] mb-2">Current week results move teams to the following week:</p>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Winners: move up one tier</li>
                        <li>Losers: move down one tier</li>
                        <li>Top tier winners: stay in the same tier (cannot move up)</li>
                        <li>Bottom tier losers: stay in the same tier (cannot move down)</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : selected.value === '2-teams-best-of-5' ? (
                <>
                  <Scorecard2TeamsBestOf5
                    teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves' }}
                  />

                  {/* Format logic reference */}
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Points System</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>
                          Base: <span className="font-medium">2 points each</span>
                        </li>
                        <li>
                          Set Bonus: <span className="font-medium">+1 per set win</span> (max <span className="font-medium">+3</span>)
                        </li>
                        <li>
                          Tier Bonus: <span className="font-medium">+1</span> per tier up from bottom (Tier 1 adds 0, Tier 2 adds 1, etc.)
                        </li>
                        <li>
                          Examples: <span className="font-medium">Tier 1</span> 3–2 → 5–4; <span className="font-medium">Tier 2</span> 0–3 → 3–6
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tie-Breaker Rules</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Tie exists: Compare overall set wins</li>
                        <li>Still tied: Compare overall points differential (higher differential wins)</li>
                        <li>Still tied: Use previous week’s schedule position (A &gt; B)</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tier Movement</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Winners: move up one tier</li>
                        <li>Losers: move down one tier</li>
                        <li>Top tier winners: stay in the same tier (cannot move up)</li>
                        <li>Bottom tier losers: stay in the same tier (cannot move down)</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : selected.value === '4-teams-head-to-head' ? (
                <>
                  <Scorecard4TeamsHeadToHead
                    teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves', C: 'Prime Net', D: 'Block Party' }}
                  />

                  {/* Format logic reference */}
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Points System</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>
                          Lowest tier baseline: <span className="font-medium">3 / 4 / 5 / 6</span> (4th → 1st)
                        </li>
                        <li>
                          Tier bonus: <span className="font-medium">+3</span> points per tier above lowest
                        </li>
                        <li>
                          Example (2nd from bottom): <span className="font-medium">6 / 7 / 8 / 9</span>
                          <span className="text-[13px] text-[#6B7280]"> (loser G2 Court 2 / winner G2 Court 2 / loser G2 Court 1 / winner G2 Court 1)</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Weekly Structure</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Game 1: Court 1 — A vs B (2 sets); Court 2 — C vs D (2 sets)</li>
                        <li>Game 2: Court 1 — Winner (Court 1) vs Winner (Court 2) (2 sets)</li>
                        <li>Game 2: Court 2 — Loser (Court 1) vs Loser (Court 2) (2 sets)</li>
                        <li>No per-set ties allowed; resolve equal scores</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tie-Breaker Rules (within a game)</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Compare set wins across the two sets</li>
                        <li>If 1–1, compare total points differential (higher differential wins)</li>
                        <li>If still tied: re-enter scores (ties are not allowed)</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tier Movement</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Game 2 Court 1 winner: moves up one tier to highest position (e.g., D). Top tier: stay → A.</li>
                        <li>Game 2 Court 1 loser: stays in current tier → Court 2, position C.</li>
                        <li>Game 2 Court 2 winner: stays in current tier → Court 1, position B.</li>
                        <li>Game 2 Court 2 loser: moves down one tier to lowest position (A). Bottom tier: stay → D.</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : selected.value === '2-teams-elite' ? (
                <>
                  <Scorecard2TeamsEliteBestOf5 teamNames={{ A: 'Setting Cobras', B: 'Hawk Serves' }} />
                </>
              ) : selected.value === '6-teams-head-to-head' ? (
                <>
                  <Scorecard6TeamsHeadToHead
                    teamNames={{
                      A: 'Setting Cobras',
                      B: 'Hawk Serves',
                      C: 'Prime Net',
                      D: 'Block Party',
                      E: 'Spike Force',
                      F: 'Net Ninjas'
                    }}
                  />

                  {/* Format logic reference */}
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Points System</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>
                          Lowest tier baseline: <span className="font-medium">3 / 4 / 5 / 6 / 7 / 8</span> (6th → 1st place)
                        </li>
                        <li>
                          Tier bonus: <span className="font-medium">+8</span> points per tier above lowest
                        </li>
                        <li>
                          Rankings based on Game 2 performance across all three courts
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Weekly Structure</h4>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Game 1: Court 1 — A vs B (2 sets); Court 2 — C vs D (2 sets); Court 3 — E vs F (2 sets)</li>
                        <li>Game 2: Court 1 — Winner (Court 1) vs Winner (Court 2) (2 sets)</li>
                        <li>Game 2: Court 2 — Loser (Court 1) vs Winner (Court 3) (2 sets)</li>
                        <li>Game 2: Court 3 — Loser (Court 2) vs Loser (Court 3) (2 sets)</li>
                        <li>No per-set ties allowed; resolve equal scores</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Final Rankings</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li><strong>1st Place:</strong> Winner of Game 2 Court 1 (Winner C1 vs Winner C2 champion)</li>
                        <li><strong>2nd Place:</strong> Loser of Game 2 Court 1 (Winner C1 vs Winner C2 runner-up)</li>
                        <li><strong>3rd Place:</strong> Winner of Game 2 Court 2 (Loser C1 vs Winner C3 champion)</li>
                        <li><strong>4th Place:</strong> Loser of Game 2 Court 2 (Loser C1 vs Winner C3 runner-up)</li>
                        <li><strong>5th Place:</strong> Winner of Game 2 Court 3 (Loser C2 vs Loser C3 champion)</li>
                        <li><strong>6th Place:</strong> Loser of Game 2 Court 3 (Loser C2 vs Loser C3 runner-up)</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tier Movement</h4>
                      <p className="text-[15px] text-[#4B5563] mb-2">Based on overall weekly performance (set wins → differential → previous position):</p>
                      <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li><strong>1st Place:</strong> Up tier → Position F (top tier stays → A)</li>
                        <li><strong>2nd Place:</strong> Same tier → Position B (Court 1)</li>
                        <li><strong>3rd Place:</strong> Same tier → Position C (Court 2)</li>
                        <li><strong>4th Place:</strong> Same tier → Position D (Court 2)</li>
                        <li><strong>5th Place:</strong> Same tier → Position E (Court 3)</li>
                        <li><strong>6th Place:</strong> Down tier → Position F (bottom tier stays → F)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-[#6F6F6F] mb-2">Tie-Breaker Rules</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-[15px] text-[#4B5563]">
                        <li>Head-to-head result (if teams played each other)</li>
                        <li>Total set wins across both games</li>
                        <li>Total points differential</li>
                        <li>Previous week's position (A {'>'} B {'>'} C {'>'} D {'>'} E {'>'} F)</li>
                      </ol>
                    </div>
                  </div>
                </>
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

