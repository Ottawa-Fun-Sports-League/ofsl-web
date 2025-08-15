import { MapPin, Clock, Home } from 'lucide-react';
import type { Schedule, Tier } from '../utils/leagueUtils';

interface LeagueScheduleProps {
  mockSchedule: Schedule[];
  openScoreSubmissionModal: (tierNumber: number) => void;
}

export function LeagueSchedule({ mockSchedule, openScoreSubmissionModal }: LeagueScheduleProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Schedule</h2>
      
      {/* Week header - Left justified */}
      <div className="mb-4 text-left">
        <p className="font-medium text-[#6F6F6F]">
          Week 1 - June 5, 2025
        </p>
      </div>
      
      {/* Compact list view for tiers with grey header separation */}
      <div className="space-y-3">
        {mockSchedule[0].tiers.map((tier: Tier, tierIndex: number) => (
          <div key={tierIndex} className="bg-white border rounded-lg shadow-sm overflow-hidden">
            {/* Tier header with grey background for separation */}
            <div className="bg-[#F8F8F8] border-b px-3 pt-2 pb-1.5">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[#6F6F6F]">Tier {tier.tierNumber}</h3>
                <div className="flex items-center space-x-3 text-xs text-[#6F6F6F]">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{tier.time}</span>
                  </div>
                  <div className="flex items-center">
                    <Home className="h-3 w-3 mr-1" />
                    <span>{tier.court}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{tier.location}</span>
                  </div>
                  <button 
                    onClick={() => openScoreSubmissionModal(tier.tierNumber)}
                    className="text-[#B20000] hover:underline px-2 py-1 rounded bg-red-50"
                  >
                    Score
                  </button>
                </div>
              </div>
            </div>
            
            {/* Teams in single row with 3 equal columns */}
            <div className="px-4 pb-3">
              <div className="grid grid-cols-3 text-sm border-t border-gray-100 pt-3 divide-x divide-gray-200">
                {/* Position A */}
                <div className="text-center py-2 px-3">
                  <div className="text-sm font-bold text-[#6F6F6F] mb-2">A</div>
                  <div className="text-sm text-[#6F6F6F] truncate px-1">
                    {tier.teams.A?.name || "TBD"} {tier.teams.A?.ranking ? `(#${tier.teams.A.ranking})` : ""}
                  </div>
                </div>
                
                {/* Position B */}
                <div className="text-center py-2 px-3">
                  <div className="text-sm font-bold text-[#6F6F6F] mb-2">B</div>
                  <div className="text-sm text-[#6F6F6F] truncate px-1">
                    {tier.teams.B?.name || "TBD"} {tier.teams.B?.ranking ? `(#${tier.teams.B.ranking})` : ""}
                  </div>
                </div>
                
                {/* Position C */}
                <div className="text-center py-2 px-3">
                  <div className="text-sm font-bold text-[#6F6F6F] mb-2">C</div>
                  <div className="text-sm text-[#6F6F6F] truncate px-1">
                    {tier.teams.C?.name || "TBD"} {tier.teams.C?.ranking ? `(#${tier.teams.C.ranking})` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

