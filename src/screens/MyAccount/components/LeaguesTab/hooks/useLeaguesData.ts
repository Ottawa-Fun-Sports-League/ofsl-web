import { useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { fetchSports, fetchSkills } from '../../../../../lib/leagues';
import { useAuth } from '../../../../../contexts/AuthContext';
import { LeagueWithTeamCount, Sport, Skill, Gym } from '../types';

export function useLeaguesData() {
  const { userProfile } = useAuth();
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
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
        
        // Get team counts for each league
        const { data: teamCounts, error: teamCountsError } = await supabase
          .from('teams')
          .select('league_id, id')
          .eq('active', true);

        if (teamCountsError) {
          console.error('Error fetching team counts:', teamCountsError);
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
        
        // Count teams per league
        teamCounts?.forEach(team => {
          const currentCount = teamCountsMap.get(team.league_id) || 0;
          teamCountsMap.set(team.league_id, currentCount + 1);
        });
        
        if (leaguesData) {
          const leaguesWithDetails = leaguesData.map(league => {
            const teamCount = teamCountsMap.get(league.id) || 0;
            const maxTeams = league.max_teams || 20;
            const spotsRemaining = Math.max(0, maxTeams - teamCount);

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

            return {
              ...league,
              sport_name: league.sports?.name || null,
              skill_name: league.skills?.name || null,
              skill_ids: league.skill_ids || [],
              skill_names: skill_names,
              gyms: leagueGyms,
              team_count: teamCount,
              spots_remaining: spotsRemaining
            };
          });
          setLeagues(leaguesWithDetails);
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
    loadData
  };
}