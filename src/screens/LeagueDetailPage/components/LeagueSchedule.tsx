import { useState, useEffect } from 'react';
import { MapPin, Clock, Home, Calendar } from 'lucide-react';
import { getLeagueSchedule } from '../../../lib/volleyball';
import type { WeeklySchedule, TierSchedule } from '../../../types/volleyball';

interface LeagueScheduleProps {
  leagueId: number;
  openScoreSubmissionModal: (matchId: number) => void;
}

export function LeagueSchedule({ leagueId, openScoreSubmissionModal }: LeagueScheduleProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const response = await getLeagueSchedule(leagueId);
        setSchedule(response.schedules);
        setCurrentWeek(response.current_week);
        setTotalWeeks(response.total_weeks);
        setError(null);
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [leagueId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Schedule</h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Schedule</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Schedule</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            <strong>Schedule Coming Soon:</strong> Match schedules will be available once they are generated for this league.
          </p>
        </div>
      </div>
    );
  }

  const currentWeekSchedule = schedule.find(w => w.week_number === currentWeek) || schedule[0];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#6F6F6F]">League Schedule</h2>
        
        {/* Week navigation */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            disabled={currentWeek <= 1}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm"
          >
            ← Previous
          </button>
          <span className="text-sm text-[#6F6F6F] px-3">
            Week {currentWeek} of {totalWeeks}
          </span>
          <button 
            onClick={() => setCurrentWeek(Math.min(totalWeeks, currentWeek + 1))}
            disabled={currentWeek >= totalWeeks}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm"
          >
            Next →
          </button>
        </div>
      </div>
      
      {/* Week header with date range */}
      <div className="mb-4 text-left">
        <div className="flex items-center text-[#6F6F6F]">
          <Calendar className="h-4 w-4 mr-2" />
          <p className="font-medium">
            Week {currentWeekSchedule.week_number} - {new Date(currentWeekSchedule.week_start_date).toLocaleDateString()} to {new Date(currentWeekSchedule.week_end_date).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      {/* Display matches grouped by tier */}
      <div className="space-y-6">
        {currentWeekSchedule.tiers.map((tier: TierSchedule, tierIndex: number) => (
          <div key={tierIndex} className="">
            {/* Tier header */}
            <h3 className="text-lg font-semibold text-[#6F6F6F] mb-3">
              Tier {tier.tier_number}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({tier.matches.length} {tier.matches.length === 1 ? 'match' : 'matches'})
              </span>
            </h3>
            
            {/* Matches in this tier */}
            <div className="space-y-3">
              {tier.matches.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-gray-600">No matches scheduled for this tier</p>
                </div>
              ) : (
                tier.matches.map((match) => (
                  <div key={match.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    {/* Match header */}
                    <div className="bg-[#F8F8F8] border-b px-4 py-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-sm text-[#6F6F6F]">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{match.time_slot || 'TBD'}</span>
                          </div>
                          <div className="flex items-center">
                            <Home className="h-4 w-4 mr-1" />
                            <span>{match.court || 'TBD'}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{match.gym?.gym || 'TBD'}</span>
                          </div>
                          {match.facilitator && (
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Facilitator: {match.facilitator.name}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Match status badge */}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            match.status === 'completed' ? 'bg-green-100 text-green-800' :
                            match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            match.status === 'postponed' ? 'bg-orange-100 text-orange-800' :
                            match.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {match.status.replace('_', ' ').toUpperCase()}
                          </span>
                          
                          {/* Score entry button */}
                          {(match.status === 'scheduled' || match.status === 'in_progress' || match.status === 'completed') && (
                            <button 
                              onClick={() => openScoreSubmissionModal(match.id)}
                              className="text-[#B20000] hover:underline px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors"
                            >
                              {match.status === 'completed' ? 'Edit Scores' : 'Enter Scores'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Teams and scores */}
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {/* Position A */}
                        <div className="text-center">
                          <div className="text-sm font-bold text-[#6F6F6F] mb-1">Position A</div>
                          <div className="text-sm text-[#6F6F6F] truncate mb-2">
                            {match.team_a?.name || "TBD"}
                          </div>
                          {match.status === 'completed' && (
                            <div className="text-lg font-bold text-[#B20000]">
                              {match.team_a_total_points}
                              {match.team_a_sets_won > 0 && (
                                <span className="text-xs text-gray-600 ml-1">({match.team_a_sets_won} sets)</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Position B */}
                        <div className="text-center">
                          <div className="text-sm font-bold text-[#6F6F6F] mb-1">Position B</div>
                          <div className="text-sm text-[#6F6F6F] truncate mb-2">
                            {match.team_b?.name || "TBD"}
                          </div>
                          {match.status === 'completed' && (
                            <div className="text-lg font-bold text-[#B20000]">
                              {match.team_b_total_points}
                              {match.team_b_sets_won > 0 && (
                                <span className="text-xs text-gray-600 ml-1">({match.team_b_sets_won} sets)</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Position C */}
                        <div className="text-center">
                          <div className="text-sm font-bold text-[#6F6F6F] mb-1">Position C</div>
                          <div className="text-sm text-[#6F6F6F] truncate mb-2">
                            {match.team_c?.name || "TBD"}
                          </div>
                          {match.status === 'completed' && (
                            <div className="text-lg font-bold text-[#B20000]">
                              {match.team_c_total_points}
                              {match.team_c_sets_won > 0 && (
                                <span className="text-xs text-gray-600 ml-1">({match.team_c_sets_won} sets)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Match notes */}
                      {match.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <strong>Notes:</strong> {match.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

