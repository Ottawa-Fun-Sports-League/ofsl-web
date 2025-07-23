import { Card, CardContent } from '../../../components/ui/card';
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
      
      {/* Display tiers for the current week */}
      <div className="space-y-6">
        {mockSchedule[0].tiers.map((tier: Tier, tierIndex: number) => (
          <Card key={tierIndex} className="shadow-md overflow-hidden rounded-lg">
            <CardContent className="p-0 overflow-hidden">
              {/* Tier Header - Updated with right-justified info and icons */}
              <div className="bg-[#F8F8F8] border-b p-4">
                <div className="flex justify-between items-center">
                  {/* Left side - Tier Number with Submit Scores link below */}
                  <div>
                    <h3 className="font-bold text-[#6F6F6F] text-xl">
                      Tier {tier.tierNumber}
                    </h3>
                    <button 
                      onClick={() => openScoreSubmissionModal(tier.tierNumber)}
                      className="text-sm text-[#B20000] hover:underline"
                    >
                      Submit scores
                    </button>
                  </div>
                  
                  {/* Right side - Location, Time, Court info with icons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                      <span className="text-sm text-[#6F6F6F]">{tier.location}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                      <span className="text-sm text-[#6F6F6F]">{tier.time}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Home className="h-4 w-4 text-[#B20000] mr-1.5" />
                      <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Teams by Position in a table layout with fixed column widths for consistency */}
              <div className="overflow-hidden">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '60%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">Position</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">Team</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tr-lg">Ranking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Position A */}
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-sm font-medium text-[#6F6F6F]">A</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] truncate">{tier.teams.A?.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-left">{tier.teams.A?.ranking || "-"}</td>
                    </tr>
                    
                    {/* Position B */}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-[#6F6F6F]">B</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] truncate">{tier.teams.B?.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-left">{tier.teams.B?.ranking || "-"}</td>
                    </tr>
                    
                    {/* Position C */}
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-sm font-medium text-[#6F6F6F] rounded-bl-lg">C</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] truncate">{tier.teams.C?.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-left rounded-br-lg">{tier.teams.C?.ranking || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

