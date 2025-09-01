import React from 'react';
import { getPositionsForFormat, getGridColsClass, getTeamCountForFormat } from '../constants/formats';
import { getTeamForPosition } from '../utils/tierFormatUtils';

interface WeeklyScheduleTier {
  id: number;
  tier_number: number;
  location: string;
  time_slot: string;
  court: string;
  format: string;
  team_a_name: string | null;
  team_a_ranking: number | null;
  team_b_name: string | null;
  team_b_ranking: number | null;
  team_c_name: string | null;
  team_c_ranking: number | null;
  team_d_name: string | null;
  team_d_ranking: number | null;
  team_e_name: string | null;
  team_e_ranking: number | null;
  team_f_name: string | null;
  team_f_ranking: number | null;
  is_completed: boolean;
  no_games?: boolean;
  is_playoff?: boolean;
  [key: string]: string | number | boolean | null | undefined;
}

interface DragState {
  isDragging: boolean;
  draggedTeam: string | null;
  fromTier: number | null;
  fromPosition: string | null;
  hoverTier: number | null;
  hoverPosition: string | null;
  mouseX: number;
  mouseY: number;
}

interface DynamicTierTeamsProps {
  tier: WeeklyScheduleTier;
  tierIndex: number;
  isEditScheduleMode: boolean;
  dragState: DragState;
  onDragStart: (teamName: string, tierIndex: number, position: string, event: React.MouseEvent) => void;
  onDragHover: (tierIndex: number, position: string) => void;
  onDeleteTeam: (tierIndex: number, position: string, teamName: string) => void;
  onAddTeam: (tierIndex: number, position: string) => void;
}

export function DynamicTierTeams({
  tier,
  tierIndex,
  isEditScheduleMode,
  dragState,
  onDragStart,
  onDragHover,
  onDeleteTeam,
  onAddTeam
}: DynamicTierTeamsProps) {

  return (
    <div className="p-4">
      <div className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || '3-teams-6-sets'))} gap-4`}>
        {getPositionsForFormat(tier.format || '3-teams-6-sets').map((position) => {
          const team = getTeamForPosition(tier, position);
          const isOriginalPosition = dragState.fromTier === tierIndex && dragState.fromPosition === position;
          
          return (
            <div 
              key={position}
              className={`text-center p-3 rounded border-2 transition-all ${
                isEditScheduleMode 
                  ? dragState.isDragging 
                    ? !team || isOriginalPosition
                      ? 'border-green-400 bg-green-50 border-dashed cursor-pointer' // Valid drop zone (empty or source position)
                      : 'border-red-300 bg-red-50 border-dashed cursor-not-allowed' // Invalid drop zone (occupied)
                    : 'border-transparent'
                  : 'border-transparent'
              }`}
              data-drop-zone="true"
              data-tier-index={tierIndex}
              data-position={position}
              onMouseEnter={() => isEditScheduleMode && onDragHover(tierIndex, position)}
            >
              <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
              
              {(() => {
                if (dragState.isDragging && !isOriginalPosition) {
                  return (
                    <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-white border-2 border-gray-200 rounded">
                      <div className="text-sm text-gray-500 italic">
                        {!team ? 'Drop here' : 'Position occupied'}
                      </div>
                    </div>
                  );
                } else if (team && !isOriginalPosition) {
                  return (
                    <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-white border-2 border-gray-200 rounded">
                      <div className="flex-1">
                        <div 
                          className={`p-2 rounded text-sm font-medium flex flex-col items-center gap-1 cursor-pointer transition-all ${
                            isEditScheduleMode 
                              ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-grab active:cursor-grabbing' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                          onMouseDown={(e) => {
                            if (isEditScheduleMode && team) {
                              onDragStart(team.name, tierIndex, position, e);
                            }
                          }}
                        >
                          <div className="font-medium">{team.name}</div>
                          <div className="text-xs text-gray-500">(Rank {team.ranking || '-'})</div>
                        </div>
                      </div>
                      {isEditScheduleMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            team && onDeleteTeam(tierIndex, position, team.name);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                          title="Remove team"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-white border-2 border-gray-200 rounded">
                      {isEditScheduleMode ? (
                        <div className="flex-1 flex flex-col items-center gap-1 text-center">
                          <button
                            onClick={() => onAddTeam(tierIndex, position)}
                            className="flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors mb-1"
                            title="Add team to this position"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                          <div className="text-xs font-medium text-gray-600">Add Team</div>
                          <div className="text-xs text-gray-500">or drop here</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Empty</span>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}