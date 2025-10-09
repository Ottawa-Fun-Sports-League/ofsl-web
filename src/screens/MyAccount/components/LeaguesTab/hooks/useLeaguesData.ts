import { useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { fetchSports, fetchSkills, sortLeaguesByDay, isLeagueArchived } from '../../../../../lib/leagues';
import { useAuth } from '../../../../../contexts/AuthContext';
import { LeagueWithTeamCount, Sport, Skill, Gym } from '../types';

export function useLeaguesData() {
  const { userProfile } = useAuth();
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [archivedLeagues, setArchivedLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [sportsData, skillsData] = await Promise.all([
        fetchSports(),
        fetchSkills()
      ]);
      
      setSports(sportsData);
      setSkills(skillsData);

      if (userProfile?.is_admin) {
        // Load gyms and leagues in parallel
        const [gymsResponse, leaguesResponse] = await Promise.all([
          supabase.from('gyms').select('*').order('gym'),
          supabase.from('leagues').select(`
            *,
            sports:sport_id(name),
            skills:skill_id(name)
          `).order('created_at', { ascending: false })
        ]);

        if (gymsResponse.data) {
          setGyms(gymsResponse.data);
        }
        
        const { data: leaguesData, error: leaguesError } = leaguesResponse;
        if (leaguesError) throw leaguesError;
        
        // Get team counts, schedule info, and standings info for each league
        const [teamCountsResponse, schedulesResponse, standingsResponse] = await Promise.all([
          supabase
            .from('teams')
            .select('league_id, id')
            .eq('active', true),
          supabase
            .from('league_schedules')
            .select('league_id'),
          supabase
            .from('standings')
            .select('league_id')
        ]);

        const { data: teamCounts, error: teamCountsError } = teamCountsResponse;
        const { data: schedules, error: schedulesError } = schedulesResponse;
        const { data: standings, error: standingsError } = standingsResponse;

        if (teamCountsError) {
          console.error('Error fetching team counts:', teamCountsError);
        }
        
        if (schedulesError) {
          console.error('Error fetching schedules:', schedulesError);
        }
        
        if (standingsError) {
          console.error('Error fetching standings:', standingsError);
        }
        
        // Get individual registration counts from payment records (team_id is null for individual registrations)
        const { data: individualPayments, error: individualPaymentsError } = await supabase
          .from('league_payments')
          .select('league_id')
          .is('team_id', null);
        
        if (individualPaymentsError) {
          console.error('Error fetching individual registration payments:', individualPaymentsError);
        }

        // Get all unique gym IDs from leagues
        const allGymIds = new Set<number>();
        leaguesData?.forEach(league => {
          if (league.gym_ids) {
            league.gym_ids.forEach((id: string | number) => allGymIds.add(Number(id)));
          }
        });

        const gymsMap = new Map(gymsResponse.data?.map(gym => [gym.id, gym]) || []);
        const teamCountsMap = new Map<number, number>();
        const individualCountsMap = new Map<number, number>();
        
        // Create map of leagues with schedules
        const schedulesMap = new Set<number>();
        if (schedules) {
          schedules.forEach(schedule => {
            schedulesMap.add(schedule.league_id);
          });
        }
        
        // Create map of leagues with standings
        const standingsMap = new Set<number>();
        if (standings) {
          standings.forEach(standing => {
            standingsMap.add(standing.league_id);
          });
        }
        
        // Debug: Log schedule information
        // console.log('Schedule IDs found:', Array.from(schedulesMap));
        // console.log('Schedules data:', schedules);
        
        // Count teams per league
        teamCounts?.forEach(team => {
          const currentCount = teamCountsMap.get(team.league_id) || 0;
          teamCountsMap.set(team.league_id, currentCount + 1);
        });
        
        // Count individual registrations per league from payment records
        individualPayments?.forEach(payment => {
          const currentCount = individualCountsMap.get(payment.league_id) || 0;
          individualCountsMap.set(payment.league_id, currentCount + 1);
        });
        
        if (leaguesData) {
          const leaguesWithDetails = leaguesData.map(league => {
            const isArchived = isLeagueArchived(league);
            // For individual leagues, count individuals; for team leagues, count teams
            const isIndividualLeague = league.team_registration === false;
            const registrationCount = isIndividualLeague 
              ? (individualCountsMap.get(league.id) || 0)
              : (teamCountsMap.get(league.id) || 0);
            const maxCapacity = league.max_teams || 20;
            const spotsRemaining = Math.max(0, maxCapacity - registrationCount);

            // Get gyms for this league
            const leagueGyms = (league.gym_ids || [])
              .map((gymId: string | number) => gymsMap.get(Number(gymId)))
              .filter((gym: Gym | undefined): gym is Gym => gym !== undefined);

            // Get skill names array if skill_ids exist
            let skill_names: string[] | null = null;
            if (league.skill_ids && league.skill_ids.length > 0) {
              skill_names = league.skill_ids
                .map((id: number) => {
                  const skill = skillsData.find(s => s.id === id);
                  return skill?.name;
                })
                .filter((name: string | undefined): name is string => name !== undefined);
            }

            const hasSchedule = schedulesMap.has(league.id);
            const hasStandings = standingsMap.has(league.id);

            return {
              ...league,
              sport_name: league.sports?.name || null,
              skill_name: league.skills?.name || null,
              skill_ids: league.skill_ids || [],
              skill_names: skill_names,
              gyms: leagueGyms,
              is_draft: league.is_draft ?? false,
              publish_date: league.publish_date ?? null,
              team_count: registrationCount,  // This now represents either teams or individuals
              spots_remaining: spotsRemaining,
              is_individual: isIndividualLeague,
              has_schedule: hasSchedule,
              has_standings: hasStandings,
              is_archived: isArchived
            };
          });
          
          const activeLeagues = leaguesWithDetails.filter(league => !league.is_archived);
          const archived = leaguesWithDetails.filter(league => league.is_archived);

          const sortedActive = sortLeaguesByDay(activeLeagues);
          const sortedArchived = sortLeaguesByDay(archived);

          setLeagues(sortedActive);
          setArchivedLeagues(sortedArchived);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    leagues,
    sports,
    skills,
    gyms,
    loading,
    loadData,
    archivedLeagues
  };
}
