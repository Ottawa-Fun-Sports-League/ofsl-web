import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export interface StandingsTeam {
  id: number;
  name: string;
  captain_name: string | null;
  roster_size: number;
  wins: number;
  losses: number;
  points: number;
  differential: number;
  created_at: string;
  captain_id: string;
}

export function useLeagueStandings(leagueId: string | undefined) {
  const [teams, setTeams] = useState<StandingsTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = async () => {
    if (!leagueId) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          created_at,
          users:captain_id(name)
        `)
        .eq('league_id', parseInt(leagueId))
        .eq('active', true)
        .order('created_at', { ascending: true }) as {
          data: Array<{
            id: number;
            name: string;
            captain_id: string;
            roster: string[] | null;
            created_at: string;
            users: { name: string } | null;
          }> | null;
          error: any;
        };

      if (error) throw error;

      // Transform the data into standings format
      const standingsData: StandingsTeam[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        captain_name: team.users?.name || null,
        captain_id: team.captain_id,
        roster_size: team.roster?.length || 0,
        wins: 0, // No game data yet
        losses: 0, // No game data yet
        points: 0, // No game data yet  
        differential: 0, // No game data yet
        created_at: team.created_at
      }));

      setTeams(standingsData);
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
    refetch: loadTeams
  };
}