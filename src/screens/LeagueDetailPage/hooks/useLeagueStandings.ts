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
      const leagueIdNumber = Number.parseInt(leagueId, 10);
      if (Number.isNaN(leagueIdNumber)) {
        setTeams([]);
        setHasSchedule(false);
        return;
      }

      type ScheduleTierTeam = { name: string; ranking: number };
      type ScheduleTier = { teams?: Record<string, ScheduleTierTeam | null> | null };
      type ScheduleRow = { schedule_data: { tiers?: ScheduleTier[] | null } | null };

      const getScheduleRankings = async () => {
        const { data, error: scheduleError } = await supabase
          .from('league_schedules')
          .select('schedule_data')
          .eq('league_id', leagueIdNumber)
          .maybeSingle<ScheduleRow>();

        if (scheduleError && scheduleError.code !== 'PGRST116') {
          console.warn('Error loading schedule data:', scheduleError);
        }

        const rankings = new Map<string, number>();
        const tiers = data?.schedule_data?.tiers ?? [];

        tiers.forEach(tier => {
          if (!tier?.teams) return;
          Object.values(tier.teams).forEach(team => {
            if (team?.name && typeof team.ranking === 'number') {
              rankings.set(team.name, team.ranking);
            }
          });
        });

        return {
          rankings,
          scheduleExists: Boolean(tiers && tiers.length > 0),
        };
      };

      const { rankings: teamRankings, scheduleExists } = await getScheduleRankings();
      setHasSchedule(scheduleExists);

      type StandingsJoinRow = {
        id: number;
        team_id: number;
        wins: number | null;
        losses: number | null;
        points: number | null;
        point_differential: number | null;
        manual_wins_adjustment: number | null;
        manual_losses_adjustment: number | null;
        manual_points_adjustment: number | null;
        manual_differential_adjustment: number | null;
        current_position: number | null;
        teams: {
          id: number;
          name: string;
          roster: string[] | null;
          created_at: string;
          active: boolean;
        };
      };

      const { data: standingsData, error: standingsError } = await supabase
        .from<StandingsJoinRow>('standings')
        .select(
          `id,
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
           teams!inner(id, name, roster, created_at, active)`
        )
        .eq('league_id', leagueIdNumber)
        .eq('teams.active', true)
        .order('current_position', { ascending: true, nullsFirst: false });

      if (standingsError) throw standingsError;

      if (standingsData && standingsData.length > 0) {
        const formattedStandings: StandingsTeam[] = standingsData.map(standing => ({
          id: standing.teams.id,
          name: standing.teams.name,
          roster_size: standing.teams.roster?.length ?? 0,
          wins: (standing.wins ?? 0) + (standing.manual_wins_adjustment ?? 0),
          losses: (standing.losses ?? 0) + (standing.manual_losses_adjustment ?? 0),
          points: (standing.points ?? 0) + (standing.manual_points_adjustment ?? 0),
          differential:
            (standing.point_differential ?? 0) + (standing.manual_differential_adjustment ?? 0),
          created_at: standing.teams.created_at,
          schedule_ranking: teamRankings.get(standing.teams.name),
        }));

        setTeams(formattedStandings);
        return;
      }

      type TeamRow = {
        id: number;
        name: string;
        roster: string[] | null;
        created_at: string;
      };

      const { data: teamsData, error: teamsError } = await supabase
        .from<TeamRow>('teams')
        .select('id, name, roster, created_at')
        .eq('league_id', leagueIdNumber)
        .eq('active', true);

      if (teamsError) throw teamsError;

      const fallbackStandings: StandingsTeam[] = (teamsData ?? []).map(team => ({
        id: team.id,
        name: team.name,
        roster_size: team.roster?.length ?? 0,
        wins: 0,
        losses: 0,
        points: 0,
        differential: 0,
        created_at: team.created_at,
        schedule_ranking: teamRankings.get(team.name),
      }));

      const sortedFallback = [...fallbackStandings].sort((a, b) => {
        const hasRankA = typeof a.schedule_ranking === 'number';
        const hasRankB = typeof b.schedule_ranking === 'number';

        if (hasRankA && hasRankB) {
          return (a.schedule_ranking as number) - (b.schedule_ranking as number);
        }
        if (hasRankA && !hasRankB) {
          return -1;
        }
        if (!hasRankA && hasRankB) {
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

  // Live updates: refetch when standings change or window gains focus
  useEffect(() => {
    if (!leagueId) return;

    // Re-fetch on window focus (e.g., after admin saves in another tab/view)
    const onFocus = () => loadTeams();
    window.addEventListener('focus', onFocus);

    // Subscribe to Postgres changes for this league's standings
    const channel = supabase
      .channel(`standings-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'standings',
          filter: `league_id=eq.${parseInt(leagueId)}`,
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  return {
    teams,
    loading,
    error,
    hasSchedule,
    refetch: loadTeams,
  };
}
