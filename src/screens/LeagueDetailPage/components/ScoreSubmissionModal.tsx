import { Button } from '../../../components/ui/button';
import type { Schedule, Tier } from '../utils/leagueUtils';

interface ScoreSubmissionModalProps {
  showModal: boolean;
  selectedTier: number | null;
  mockSchedule: Schedule[];
  getTeamNameFromPosition: (tier: Tier, position: string) => string;
  closeModal: () => void;
}

export function ScoreSubmissionModal({ 
  showModal, 
  selectedTier, 
  mockSchedule, 
  getTeamNameFromPosition, 
  closeModal 
}: ScoreSubmissionModalProps) {
  if (!showModal || selectedTier === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">Submit Scores - Tier {selectedTier}</h2>
            <button 
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Team Legend */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-bold text-[#6F6F6F] mb-2">Teams</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['A', 'B', 'C'].map((position) => {
                const tier = mockSchedule[0].tiers.find((t) => t.tierNumber === selectedTier);
                const teamName = tier ? getTeamNameFromPosition(tier, position) : '';
                
                return (
                  <div key={position} className="flex items-center">
                    <span className="font-bold text-[#B20000] w-8">
                      {position}:
                    </span>
                    <span className="text-[#6F6F6F] truncate">
                      {teamName || 'No team'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Scores Form */}
          <form>
            <div className="mb-6">
              <h3 className="font-bold text-[#6F6F6F] mb-4">Game Scores</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium text-[#6F6F6F]">Game</th>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium text-[#6F6F6F]">Matchup</th>
                      <th className="px-4 py-2 border-b text-center text-sm font-medium text-[#6F6F6F]">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Game 1 */}
                    <tr>
                      <td className="px-4 py-3 border-b">
                        <span className="font-medium">Game 1</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <span>A vs C</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            min="0" 
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-16 px-2 py-1 border rounded text-center" 
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>
                    
                    {/* Game 2 */}
                    <tr>
                      <td className="px-4 py-3 border-b">
                        <span className="font-medium">Game 2</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <span>A vs C</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            min="0" 
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0" 
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>
                    
                    {/* Game 3 */}
                    <tr>
                      <td className="px-4 py-3 border-b">
                        <span className="font-medium">Game 3</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <span>A vs B</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            min="0" 
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0" 
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Game 4 */}
                    <tr>
                      <td className="px-4 py-3 border-b">
                        <span className="font-medium">Game 4</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <span>A vs B</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            min="0" 
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0" 
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Game 5 */}
                    <tr>
                      <td className="px-4 py-3 border-b">
                        <span className="font-medium">Game 5</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <span>B vs C</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            min="0" 
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0" 
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Game 6 */}
                    <tr>
                      <td className="px-4 py-3">
                        <span className="font-medium">Game 6</span>
                      </td>
                      <td className="px-4 py-3">
                        <span>B vs C</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            min="0" 
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0" 
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-16 px-2 py-1 border rounded text-center"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spare Players Section */}
            <div className="mb-6">
              <h3 className="font-bold text-[#6F6F6F] mb-4">Spare Players</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['A', 'B', 'C'].map((teamPosition) => {
                  const tier = mockSchedule[0].tiers.find((t) => t.tierNumber === selectedTier);
                  const teamName = tier ? getTeamNameFromPosition(tier, teamPosition) : '';
                  
                  return (
                    <div key={teamPosition} className="mb-4">
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Team {teamPosition} {teamName ? `(${teamName})` : ''} Spares
                      </label>
                      <textarea 
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        rows={3}
                        placeholder="Enter spare player names..."
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                onClick={closeModal}
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2"
              >
                Submit Scores
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

