import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fetchLeagueById } from '../../../lib/leagues';
import { useAuth } from '../../../contexts/AuthContext';
import { SubmitScoresModal } from './SubmitScoresModal';
import type { WeeklyScheduleTier } from '../../LeagueSchedulePage/types';
import { getPositionsForFormat, getGridColsClass, getTeamCountForFormat, getTierDisplayLabel, buildWeekTierLabels } from '../../LeagueSchedulePage/utils/formatUtils';
import { getTeamForPosition } from '../../LeagueSchedulePage/utils/scheduleLogic';
import { calculateCurrentWeekToDisplay } from '../../LeagueSchedulePage/utils/weekCalculation';


interface LeagueScheduleProps {
  leagueId: string;
}

export function LeagueSchedule({ leagueId }: LeagueScheduleProps) {
  const { userProfile } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [weeklyTiers, setWeeklyTiers] = useState<WeeklyScheduleTier[]>([]);
  const [submittedTierNumbers, setSubmittedTierNumbers] = useState<Set<number>>(new Set());
  const [loadingWeekData, setLoadingWeekData] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState<{
    start_date: string | null;
    end_date: string | null;
    playoff_weeks: number;
    schedule_visible?: boolean | null;
  } | null>(null);
  const [week1TierStructure, setWeek1TierStructure] = useState<WeeklyScheduleTier[]>([]);
  const [selectedTierForScores, setSelectedTierForScores] = useState<WeeklyScheduleTier | null>(
    null,
  );
  const [isScoresModalOpen, setIsScoresModalOpen] = useState(false);
  // const [teamPositions, setTeamPositions] = useState<Map<string, number>>(new Map());
  const [isScheduleVisible, setIsScheduleVisible] = useState<boolean>(true);
  // Restrict navigation to current week and the following week for all users on public schedule
  const restrictToTwoWeeks = true;
  // Public schedule: do not show per-team W/L badges
  const weekNoGames = weeklyTiers.length > 0 && weeklyTiers.every((t) => !!t.no_games);
  const labelMap = buildWeekTierLabels(weeklyTiers);
  const templateLabelMap = buildWeekTierLabels(week1TierStructure);
  
  // Check if user is admin or facilitator (used only for Submit Scores button visibility)
  const canSubmitScores = userProfile?.is_admin || userProfile?.is_facilitator;

  // Fetch league info for playoff weeks calculation and set initial week
  useEffect(() => {
    const fetchLeagueInfo = async () => {
      if (!leagueId) return;

      try {
        const leagueData = await fetchLeagueById(parseInt(leagueId));
        if (leagueData) {
          setLeagueInfo({
            start_date: leagueData.start_date,
            end_date: leagueData.end_date,
            playoff_weeks: leagueData.playoff_weeks || 0,
            // schedule_visible may not exist in older types; cast defensively
            schedule_visible: (leagueData as any).schedule_visible ?? true
          });
          setIsScheduleVisible(((leagueData as any).schedule_visible ?? true) as boolean);
          
          // Calculate base week from dates (day-of-week + 11pm rule)
          const calculatedWeek = calculateCurrentWeekToDisplay(
            leagueData.start_date,
            leagueData.end_date,
            leagueData.day_of_week,
          );

          // Determine if date logic already advanced beyond the simple week bucket
          let baseNoAdvance = 1;
          if (leagueData.start_date) {
            const start = new Date(leagueData.start_date + 'T00:00:00');
            const today = new Date();
            const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            baseNoAdvance = Math.max(1, Math.floor(diffDays / 7) + 1);
          }
          const dateAdvanced = calculatedWeek > baseNoAdvance;

          // Figure out which week to check for completeness and where to land if complete
          const weekToCheck = dateAdvanced ? Math.max(1, calculatedWeek - 1) : calculatedWeek;
          let targetWeek = dateAdvanced ? calculatedWeek : calculatedWeek + 1;

          // Cap target by total weeks if end_date exists
          if (leagueData.end_date && leagueData.start_date) {
            const start = new Date(leagueData.start_date + 'T00:00:00');
            const end = new Date(leagueData.end_date + 'T00:00:00');
            const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
            if (targetWeek > totalWeeks) targetWeek = totalWeeks;
          }

          // Load prior week completeness and choose week accordingly
          const leagueIdNum = parseInt(leagueId);
          let weekToShow = weekToCheck;
          try {
            const { data: tiers } = await supabase
              .from('weekly_schedules')
              .select('tier_number, no_games')
              .eq('league_id', leagueIdNum)
              .eq('week_number', weekToCheck)
              .limit(1000);
            const playableTiers = (tiers || []).filter((t: any) => !t.no_games);

            if (playableTiers.length > 0) {
              const { data: submitted } = await supabase
                .from('game_results')
                .select('tier_number')
                .eq('league_id', leagueIdNum)
                .eq('week_number', weekToCheck)
                .limit(1000);
              const submittedSet = new Set<number>((submitted || []).map((r: any) => Number(r.tier_number)));
              const allTiersHaveScores = playableTiers.every((t: any) => submittedSet.has(Number(t.tier_number)));
              weekToShow = allTiersHaveScores ? targetWeek : weekToCheck;
            } else {
              // No playable tiers (all no-games) — consider complete
              weekToShow = targetWeek;
            }
          } catch {
            // On error, fall back to showing the week without advancing
            weekToShow = weekToCheck;
          }

          setCurrentWeek(weekToShow);
        }
      } catch (error) {
        console.error("Error fetching league info:", error);
      }
    };

    fetchLeagueInfo();
  }, [leagueId]);

  useEffect(() => {
    loadWeekStartDate();
    loadWeeklySchedule(currentWeek);
    loadWeek1Structure();
    // loadTeamPositions(); // Load current standings positions for display
  }, [leagueId]);
  useEffect(() => {
    loadWeeklySchedule(currentWeek);
  }, [currentWeek]);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadWeekStartDate();
        loadWeeklySchedule(currentWeek);
        // loadTeamPositions();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [leagueId, currentWeek]);
  // Remove fallback that overwrote the computed initial week; keep currentWeek as chosen above

  const loadWeekStartDate = async () => {
    try {
      // Loading league start date for league
      const { data, error } = await supabase
        .from("leagues")
        .select("start_date")
        .eq("id", parseInt(leagueId))
        .single();

      if (error) {
        console.error("Error loading league start date:", error);
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
      console.error("Error loading league start date:", error);
    }
  };

  // const loadTeamPositions = async () => {
  //   try {
  //     const { data: standingsData, error } = await supabase
  //       .from('standings')
  //       .select(`
  //         teams!inner(name),
  //         current_position
  //       `)
  //       .eq('league_id', parseInt(leagueId))
  //       .order('current_position', { ascending: true, nullsFirst: false });

  //     if (error && error.code !== 'PGRST116') {
  //       console.warn('Error loading team standings for positions:', error);
  //       return;
  //     }

  //     if (standingsData && standingsData.length > 0) {
  //       const positionsMap = new Map<string, number>();
  //       standingsData.forEach((standing: any) => {
  //         positionsMap.set(standing.teams.name, standing.current_position || 1);
  //       });

  //       setTeamPositions(positionsMap);
  //     }
  //   } catch (error) {
  //     console.warn('Error loading team positions for schedule:', error);
  //   }
  // };
  
  const getCurrentWeek = (): number => {
    if (!startDate) return 1;

    // Parse start date as local date to avoid timezone shifts
    const start = new Date(startDate + "T00:00:00");
    const today = new Date();

    // Calculate weeks difference
    const diffTime = today.getTime() - start.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

    return Math.max(1, diffWeeks);
  };

  const getWeekDate = (weekNumber: number): string => {
    if (!startDate) return "League start date not set";

    // Always calculate from start date for consistency
    // This ensures both admin and public views show the same dates
    const baseDate = new Date(startDate + "T00:00:00");
    const weekOffset = weekNumber - 1;

    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    return baseDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const canNavigateToWeek = (weekNumber: number): boolean => {
    if (weekNumber < 1) return false;

    // Calculate maximum weeks (regular season + playoffs)
    if (leagueInfo?.end_date && leagueInfo?.start_date) {
      const start = new Date(leagueInfo.start_date + "T00:00:00");
      const end = new Date(leagueInfo.end_date + "T00:00:00");
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      const maxWeeks = regularSeasonWeeks + (leagueInfo.playoff_weeks || 0);

      // If user is a captain/player (not admin/facilitator), restrict to current and next week
      if (restrictToTwoWeeks) {
        const todayWeek = getCurrentWeek();
        const minAllowed = Math.max(1, todayWeek);
        const maxAllowed = Math.min(maxWeeks, todayWeek + 1);
        return weekNumber >= minAllowed && weekNumber <= maxAllowed;
      }

      return weekNumber <= maxWeeks;
    }

    // Fallback: allow navigation to reasonable number of weeks
    if (restrictToTwoWeeks) {
      const todayWeek = getCurrentWeek();
      const minAllowed = Math.max(1, todayWeek);
      const maxAllowed = todayWeek + 1;
      return weekNumber >= minAllowed && weekNumber <= maxAllowed;
    }
    return weekNumber <= 20;
  };

  const isPlayoffWeek = (weekNumber: number): boolean => {
    if (!leagueInfo?.start_date || !leagueInfo?.end_date) return false;

    const start = new Date(leagueInfo.start_date + "T00:00:00");
    const end = new Date(leagueInfo.end_date + "T00:00:00");
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
        .from("weekly_schedules")
        .select("tier_number, location, time_slot, court, format")
        .eq("league_id", parseInt(leagueId))
        .eq("week_number", 1)
        .order("tier_number", { ascending: true });

      if (error) {
        console.error("Error loading Week 1 structure:", error);
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
          team_d_name: null,
          team_d_ranking: null,
          team_e_name: null,
          team_e_ranking: null,
          team_f_name: null,
          team_f_ranking: null,
          is_completed: false,
        }));
        setWeek1TierStructure(templateTiers);
      }
    } catch (error) {
      console.error("Error loading Week 1 structure:", error);
    }
  };

  const loadWeeklySchedule = async (weekNumber: number) => {
    try {
      setLoadingWeekData(true);
      // Loading weekly schedule for week and league

      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("league_id", parseInt(leagueId))
        .eq("week_number", weekNumber)
        .order("tier_number", { ascending: true });

      if (error) {
        console.error("Error loading weekly schedule:", error);
        setWeeklyTiers([]);
        return;
      }

      // Loaded weekly schedule data
      setWeeklyTiers(data || []);

      // Load which tiers already have a submitted scorecard this week
      try {
        const { data: submitted } = await supabase
          .from('game_results')
          .select('tier_number')
          .eq('league_id', parseInt(leagueId))
          .eq('week_number', weekNumber)
          .limit(1000);
        const set = new Set<number>();
        (submitted || []).forEach((r: any) => set.add(r.tier_number));
        setSubmittedTierNumbers(set);
      } catch {}

      // No public W/L tags
    } catch (error) {
      console.error("Error loading weekly schedule:", error);
      setWeeklyTiers([]);
    } finally {
      setLoadingWeekData(false);
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Schedule</h2>
      <div className="relative">
        {/* Overlay when schedule is hidden from public - show banner at top */}
        {isScheduleVisible ? null : (
          <div className="absolute left-0 right-0 top-0 z-20 flex justify-center bg-transparent">
            <div className="mx-4 my-2 px-6 py-2 rounded-full bg-[#B20000] text-white font-semibold shadow-md">
              Working on it—Serving soon.
            </div>
          </div>
        )}

        {/* Content container that we blur and disable when hidden */}
        <div className={`${isScheduleVisible ? '' : 'pointer-events-none blur-[5px]'} pt-10`}>
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
                {currentWeek <= 2 && !isPlayoffWeek(currentWeek) && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">
                    Seeding week
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Previous week results message */}
            {currentWeek > 1 && week1TierStructure.length > 0 && !weekNoGames && (
              <div className="text-xs text-gray-500 italic">
                Schedule updated each week based on previous week&apos;s results
              </div>
            )}

            {/* No games message */}
            {weekNoGames && (
              <div className="px-2 py-1 rounded-full text-xs font-semibold bg-[#B20000] text-white">
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
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"
              role="status"
              aria-label="Loading"
            ></div>
          </div>
        ) : weeklyTiers.length > 0 ? (
          // Check if this week is marked as 'no games' (all tiers no_games)
          weekNoGames ? (
            // Show 'No Games' display for this week with standard styling
            weeklyTiers.map((tier) => (
              <Card
                key={tier.id}
                className="shadow-md overflow-hidden rounded-lg opacity-60 bg-gray-50"
              >
                <CardContent className="p-0 overflow-hidden">
                  {/* Tier Header */}
                  <div className="bg-gray-100 border-b px-8 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-400 text-xl leading-none m-0">
                          Tier {templateLabelMap.get((tier.id ?? tier.tier_number) as number) || getTierDisplayLabel(tier.format, tier.tier_number)}
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
                          <svg
                            className="h-4 w-4 text-gray-400 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                            <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1" />
                            <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1" />
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
                        <div className="text-sm text-gray-400 italic">No Games</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">B</div>
                        <div className="text-sm text-gray-400 italic">No Games</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">C</div>
                        <div className="text-sm text-gray-400 italic">No Games</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // NEW: Display normal weekly schedule data
            weeklyTiers.map((tier) => (
            <Card key={tier.id} className={`shadow-md overflow-hidden rounded-lg ${tier.no_games ? 'bg-gray-100' : ''}`}>
              <CardContent className="p-0 overflow-hidden">
                {/* Tier Header */}
                <div className={`${(tier.tier_number ?? 0) % 2 === 1 ? 'bg-red-50' : 'bg-[#F8F8F8]'} border-b px-8 py-3`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className={`flex items-center font-bold text-[#6F6F6F] text-xl leading-none m-0 ${tier.no_games ? 'opacity-50' : ''}`}>
                        Tier {labelMap.get((tier.id ?? tier.tier_number) as number) || getTierDisplayLabel(tier.format, tier.tier_number)}
                        {(tier.is_completed || submittedTierNumbers.has(tier.tier_number)) && (
                          <span className="ml-2 inline-flex items-center align-middle px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Completed
                          </span>
                        )}
                      </h3>
                      {tier.no_games && (
                        <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-[#B20000] text-white rounded-full">
                          No games
                        </span>
                      )}
                      {canSubmitScores && !tier.no_games &&
                        (tier.format === '3-teams-6-sets' || tier.format === '2-teams-4-sets' || tier.format === '2-teams-best-of-5' || tier.format === '4-teams-head-to-head' || tier.format === '6-teams-head-to-head' || tier.format === '2-teams-elite' || tier.format === '3-teams-elite-6-sets' || tier.format === '3-teams-elite-9-sets') &&
                        getPositionsForFormat(tier.format || '3-teams-6-sets').every(pos => getTeamForPosition(tier, pos)?.name) && (
                         <button
                           onClick={() => {
                             setSelectedTierForScores(tier);
                             setIsScoresModalOpen(true);
                           }}
                           className="ml-3 text-sm text-[#B20000] hover:text-[#8B0000] hover:underline font-medium transition-colors"
                         >
                          {submittedTierNumbers.has(tier.tier_number)
                            ? ((getCurrentWeek() >= (currentWeek - 1)) ? 'Edit scores' : 'View scores')
                            : 'Submit scores'}
                         </button>
                       )}
                      {/* Removed duplicate status text; Completed badge covers this state */}
                    </div>
                    
                    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right ${tier.no_games ? 'opacity-50' : ''}`}>
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
                <div className={`p-4 ${tier.no_games ? 'opacity-50' : ''}`}> 
                  {tier.no_games ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">A</div>
                        <div className="text-sm text-gray-400 italic">No Games</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">B</div>
                        <div className="text-sm text-gray-400 italic">No Games</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-400 mb-1">C</div>
                        <div className="text-sm text-gray-400 italic">No Games</div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const fmt = String(tier.format || '').toLowerCase().trim();
                      const isFourTeam = (
                        fmt === '4-teams-head-to-head' ||
                        fmt.includes('4 teams') ||
                        fmt.includes('4-teams') ||
                        getTeamCountForFormat(tier.format || '3-teams-6-sets') === 4 ||
                        Boolean((tier as any).team_d_name)
                      );
                      const isSixTeam = (
                        fmt === '6-teams-head-to-head' ||
                        fmt.includes('6 teams') ||
                        fmt.includes('6-teams') ||
                        getTeamCountForFormat(tier.format || '3-teams-6-sets') === 6 ||
                        Boolean((tier as any).team_e_name || (tier as any).team_f_name)
                      );
                      if (!isFourTeam && !isSixTeam) {
                        return (
                          <div className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || '3-teams-6-sets'))} gap-4`}>
                            {getPositionsForFormat(tier.format || '3-teams-6-sets').map((position) => {
                              const team = getTeamForPosition(tier, position);
                              return (
                                <div key={position} className="text-center">
                                  <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                  <div className="text-sm text-[#6F6F6F]">
                                    {team?.name ?
                                      team.name :
                                      <span className="text-gray-400 italic">TBD</span>
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                       if (isSixTeam) {
                         return (
                           <div className="relative">
                             {/* Desktop/tablet: 3 courts side-by-side */}
                             <div className="hidden sm:grid grid-cols-6 text-[12px] text-[#6B7280] mb-1">
                               <div className="col-span-2 text-center font-semibold">Court 1</div>
                               <div className="col-span-2 text-center font-semibold">Court 2</div>
                               <div className="col-span-2 text-center font-semibold">Court 3</div>
                             </div>
                             <div className="hidden sm:block absolute left-1/3 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
                             <div className="hidden sm:block absolute left-2/3 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
                             <div className="hidden sm:grid grid-cols-6 gap-4">
                               {(['A','B','C','D','E','F'] as const).map((position) => {
                                 const team = getTeamForPosition(tier, position);
                                 return (
                                   <div key={position} className="text-center">
                                     <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                     <div className="text-sm text-[#6F6F6F]">
                                       {team?.name ?
                                         team.name :
                                         <span className="text-gray-400 italic">TBD</span>
                                       }
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                             {/* Mobile: stack courts vertically */}
                             <div className="sm:hidden">
                               {[
                                 { label: 'Court 1', positions: ['A','B'] as const },
                                 { label: 'Court 2', positions: ['C','D'] as const },
                                 { label: 'Court 3', positions: ['E','F'] as const },
                               ].map((court, idx) => (
                                 <div key={court.label} className={idx > 0 ? 'pt-3 mt-3 border-t border-gray-200' : ''}>
                                   <div className="grid grid-cols-2 gap-4">
                                     <div className="col-span-2 text-[12px] text-[#6B7280] font-semibold">{court.label}</div>
                                     {court.positions.map((position) => {
                                       const team = getTeamForPosition(tier, position);
                                       return (
                                         <div key={position} className="text-center">
                                           <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                           <div className="text-sm text-[#6F6F6F]">
                                             {team?.name ? team.name : <span className="text-gray-400 italic">TBD</span>}
                                           </div>
                                         </div>
                                       );
                                     })}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         );
                       }
                      // Four-team head-to-head layout (Courts 1-2)
                      return (
                        <div className="relative">
                          <div className="grid grid-cols-4 text-[12px] text-[#6B7280] mb-1">
                            <div className="col-span-2 text-center font-semibold">Court 1</div>
                            <div className="col-span-2 text-center font-semibold">Court 2</div>
                          </div>
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
                          <div className="grid grid-cols-4 gap-4">
                            {(['A','B','C','D'] as const).map((position) => {
                              const team = getTeamForPosition(tier, position);
                              return (
                                <div key={position} className="text-center">
                                  <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                  <div className="text-sm text-[#6F6F6F]">
                                    {team?.name ?
                                      team.name :
                                      <span className="text-gray-400 italic">TBD</span>
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  )}
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
                        Tier {getTierDisplayLabel(tier.format, tier.tier_number)}
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
                        <svg
                          className="h-4 w-4 text-[#B20000] mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                          <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1" />
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1" />
                        </svg>
                        <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teams Display - Empty positions */}
                <div className="p-4">
                  {(() => {
                    const fmt = String(tier.format || '').toLowerCase().trim();
                    const likelyFourTeam = (
                      fmt === '4-teams-head-to-head' ||
                      fmt.includes('4 teams') ||
                      fmt.includes('4-teams') ||
                      getTeamCountForFormat(tier.format || '3-teams-6-sets') === 4 ||
                      Boolean((tier as any).team_d_name)
                    );
                    const likelySixTeam = (
                      fmt === '6-teams-head-to-head' ||
                      fmt.includes('6 teams') ||
                      fmt.includes('6-teams') ||
                      getTeamCountForFormat(tier.format || '3-teams-6-sets') === 6 ||
                      Boolean((tier as any).team_e_name || (tier as any).team_f_name)
                    );
                    if (likelySixTeam) {
                      return (
                        <div className="relative">
                          {/* Desktop/tablet */}
                          <div className="hidden sm:grid grid-cols-6 text-[12px] text-[#6B7280] mb-1">
                            <div className="col-span-2 text-center font-semibold">Court 1</div>
                            <div className="col-span-2 text-center font-semibold">Court 2</div>
                            <div className="col-span-2 text-center font-semibold">Court 3</div>
                          </div>
                          <div className="hidden sm:block absolute left-1/3 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
                          <div className="hidden sm:block absolute left-2/3 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
                          <div className="hidden sm:grid grid-cols-6 gap-4">
                            {(['A','B','C','D','E','F'] as const).map((position) => (
                              <div key={position} className="text-center">
                                <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                <div className="text-sm text-gray-400 italic">
                                  {(tier as any)[`team_${position.toLowerCase()}_name`] ? (
                                    <span>{(tier as any)[`team_${position.toLowerCase()}_name`]}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">TBD</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Mobile stacked */}
                          <div className="sm:hidden">
                            {[
                              { label: 'Court 1', positions: ['A','B'] as const },
                              { label: 'Court 2', positions: ['C','D'] as const },
                              { label: 'Court 3', positions: ['E','F'] as const },
                            ].map((court, idx) => (
                              <div key={court.label} className={idx > 0 ? 'pt-3 mt-3 border-t border-gray-200' : ''}>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2 text-[12px] text-[#6B7280] font-semibold">{court.label}</div>
                                  {court.positions.map((position) => (
                                    <div key={position} className="text-center">
                                      <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                      <div className="text-sm text-[#6F6F6F]">
                                        {(tier as any)[`team_${position.toLowerCase()}_name`] ? (
                                          <span>{(tier as any)[`team_${position.toLowerCase()}_name`]}</span>
                                        ) : (
                                          <span className="text-gray-400 italic">TBD</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    if (likelyFourTeam) {
                      return (
                        <div className="relative">
                          {/* Court labels */}
                          <div className="grid grid-cols-4 text-[12px] text-[#6B7280] mb-1">
                            <div className="col-span-2 text-center font-semibold">Court 1</div>
                            <div className="col-span-2 text-center font-semibold">Court 2</div>
                          </div>
                          {/* Vertical separator between courts */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
                          <div className="grid grid-cols-4 gap-4">
                            {(['A','B','C','D'] as const).map((position) => (
                              <div key={position} className="text-center">
                                <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                                <div className="text-sm text-[#6F6F6F]">
                                  {(tier as any)[`team_${position.toLowerCase()}_name`] ? (
                                    <span>{(tier as any)[`team_${position.toLowerCase()}_name`]}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">TBD</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || '3-teams-6-sets'))} gap-4`}>
                        {getPositionsForFormat(tier.format || '3-teams-6-sets').map((position) => (
                          <div key={position} className="text-center">
                            <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                            <div className="text-sm text-[#6F6F6F]">
                              {(tier as any)[`team_${position.toLowerCase()}_name`] ? (
                                <span>{(tier as any)[`team_${position.toLowerCase()}_name`]}</span>
                              ) : (
                                <span className="text-gray-400 italic">TBD</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">Week {currentWeek}</h3>
            <p className="text-[#6F6F6F] mb-4">
              This week&apos;s schedule will be available once the previous week&apos;s games are
              completed.
            </p>
            <div className="text-sm text-gray-500">
              Check back after Week {currentWeek - 1} results are finalized.
            </div>
          </div>
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
          weeklyTier={selectedTierForScores}
          onSuccess={async () => {
            try { await loadWeeklySchedule(currentWeek); } catch {}
          }}
        />
      )}
      </div>{/* end blurred content container */}
      </div>{/* end relative wrapper */}
    </div>
  );
}

