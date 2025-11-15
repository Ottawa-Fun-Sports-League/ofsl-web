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
          .maybeSingle();

        if (scheduleError && scheduleError.code !== 'PGRST116') {
          console.warn('Error loading schedule data:', scheduleError);
        }

        const rankings = new Map<string, number>();
        const scheduleRow = (data as ScheduleRow | null);
        const tiers = scheduleRow?.schedule_data?.tiers ?? [];

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

      // Fallback initial seed rankings from Week 1 (elite pairing aware)
      let seedRankingFallback: Map<string, number> = new Map();
      try {
        const { data: week1Rows } = await supabase
          .from('weekly_schedules')
          .select('tier_number,format,team_a_name,team_b_name,team_c_name')
          .eq('league_id', leagueIdNumber)
          .eq('week_number', 1)
          .order('tier_number', { ascending: true });
        // Import locally to avoid extra top-level import churn
        const { computeInitialSeedRankingMap } = await import('../../LeagueSchedulePage/utils/rankingUtils');
        seedRankingFallback = computeInitialSeedRankingMap((week1Rows || []) as any);
      } catch {
        seedRankingFallback = new Map();
      }

      // Always include all active teams; merge with standings rows if present
      type TeamRow = {
        id: number;
        name: string;
        roster: string[] | null;
        created_at: string;
      };

      const { data: teamsDataRaw, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, roster, created_at')
        .eq('league_id', leagueIdNumber)
        .eq('active', true);
      const teamsData = (teamsDataRaw ?? []) as TeamRow[];
      if (teamsError) throw teamsError;

      // Fetch standings rows for these teams (if table exists)
      let standingsRows: Array<{
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
      }> = [];
      try {
        const teamIds = teamsData.map(t => t.id);
        if (teamIds.length > 0) {
          const { data: sData, error: sErr } = await supabase
            .from('standings')
            .select('id, team_id, wins, losses, points, point_differential, manual_wins_adjustment, manual_losses_adjustment, manual_points_adjustment, manual_differential_adjustment, current_position')
            .eq('league_id', leagueIdNumber)
            .in('team_id', teamIds);
          if (sErr && (sErr as any).code !== '42P01') throw sErr;
          standingsRows = sData || [];
        }
      } catch (_) {
        // Standings table may not exist; proceed with zeroed stats
      }

      const byTeamId = new Map(standingsRows.map(s => [s.team_id, s] as const));
      const posByTeamId = new Map<number, number | null>(standingsRows.map(s => [s.team_id, s.current_position ?? null] as const));

      const merged: StandingsTeam[] = teamsData.map(team => {
        const s = byTeamId.get(team.id);
        const wins = (s?.wins ?? 0) + (s?.manual_wins_adjustment ?? 0);
        const losses = (s?.losses ?? 0) + (s?.manual_losses_adjustment ?? 0);
        const points = (s?.points ?? 0) + (s?.manual_points_adjustment ?? 0);
        const diff = (s?.point_differential ?? 0) + (s?.manual_differential_adjustment ?? 0);
        return {
          id: team.id,
          name: team.name,
          roster_size: team.roster?.length ?? 0,
          wins,
          losses,
          points,
          differential: diff,
          created_at: team.created_at,
          schedule_ranking: teamRankings.get(team.name) ?? seedRankingFallback.get(team.name),
        };
      });

      // Sort: teams with current_position first by that, then by schedule_ranking, then by created_at
      const sorted = [...merged].sort((a, b) => {
        const aPos = posByTeamId.get(a.id);
        const bPos = posByTeamId.get(b.id);
        const aHasPos = typeof aPos === 'number' && (aPos as number) > 0;
        const bHasPos = typeof bPos === 'number' && (bPos as number) > 0;
        if (aHasPos && bHasPos) return (aPos as number) - (bPos as number);
        if (aHasPos && !bHasPos) return -1;
        if (!aHasPos && bHasPos) return 1;

        const hasRankA = typeof a.schedule_ranking === 'number';
        const hasRankB = typeof b.schedule_ranking === 'number';
        if (hasRankA && hasRankB) return (a.schedule_ranking as number) - (b.schedule_ranking as number);
        if (hasRankA && !hasRankB) return -1;
        if (!hasRankA && hasRankB) return 1;

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setTeams(sorted);
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
