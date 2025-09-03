import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export interface StandingsTeam {
  id: number;
  name: string;
  roster_size: number;
  wins: number;
  losses: number;
  points: number;
  differential: number;
  created_at: string;
  schedule_ranking?: number;
}

export function useLeagueStandings(leagueId: string | undefined) {
  const [teams, setTeams] = useState<StandingsTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSchedule, setHasSchedule] = useState(false);

  const loadTeams = async () => {
    if (!leagueId) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data: standingsData } = await supabase
        .from('standings')
        .select(`
          id,
          team_id,
          wins,
          losses,
          points,
          point_differential,
          manual_wins_adjustment,
          manual_losses_adjustment,
          manual_points_adjustment,
          manual_differential_adjustment,
          current_position,
          teams!inner(
            id,
            name,
            roster,
            created_at,
            active
          )
        `)
        .eq('league_id', parseInt(leagueId))
        .eq('teams.active', true)  // Only show active teams
        .order('current_position', { ascending: true, nullsFirst: false });


      if (standingsData && standingsData.length > 0) {
        // Get schedule data for rankings
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('league_schedules')
          .select('schedule_data')
          .eq('league_id', parseInt(leagueId))
          .maybeSingle();

        if (scheduleError && scheduleError.code !== 'PGRST116') {
          console.warn('Error loading schedule data:', scheduleError);
        }

        const teamRankings = new Map<string, number>();
        const scheduleExists = !!(scheduleData?.schedule_data?.tiers);
        setHasSchedule(scheduleExists);
        
        if (scheduleExists) {
          scheduleData.schedule_data.tiers.forEach((tier: {teams?: Record<string, {name: string; ranking: number} | null>}) => {
            if (tier.teams) {
              Object.values(tier.teams).forEach((team: {name: string; ranking: number} | null) => {
                if (team && team.name && team.ranking) {
                  teamRankings.set(team.name, team.ranking);
                }
              });
            }
          });
        }

        const formattedStandings: StandingsTeam[] = standingsData.map((standing: any) => ({
          id: standing.teams.id,
          name: standing.teams.name,
          roster_size: standing.teams.roster?.length || 0,
          wins: (standing.wins || 0) + (standing.manual_wins_adjustment || 0),
          losses: (standing.losses || 0) + (standing.manual_losses_adjustment || 0),
          points: (standing.points || 0) + (standing.manual_points_adjustment || 0),
          differential: (standing.point_differential || 0) + (standing.manual_differential_adjustment || 0),
          created_at: standing.teams.created_at,
          schedule_ranking: teamRankings.get(standing.teams.name)
        }));

        setTeams(formattedStandings);
        return;
      }

      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, roster, created_at')
        .eq('league_id', parseInt(leagueId))
        .eq('active', true);

      if (teamsError) throw teamsError;

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('league_schedules')
        .select('schedule_data')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        console.warn('Error loading schedule data:', scheduleError);
      }

      const teamRankings = new Map<string, number>();
      const scheduleExists = !!(scheduleData?.schedule_data?.tiers);
      setHasSchedule(scheduleExists);
      
      if (scheduleExists) {
        scheduleData.schedule_data.tiers.forEach((tier: {teams?: Record<string, {name: string; ranking: number} | null>}) => {
          if (tier.teams) {
            Object.values(tier.teams).forEach((team: {name: string; ranking: number} | null) => {
              if (team && team.name && team.ranking) {
                teamRankings.set(team.name, team.ranking);
              }
            });
          }
        });
      }

      const fallbackStandings: StandingsTeam[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        roster_size: team.roster?.length || 0,
        wins: 0,
        losses: 0,
        points: 0,
        differential: 0,
        created_at: team.created_at,
        schedule_ranking: teamRankings.get(team.name)
      }));

      const sortedFallback = fallbackStandings.sort((a, b) => {
        if (a.schedule_ranking && b.schedule_ranking) {
          return a.schedule_ranking - b.schedule_ranking;
        }
        if (a.schedule_ranking && !b.schedule_ranking) {
          return -1;
        }
        if (!a.schedule_ranking && b.schedule_ranking) {
          return 1;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setTeams(sortedFallback);
    } catch (err) {
      console.error('Error loading teams for standings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  return {
    teams,
    loading,
    error,
    hasSchedule,
    refetch: loadTeams
  };
}