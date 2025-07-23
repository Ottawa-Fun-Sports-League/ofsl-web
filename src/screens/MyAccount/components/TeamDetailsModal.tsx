import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { X, Users, Plus, Mail, Crown, DollarSign, Trash2 } from 'lucide-react';
import { AddPlayersModal } from '../../LeagueDetailPage/components/AddPlayersModal';

interface TeamDetailsModalProps {
  showModal: boolean;
  closeModal: () => void;
  team: {
    id: number;
    name: string;
    league_id: number;
    captain_id: string;
    roster: string[];
    roster_details: Array<{
      id: string;
      name: string;
      email: string;
    }>;
    league: {
      id: number;
      name: string;
      day_of_week: number | null;
      cost: number | null;
      gym_ids: number[] | null;
      sports: {
        name: string;
      } | null;
    } | null;
    skill: {
      name: string;
    } | null;
  };
  currentUserId: string;
  onPlayersUpdated: () => void;
}

export function TeamDetailsModal({ 
  showModal, 
  closeModal, 
  team, 
  currentUserId,
  onPlayersUpdated 
}: TeamDetailsModalProps) {
  const [showAddPlayersModal, setShowAddPlayersModal] = useState(false);

  const handleAddPlayersClick = () => {
    setShowAddPlayersModal(true);
  };

  const handlePlayersAdded = () => {
    onPlayersUpdated();
    setShowAddPlayersModal(false);
  };

  const isCaptain = currentUserId === team.captain_id;

  const formatCost = (cost: number | null) => {
    if (!cost) return 'Cost TBD';
    return `$${cost}`;
  };

  if (!showModal) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#6F6F6F]">Team Details</h2>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Team Info */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-bold text-[#6F6F6F] mb-2">{team.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#6F6F6F]">
                <div>
                  <span className="font-medium">League:</span> {team.league?.name || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Sport:</span> {team.league?.sports?.name || 'Unknown'}
                </div>
                {team.skill && (
                  <div>
                    <span className="font-medium">Skill Level:</span> {team.skill.name}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-medium">Cost:</span>
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCost(team.league?.cost)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">Total Players:</span> {team.roster_details.length}
                </div>
              </div>
            </div>

            {/* Team Roster Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#6F6F6F] flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Roster ({team.roster_details.length} players)
                </h3>
                {isCaptain && (
                  <Button
                    onClick={handleAddPlayersClick}
                    className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-4 py-2 flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Players
                  </Button>
                )}
              </div>

              {/* Roster List */}
              <div className="space-y-3">
                {team.roster_details.length === 0 ? (
                  <div className="text-center py-8 text-[#6F6F6F]">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No players added yet</p>
                    {isCaptain && <p className="text-sm">Click &ldquo;Add Players&rdquo; to get started</p>}
                  </div>
                ) : (
                  team.roster_details.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {/* Player Avatar */}
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-[#6F6F6F] font-medium">
                            {(player.name || player.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Player Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#6F6F6F]">
                              {player.name || 'No Name'}
                            </span>
                            {player.id === team.captain_id && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                <Crown className="h-3 w-3" />
                                Captain
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-[#6F6F6F]">
                            <Mail className="h-3 w-3" />
                            {player.email}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {isCaptain && player.id !== team.captain_id && (
                        <div className="flex items-center gap-2">
                          <button
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                            title="Remove from team"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={closeModal}
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-6 py-2"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Players Modal */}
      <AddPlayersModal
        showModal={showAddPlayersModal}
        closeModal={() => setShowAddPlayersModal(false)}
        teamId={team.id}
        teamName={team.name}
        currentRoster={team.roster || []}
        onPlayersAdded={handlePlayersAdded}
      />
    </>
  );
}