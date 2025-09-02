import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

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

      // First, get teams data
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          roster,
          created_at
        `)
        .eq('league_id', parseInt(leagueId))
        .eq('active', true) as {
          data: Array<{
            id: number;
            name: string;
            roster: string[] | null;
            created_at: string;
          }> | null;
          error: PostgrestError | null;
        };

      if (teamsError) throw teamsError;

      // Then, try to get schedule data for rankings
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('league_schedules')
        .select('schedule_data')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        console.warn('Error loading schedule data:', scheduleError);
      }

      // Extract team rankings from schedule if available
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

      // Transform the data into standings format
      const standingsData: StandingsTeam[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        roster_size: team.roster?.length || 0,
        wins: 0, // No game data yet
        losses: 0, // No game data yet
        points: 0, // No game data yet  
        differential: 0, // No game data yet
        created_at: team.created_at,
        schedule_ranking: teamRankings.get(team.name)
      }));

      // Sort by schedule ranking if available, otherwise by registration order
      const sortedStandings = standingsData.sort((a, b) => {
        // If both teams have schedule rankings, sort by ranking
        if (a.schedule_ranking && b.schedule_ranking) {
          return a.schedule_ranking - b.schedule_ranking;
        }
        // If only one has ranking, prioritize it
        if (a.schedule_ranking && !b.schedule_ranking) {
          return -1;
        }
        if (!a.schedule_ranking && b.schedule_ranking) {
          return 1;
        }
        // If neither has ranking, sort by registration order
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setTeams(sortedStandings);
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