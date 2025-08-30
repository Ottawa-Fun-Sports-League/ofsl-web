import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { MapPin, Clock, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchLeagueById } from '../../../lib/leagues';
import { useAuth } from '../../../contexts/AuthContext';
import { SubmitScoresModal } from './SubmitScoresModal';
import type { Schedule, Tier } from '../utils/leagueUtils';

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
  is_completed: boolean;
  no_games?: boolean;
  is_playoff?: boolean;
}

interface LeagueScheduleProps {
  mockSchedule: Schedule[];
  leagueId: string;
}

export function LeagueSchedule({ mockSchedule, leagueId }: LeagueScheduleProps) {
  const { userProfile } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [weeklyTiers, setWeeklyTiers] = useState<WeeklyScheduleTier[]>([]);
  const [loadingWeekData, setLoadingWeekData] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState<{
    start_date: string | null;
    end_date: string | null; 
    playoff_weeks: number;
  } | null>(null);
  const [week1TierStructure, setWeek1TierStructure] = useState<WeeklyScheduleTier[]>([]);
  const [selectedTierForScores, setSelectedTierForScores] = useState<WeeklyScheduleTier | null>(null);
  const [isScoresModalOpen, setIsScoresModalOpen] = useState(false);
  
  // Check if user is admin or facilitator
  const canSubmitScores = userProfile?.role === 'admin' || userProfile?.role === 'facilitator';
  
  // Fetch league info for playoff weeks calculation
  useEffect(() => {
    const fetchLeagueInfo = async () => {
      if (!leagueId) return;
      
      try {
        const leagueData = await fetchLeagueById(parseInt(leagueId));
        if (leagueData) {
          setLeagueInfo({
            start_date: leagueData.start_date,
            end_date: leagueData.end_date,
            playoff_weeks: leagueData.playoff_weeks || 0
          });
        }
      } catch (error) {
        console.error('Error fetching league info:', error);
      }
    };

    fetchLeagueInfo();
  }, [leagueId]);

  useEffect(() => {
    loadWeekStartDate();
    loadWeeklySchedule(currentWeek);
    loadWeek1Structure();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Load weekly schedule when week changes
  useEffect(() => {
    loadWeeklySchedule(currentWeek);
  }, [currentWeek]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Reload data when page becomes visible (user returns from admin page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadWeekStartDate();
        loadWeeklySchedule(currentWeek);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leagueId, currentWeek]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Initialize current week to the actual current week when startDate is loaded
  useEffect(() => {
    if (startDate) {
      setCurrentWeek(getCurrentWeek());
    }
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const loadWeekStartDate = async () => {
    try {
      // Loading league start date for league
      const { data, error } = await supabase
        .from('leagues')
        .select('start_date')
        .eq('id', parseInt(leagueId))
        .single();

      if (error) {
        console.error('Error loading league start date:', error);
        return;
      }

      // Loaded league start date data
      if (data?.start_date) {
        setStartDate(data.start_date);
        // Set start date to the loaded value
      } else {
        // No start date found in league
      }
    } catch (error) {
      console.error('Error loading league start date:', error);
    }
  };
  
  const getCurrentWeek = (): number => {
    if (!startDate) return 1;
    
    // Parse start date as local date to avoid timezone shifts
    const start = new Date(startDate + 'T00:00:00');
    const today = new Date();
    
    // Calculate weeks difference
    const diffTime = today.getTime() - start.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
    
    return Math.max(1, diffWeeks);
  };
  
  const getWeekDate = (weekNumber: number): string => {
    if (!startDate) return 'League start date not set';
    
    // Always calculate from start date for consistency
    // This ensures both admin and public views show the same dates
    const baseDate = new Date(startDate + 'T00:00:00');
    const weekOffset = weekNumber - 1;
    
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    
    return baseDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const canNavigateToWeek = (weekNumber: number): boolean => {
    if (weekNumber < 1) return false;
    
    // Calculate maximum weeks (regular season + playoffs)
    if (leagueInfo?.end_date && leagueInfo?.start_date) {
      const start = new Date(leagueInfo.start_date + 'T00:00:00');
      const end = new Date(leagueInfo.end_date + 'T00:00:00');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      const maxWeeks = regularSeasonWeeks + (leagueInfo.playoff_weeks || 0);
      
      return weekNumber <= maxWeeks;
    }
    
    // Fallback: allow navigation to reasonable number of weeks
    return weekNumber <= 20;
  };

  const isPlayoffWeek = (weekNumber: number): boolean => {
    if (!leagueInfo?.start_date || !leagueInfo?.end_date) return false;
    
    const start = new Date(leagueInfo.start_date + 'T00:00:00');
    const end = new Date(leagueInfo.end_date + 'T00:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    return weekNumber > regularSeasonWeeks;
  };
  
  const navigateToWeek = (weekNumber: number) => {
    if (canNavigateToWeek(weekNumber)) {
      setCurrentWeek(weekNumber);
    }
  };


  const loadWeek1Structure = async () => {
    try {
      // Loading Week 1 structure for future week templates
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('tier_number, location, time_slot, court, format')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', 1)
        .order('tier_number', { ascending: true });

      if (error) {
        console.error('Error loading Week 1 structure:', error);
        return;
      }

      // Loaded Week 1 structure
      if (data) {
        // Convert to template format without team assignments
        const templateTiers = data.map((tier, index) => ({
          id: -index - 1, // Negative IDs for templates
          tier_number: tier.tier_number,
          location: tier.location,
          time_slot: tier.time_slot,
          court: tier.court,
          format: tier.format,
          team_a_name: null,
          team_a_ranking: null,
          team_b_name: null,
          team_b_ranking: null,
          team_c_name: null,
          team_c_ranking: null,
          is_completed: false
        }));
        setWeek1TierStructure(templateTiers);
      }
    } catch (error) {
      console.error('Error loading Week 1 structure:', error);
    }
  };

  const loadWeeklySchedule = async (weekNumber: number) => {
    try {
      setLoadingWeekData(true);
      // Loading weekly schedule for week and league
      
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', weekNumber)
        .order('tier_number', { ascending: true });

      if (error) {
        console.error('Error loading weekly schedule:', error);
        setWeeklyTiers([]);
        return;
      }

      // Loaded weekly schedule data
      setWeeklyTiers(data || []);
    } catch (error) {
      console.error('Error loading weekly schedule:', error);
      setWeeklyTiers([]);
    } finally {
      setLoadingWeekData(false);
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Schedule</h2>
      
      {/* Week header with limited navigation */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            {/* Navigation buttons grouped together */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateToWeek(currentWeek - 1)}
                disabled={!canNavigateToWeek(currentWeek - 1)}
                className="px-2 py-1 text-[#6F6F6F] hover:text-[#B20000] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigateToWeek(currentWeek + 1)}
                disabled={!canNavigateToWeek(currentWeek + 1)}
                className="px-2 py-1 text-[#6F6F6F] hover:text-[#B20000] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Next week"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            {/* Week and date */}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[#6F6F6F]">
                  Week {currentWeek} - {getWeekDate(currentWeek)}
                </p>
                {isPlayoffWeek(currentWeek) && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-50 text-[#B20000] rounded-full border border-red-200">
                    Playoffs
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Previous week results message */}
            {currentWeek > 1 && week1TierStructure.length > 0 && !weeklyTiers[0]?.no_games && (
              <div className="text-xs text-gray-500 italic">
                Schedule updated each week based on previous week&apos;s results
              </div>
            )}
            
            {/* No games message */}
            {weeklyTiers.length > 0 && weeklyTiers[0]?.no_games && (
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                No games this week
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Display tiers for the current week */}
      <div className="space-y-6">
        {loadingWeekData ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]" role="status" aria-label="Loading"></div>
          </div>
        ) : weeklyTiers.length > 0 ? (
          // Check if this week is marked as 'no games'
          weeklyTiers[0]?.no_games ? (
            // Show 'No Games' display for this week with standard styling
            weeklyTiers.map((tier) => (
              <Card key={tier.id} className="shadow-md overflow-hidden rounded-lg opacity-60 bg-gray-50">
                <CardContent className="p-0 overflow-hidden">
                  {/* Tier Header */}
                  <div className="bg-gray-100 border-b px-8 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-400 text-xl leading-none m-0">
                          Tier {tier.tier_number}
                        </h3>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-1.5" />
                          <span className="text-sm text-gray-400">{tier.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1.5" />
                          <span className="text-sm text-gray-400">{tier.time_slot}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="h-4 w-4 text-gray-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                            <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1"/>
                            <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                          </svg>
                          <span className="text-sm text-gray-400">{tier.court}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Teams Display - No Games */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">A</div>
                        <div className="text-sm text-gray-400 italic">
                          No Games
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">B</div>
                        <div className="text-sm text-gray-400 italic">
                          No Games
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">C</div>
                        <div className="text-sm text-gray-400 italic">
                          No Games
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // NEW: Display normal weekly schedule data
            weeklyTiers.map((tier) => (
            <Card key={tier.id} className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                {/* Tier Header */}
                <div className="bg-[#F8F8F8] border-b px-8 py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-[#6F6F6F] text-xl leading-none m-0">
                        Tier {tier.tier_number}
                        {tier.is_completed && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Completed
                          </span>
                        )}
                      </h3>
                      {canSubmitScores && !tier.is_completed && !tier.no_games && tier.team_a_name && tier.team_b_name && tier.team_c_name && (
                        <button
                          onClick={() => {
                            setSelectedTierForScores(tier);
                            setIsScoresModalOpen(true);
                          }}
                          className="text-sm text-[#B20000] hover:text-[#8B0000] font-medium flex items-center gap-1 transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          Submit Scores
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className="text-sm text-[#6F6F6F]">{tier.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className="text-sm text-[#6F6F6F]">{tier.time_slot}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-[#B20000] mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                          <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1"/>
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                        </svg>
                        <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Teams Display */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">A</div>
                      <div className="text-sm text-[#6F6F6F]">
                        {tier.team_a_name ? 
                          `${tier.team_a_name} (${tier.team_a_ranking || '-'})` : 
                          <span className="text-gray-400 italic">TBD</span>
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">B</div>
                      <div className="text-sm text-[#6F6F6F]">
                        {tier.team_b_name ? 
                          `${tier.team_b_name} (${tier.team_b_ranking || '-'})` : 
                          <span className="text-gray-400 italic">TBD</span>
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">C</div>
                      <div className="text-sm text-[#6F6F6F]">
                        {tier.team_c_name ? 
                          `${tier.team_c_name} (${tier.team_c_ranking || '-'})` : 
                          <span className="text-gray-400 italic">TBD</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )
        ) : currentWeek === 1 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Schedule Available</h3>
            <p className="text-[#6F6F6F]">The league schedule hasn&apos;t been generated yet.</p>
          </div>
        ) : week1TierStructure.length > 0 ? (
          // Show empty tier structure for future weeks
          week1TierStructure.map((tier) => (
            <Card key={tier.id} className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                {/* Tier Header */}
                <div className="bg-[#F8F8F8] border-b px-8 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-[#6F6F6F] text-xl leading-none m-0">
                        Tier {tier.tier_number}
                      </h3>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className="text-sm text-[#6F6F6F]">{tier.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className="text-sm text-[#6F6F6F]">{tier.time_slot}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-[#B20000] mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                          <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1"/>
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                        </svg>
                        <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Teams Display - Empty positions */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">A</div>
                      <div className="text-sm text-gray-400 italic">
                        TBD
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">B</div>
                      <div className="text-sm text-gray-400 italic">
                        TBD
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">C</div>
                      <div className="text-sm text-gray-400 italic">
                        TBD
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">Week {currentWeek}</h3>
            <p className="text-[#6F6F6F] mb-4">This week&apos;s schedule will be available once the previous week&apos;s games are completed.</p>
            <div className="text-sm text-gray-500">
              Check back after Week {currentWeek - 1} results are finalized.
            </div>
          </div>
        )}

        {/* LEGACY: Fallback to old system if no weekly data and mockSchedule exists */}
        {weeklyTiers.length === 0 && currentWeek === 1 && mockSchedule[0]?.tiers && (
          mockSchedule[0].tiers.map((tier: Tier, tierIndex: number) => (
            <Card key={tierIndex} className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                <div className="bg-[#F8F8F8] border-b px-8 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-[#6F6F6F] text-xl leading-none m-0">
                        Tier {tier.tierNumber}
                      </h3>
                    </div>
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
                        <svg className="h-4 w-4 text-[#B20000] mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                          <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1"/>
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                        </svg>
                        <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {['A', 'B', 'C'].map(position => (
                      <div key={position} className="text-center">
                        <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                        <div className="text-sm text-[#6F6F6F]">
                          {tier.teams[position]?.name ? 
                            `${tier.teams[position].name} (${tier.teams[position].ranking || '-'})` : 
                            '-'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Submit Scores Modal */}
      {selectedTierForScores && (
        <SubmitScoresModal
          isOpen={isScoresModalOpen}
          onClose={() => {
            setIsScoresModalOpen(false);
            setSelectedTierForScores(null);
          }}
          tierData={{
            id: selectedTierForScores.id,
            tier_number: selectedTierForScores.tier_number,
            team_a_name: selectedTierForScores.team_a_name,
            team_b_name: selectedTierForScores.team_b_name,
            team_c_name: selectedTierForScores.team_c_name,
            league_id: parseInt(leagueId),
            week_number: currentWeek,
          }}
          onScoresSubmitted={() => {
            // Reload the weekly schedule to show updated status
            loadWeeklySchedule(currentWeek);
          }}
        />
      )}
    </div>
  );
}

