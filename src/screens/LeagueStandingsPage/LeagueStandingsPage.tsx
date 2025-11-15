import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ArrowLeft, DollarSign, Save, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEliteStandings } from '../../standings/useEliteStandings';
import { computeEliteWeeklyRanks } from '../../standings/eliteStandings';
import { getLeagueUnitLabel } from '../../components/leagues/LeagueCard';

interface League {
  id: number;
  name: string;
  sport_name: string;
  location: string;
  cost: number;
  team_registration?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  playoff_weeks?: number | null;
}

interface StandingRow {
  id: number;
  team_id: number;
  team_name: string;
  roster_size: number;
  wins: number;
  losses: number;
  points: number;
  point_differential: number;
  manual_wins_adjustment: number;
  manual_losses_adjustment: number;
  manual_points_adjustment: number;
  manual_differential_adjustment: number;
  created_at: string;
  schedule_ranking?: number;
}

function extractTeamRankings(scheduleRecord: {schedule_data?: {tiers?: Array<{teams?: Record<string, {name: string; ranking: number} | null>}>}} | null): Map<string, number> {
  const teamRankings = new Map<string, number>();
  if (scheduleRecord?.schedule_data?.tiers) {
    scheduleRecord.schedule_data.tiers.forEach((tier: {teams?: Record<string, {name: string; ranking: number} | null>}) => {
      if (tier.teams) {
        Object.values(tier.teams).forEach((team: {name: string; ranking: number} | null) => {
          if (team && team.name && team.ranking) {
            teamRankings.set(team.name, team.ranking);
          }
        });
      }
    });
  }
  return teamRankings;
}

const calculateRegularSeasonWeeks = (startDate?: string | null, endDate?: string | null, playoffWeeks?: number | null): number => {
  if (!startDate || !endDate) {
    return 12;
  }

  const start = new Date((startDate as string) + 'T00:00:00');
  const end = new Date((endDate as string) + 'T00:00:00');
  const diffTime = Math.abs(end.getTime() - start.getTime());
  // Inclusive: include the start week when end lands on a later matching week
  const weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1 + (Number(playoffWeeks ?? 0) || 0);

  return Math.max(1, weeks);
};

export function LeagueStandingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const formatDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [editedStandings, setEditedStandings] = useState<{ [key: string]: StandingRow }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isWeek3Completed, setIsWeek3Completed] = useState(false);
  const [scheduleFormat, setScheduleFormat] = useState<string | null>(null);
  const [regularSeasonWeeks, setRegularSeasonWeeks] = useState<number>(0);
  const [standingsResetWeek, setStandingsResetWeek] = useState<number>(1);
  const [noGameWeeks, setNoGameWeeks] = useState<Set<number>>(new Set());
  const [movementWeeks, setMovementWeeks] = useState<Set<number>>(new Set());
  const [playoffWeeks, setPlayoffWeeks] = useState<Set<number>>(new Set());

  const isEliteFormat = (scheduleFormat ?? '').includes('elite');
  // Regular formats only: visual separator between tiers
  const [topTierLineEnabled, setTopTierLineEnabled] = useState(false);
  const [topTierLineAfter, setTopTierLineAfter] = useState<number>(0);
  const [weeklyRanks, setWeeklyRanks] = useState<Record<number, Record<number, number>>>({});
  // Edits: team_id -> { weekNumber -> rank }
  const [editedWeeklyRanks, setEditedWeeklyRanks] = useState<Record<number, Record<number, number | null>>>({});
  const [seedRanks, setSeedRanks] = useState<Record<number, number>>({});
  const weeklyColumns = Array.from({ length: Math.max(regularSeasonWeeks, 0) }, (_, i) => i + 1);

  // Horizontal scroll sync (elite table)
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const syncScroll = (from: 'top' | 'bot') => {
    const a = from === 'top' ? topScrollRef.current : bottomScrollRef.current;
    const b = from === 'top' ? bottomScrollRef.current : topScrollRef.current;
    if (a && b && Math.abs(b.scrollLeft - a.scrollLeft) > 1) b.scrollLeft = a.scrollLeft;
  };

  // Check if user is admin
  const isAdmin = userProfile?.is_admin === true;

  // Shared elite standings
  const elite = useEliteStandings(leagueId ? parseInt(leagueId) : undefined);
  useEffect(() => {
    if (elite.isElite) {
      setScheduleFormat('elite');
      setWeeklyRanks(elite.weeklyRanksByTeamId);
      setSeedRanks(elite.seedRanksByTeamId);
      setRegularSeasonWeeks(prev => Math.max(prev, elite.maxWeek));
    }
  }, [elite.isElite, elite.weeklyRanksByTeamId, elite.seedRanksByTeamId, elite.maxWeek]);

  // Page-level weekly backfill using results (safety net so weekly columns fill immediately)
  useEffect(() => {
    const run = async () => {
      if (!leagueId) return;
      if (!elite.isElite) return;
      const lid = parseInt(leagueId);
      try {
        const { data: weekRows } = await supabase
          .from('weekly_schedules')
          .select('id, week_number, tier_number, format')
          .eq('league_id', lid);
        const { data: results } = await supabase
          .from('game_results')
          .select('team_name, week_number, tier_number, tier_position')
          .eq('league_id', lid);
        const { data: teams } = await supabase
          .from('teams')
          .select('id,name')
          .eq('league_id', lid)
          .eq('active', true);

        if (!Array.isArray(results) || results.length === 0) return;
        const { computeWeeklyNameRanksFromResults, computePrevWeekNameRanksFromNextWeekSchedule } = await import('../LeagueSchedulePage/utils/rankingUtils');
        // First, try placement-based ranks from next week's schedule (authoritative when present)
        const weeks = Array.from(new Set((weekRows || []).map((r: any) => r.week_number))).sort((a:number,b:number)=>a-b);
        const nameToId = new Map<string, number>();
        (teams || []).forEach((t: any) => nameToId.set(String((t as any).name || '').toLowerCase(), (t as any).id));
        setWeeklyRanks((prev) => {
          const merged: Record<number, Record<number, number>> = { ...(prev || {}) };
          for (const w of weeks) {
            const prevWeek = (w || 0) - 1; if (prevWeek < 1) continue;
            const rows = (weekRows || []).filter((r: any) => r.week_number === w);
            const nameRankMap = computePrevWeekNameRanksFromNextWeekSchedule(rows as any);
            Object.entries(nameRankMap).forEach(([nm, rk]) => {
              const id = nameToId.get(String(nm || '').toLowerCase());
              if (!id) return;
              if (!merged[id]) merged[id] = {} as Record<number, number>;
              // Overwrite per-team with placement-based number (authoritative)
              merged[id][prevWeek] = rk as number;
            });
          }
          return merged;
        });
        // Then, backfill any remaining teams from results
        const nameRanksByWeek = computeWeeklyNameRanksFromResults(
          (weekRows || []).map((r: any) => ({ id: r.id ?? null, week_number: r.week_number, tier_number: r.tier_number, format: r.format })) as any,
          (results as any),
        );
        
        setWeeklyRanks((prev) => {
          const merged: Record<number, Record<number, number>> = { ...(prev || {}) };
          Object.keys(nameRanksByWeek || {}).map(Number).forEach((w) => {
            const nmMap = (nameRanksByWeek as any)[w] || {};
            Object.entries(nmMap).forEach(([nm, rk]) => {
              const id = nameToId.get(String(nm || '').toLowerCase());
              if (!id) return;
              if (!merged[id]) merged[id] = {} as Record<number, number>;
              // Only set if this team has no rank for week w yet (preserve placement-based values)
              if (typeof merged[id][w] !== 'number') {
                merged[id][w] = rk as number;
              }
            });
          });
          return merged;
        });
      } catch {
        // swallow — this is a non-blocking backfill
      }
    };
    run();
  // Re-run when league or elite mode toggles; avoid weeklyRanks to prevent loops
  }, [leagueId, elite.isElite]);

  // Load weeks that are marked as no-games, movement-week, and playoffs (elite formats only) to style columns in standings
  useEffect(() => {
    const run = async () => {
      if (!leagueId) return;
      if (!elite.isElite) return;
      const lid = parseInt(leagueId);
      try {
        const [{ data }, { data: leagueRow }] = await Promise.all([
          supabase
            .from('weekly_schedules')
            .select('week_number, no_games, movement_week, is_playoff')
            .eq('league_id', lid),
          supabase
            .from('leagues')
            .select('start_date,end_date,playoff_weeks')
            .eq('id', lid)
            .maybeSingle(),
        ]);
        const weeks = new Map<number, { total: number; noGames: number; anyMovement: boolean; anyPlayoff: boolean }>();
        (data || []).forEach((row: any) => {
          const w = Number(row.week_number || 0);
          if (!weeks.has(w)) weeks.set(w, { total: 0, noGames: 0, anyMovement: false, anyPlayoff: false });
          const agg = weeks.get(w)!;
          agg.total += 1;
          if (row.no_games) agg.noGames += 1;
          if (row.movement_week) agg.anyMovement = true;
          if (row.is_playoff) agg.anyPlayoff = true;
        });
        const noSet = new Set<number>();
        const mvSet = new Set<number>();
        const poSetFromDb = new Set<number>();
        weeks.forEach((agg, w) => {
          if (agg.total > 0 && agg.noGames === agg.total) noSet.add(w);
          if (agg.anyMovement) mvSet.add(w);
          if (agg.anyPlayoff) poSetFromDb.add(w);
        });
        // Compute playoff range from dates and union with DB flags (only weeks after regular season)
        const poSet = new Set<number>();
        try {
          const startS = (leagueRow as any)?.start_date as string | undefined;
          const endS = (leagueRow as any)?.end_date as string | undefined;
          const pWeeks = Number((leagueRow as any)?.playoff_weeks ?? 0) || 0;
          if (startS && endS && pWeeks > 0) {
            const start = new Date(startS + 'T00:00:00');
            const end = new Date(endS + 'T00:00:00');
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const inclusiveWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
            const startWeek = inclusiveWeeks + 1;
            const endWeek = inclusiveWeeks + pWeeks;
            for (let w = startWeek; w <= endWeek; w++) poSet.add(w);
            poSetFromDb.forEach((w) => { if (w >= startWeek) poSet.add(w); });
          }
        } catch {}
        setNoGameWeeks(noSet);
        setMovementWeeks(mvSet);
        setPlayoffWeeks(poSet);
      } catch {
        setNoGameWeeks(new Set());
        setMovementWeeks(new Set());
        setPlayoffWeeks(new Set());
      }
    };
    run();
  }, [leagueId, elite.isElite]);

  // TEMP: visibility that the page mounted
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[Admin Standings] mounted with leagueId=', leagueId);
  }, [leagueId]);

  // Fallback seed ranks for admin (ensures initial ranking shows even if hook hasn't populated yet)
  useEffect(() => {
    if (!leagueId) return;
    // if seed already set by hook, skip
    if (seedRanks && Object.keys(seedRanks).length > 0) return;
    (async () => {
      try {
        const lid = parseInt(leagueId);
        // eslint-disable-next-line no-console
        console.info('[Admin Standings] fallback seeding start for league', lid);
        const { data: week1Rows } = await supabase
          .from('weekly_schedules')
          .select('tier_number,format,team_a_name,team_b_name,team_c_name')
          .eq('league_id', lid)
          .eq('week_number', 1)
          .order('tier_number', { ascending: true });

        const { data: allWeeks } = await supabase
          .from('weekly_schedules')
          .select('week_number')
          .eq('league_id', lid);

        const { data: teamRows } = await supabase
          .from('teams')
          .select('id,name')
          .eq('league_id', lid)
          .eq('active', true);

        const { computeInitialSeedRankingMap } = await import('../LeagueSchedulePage/utils/rankingUtils');
        const seedMap = computeInitialSeedRankingMap((week1Rows || []) as any);
        const nameToId = new Map<string, number>();
        (teamRows || []).forEach((t: any) => nameToId.set(String((t as any).name || '').toLowerCase(), (t as any).id));
        const seed: Record<number, number> = {};
        for (const [nm, rk] of seedMap.entries()) {
          const id = nameToId.get(String(nm || '').toLowerCase());
          if (id) seed[id] = rk as number;
        }
        setSeedRanks(seed);

        const elitePresent = Array.isArray(week1Rows) && week1Rows.some((r: any) => String((r as any).format || '').toLowerCase().includes('elite'));
        if (elitePresent && !String(scheduleFormat || '').toLowerCase().includes('elite')) {
          setScheduleFormat('elite');
        }

        const maxWeek = Array.isArray(allWeeks) && allWeeks.length > 0
          ? (allWeeks as any[]).reduce((m, r: any) => Math.max(m, Number((r as any).week_number || 0)), 0)
          : regularSeasonWeeks;
        setRegularSeasonWeeks(prev => Math.max(prev, maxWeek));

        // eslint-disable-next-line no-console
        console.info('[Admin Standings] fallback seed set:', Object.keys(seed).length, 'maxWeek:', maxWeek);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Admin Standings] fallback seeding failed', e);
      }
    })();
  // Intentionally ignore seedRanks in deps to avoid loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  useEffect(() => {

    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    if (leagueId) {
      const initialize = async () => {
        const leagueInfo = await loadLeagueData();
        await loadStandings(leagueInfo ?? null);
        await checkWeek3Completion();
        try {
          const lid = parseInt(leagueId);
          const { data: sched } = await supabase
            .from('league_schedules')
            .select('schedule_data')
            .eq('league_id', lid)
            .maybeSingle();
          const sd = (sched as any)?.schedule_data || {};
          const reset = Number(sd?.standings_reset_week ?? 1);
          if (Number.isFinite(reset) && reset >= 1) setStandingsResetWeek(reset);
          // Load Top Tier Line settings (non-elite only)
          const enabled = Boolean(sd?.standings_top_tier_line_enabled);
          const cutoff = Number(sd?.standings_top_tier_line_after ?? 0);
          setTopTierLineEnabled(enabled);
          if (Number.isFinite(cutoff) && cutoff > 0) setTopTierLineAfter(cutoff);
        } catch {}
      };
      void initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, isAdmin]);

  const loadLeagueData = async (): Promise<League | null> => {
    if (!leagueId) return null;

    try {
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          location,
          cost,
          team_registration,
          start_date,
          end_date,
          playoff_weeks,
          sports:sport_id(name)
        `)
        .eq('id', parseInt(leagueId))
        .single();

      if (error) throw error;

      const leagueInfo: League = {
        id: data.id,
        name: data.name,
        sport_name: data.sports && Array.isArray(data.sports) && data.sports.length > 0 
          ? data.sports[0].name 
          : (data.sports && typeof data.sports === 'object' && 'name' in data.sports 
            ? (data.sports as { name: string }).name 
            : ''),
        location: data.location || '',
        cost: data.cost || 0,
        team_registration: data.team_registration,
        start_date: data.start_date,
        end_date: data.end_date,
        playoff_weeks: (data as any)?.playoff_weeks ?? 0
      };
      setLeague(leagueInfo);
      return leagueInfo;

    } catch (error) {
      console.error('Error loading league data:', error);
    }
    return null;
  };

  const loadStandings = async (leagueOverride?: League | null) => {
    if (!leagueId) return null;
    const baseLeague = leagueOverride ?? league;
    
    setLoading(true);
    try {
      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          roster,
          created_at
        `)
        .eq('league_id', parseInt(leagueId))
        .eq('active', true);

      if (teamsError) throw teamsError;

      const { data: scheduleRecord, error: scheduleError } = await supabase
        .from('league_schedules')
        .select('schedule_data, format')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        console.warn('Error loading schedule data:', scheduleError);
      }

      setScheduleFormat(scheduleRecord?.format ?? null);

      // Prefer actual generated weeks from weekly_schedules; but ensure we include end date week
      try {
        const { data: weekRows, error: weeksErr } = await supabase
          .from('weekly_schedules')
          .select('week_number')
          .eq('league_id', parseInt(leagueId));

        if (!weeksErr && Array.isArray(weekRows) && weekRows.length > 0) {
          const maxWeek = weekRows.reduce((max, r: any) => Math.max(max, r.week_number || 0), 0);
          const weeksFromDates = calculateRegularSeasonWeeks(baseLeague?.start_date ?? null, baseLeague?.end_date ?? null, baseLeague?.playoff_weeks ?? 0);
          setRegularSeasonWeeks(Math.max(maxWeek, weeksFromDates));
        } else {
          const weeks = calculateRegularSeasonWeeks(baseLeague?.start_date ?? null, baseLeague?.end_date ?? null, baseLeague?.playoff_weeks ?? 0);
          setRegularSeasonWeeks(weeks);
        }
      } catch {
        const weeks = calculateRegularSeasonWeeks(baseLeague?.start_date ?? null, baseLeague?.end_date ?? null, baseLeague?.playoff_weeks ?? 0);
        setRegularSeasonWeeks(weeks);
      }

      const teamRankings = extractTeamRankings(scheduleRecord);

      // Fallback seed rankings from Week 1 using AB-pair logic (for initial order)
      let seedRankingFallback: Map<string, number> = new Map();
      try {
        const { data: week1Rows } = await supabase
          .from('weekly_schedules')
          .select('tier_number,format,team_a_name,team_b_name,team_c_name')
          .eq('league_id', parseInt(leagueId))
          .eq('week_number', 1)
          .order('tier_number', { ascending: true });
        const { computeInitialSeedRankingMap } = await import('../LeagueSchedulePage/utils/rankingUtils');
        seedRankingFallback = computeInitialSeedRankingMap((week1Rows || []) as any);
      } catch {
        seedRankingFallback = new Map();
      }

      let standingsData = null;
      try {
        const { data, error: standingsError } = await supabase
          .from('standings')
          .select('*')
          .eq('league_id', parseInt(leagueId));

        if (standingsError) {
          if (standingsError.code === '42P01') {
            // Table doesn't exist - this is OK, we'll just use default values
          } else {
            console.warn('Error loading standings data:', standingsError);
          }
        } else {
          standingsData = data;
        }
      } catch (err) {
        // Could not access standings table, using defaults
      }

      const standingsMap = new Map();
      (standingsData || []).forEach(standing => {
        standingsMap.set(standing.team_id, standing);
      });

      const formattedStandings = (teamsData || []).map(team => {
        const standing = standingsMap.get(team.id);
        return {
          id: standing?.id || 0,
          team_id: team.id,
          team_name: team.name,
          roster_size: team.roster?.length || 0,
          wins: standing?.wins || 0,
          losses: standing?.losses || 0,
          points: standing?.points || 0,
          point_differential: standing?.point_differential || 0,
          manual_wins_adjustment: standing?.manual_wins_adjustment || 0,
          manual_losses_adjustment: standing?.manual_losses_adjustment || 0,
          manual_points_adjustment: standing?.manual_points_adjustment || 0,
          manual_differential_adjustment: standing?.manual_differential_adjustment || 0,
          created_at: team.created_at,
          schedule_ranking: teamRankings.get(team.name) ?? seedRankingFallback.get(team.name)
        };
      });

      const hasValidPositions = standingsData && standingsData.length > 0 && 
        standingsData.some(s => s.current_position && s.current_position > 0);

      const sortedStandings = hasValidPositions 
        ? formattedStandings.sort((a, b) => {
            const aStanding = standingsMap.get(a.team_id);
            const bStanding = standingsMap.get(b.team_id);
            return (aStanding?.current_position || 999) - (bStanding?.current_position || 999);
          })
        : formattedStandings.sort((a, b) => {
            if (a.schedule_ranking && b.schedule_ranking) {
              return a.schedule_ranking - b.schedule_ranking;
            }
            if (a.schedule_ranking && !b.schedule_ranking) return -1;
            if (!a.schedule_ranking && b.schedule_ranking) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });

      setStandings(sortedStandings);
  
  // Build weekly ranks using next-week placements first; fill gaps from current-week results
  try {
    const { data: weekRows } = await supabase
      .from('weekly_schedules')
      .select('id,week_number,tier_number,format,team_a_name,team_b_name,team_c_name,team_d_name,team_e_name,team_f_name,team_a_ranking,team_b_ranking,team_c_ranking,team_d_ranking,team_e_ranking,team_f_ranking')
      .eq('league_id', parseInt(leagueId!))
      .order('week_number', { ascending: true })
      .order('tier_number', { ascending: true });
    try {
      const elitePresent = Array.isArray(weekRows) && weekRows.some((r: any) => String((r as any).format || '').toLowerCase().includes('elite'));
      if (elitePresent && !(String(scheduleFormat || '').toLowerCase().includes('elite'))) {
        setScheduleFormat('elite');
      }
    } catch {}
    const { data: teamRows } = await supabase
      .from('teams')
      .select('id,name')
      .eq('league_id', parseInt(leagueId!))
      .eq('active', true);
    const nameToId = new Map<string, number>();
    (teamRows || []).forEach((t: any) => nameToId.set(((t as any).name || '').toLowerCase(), (t as any).id));

    // Temporary shape: week -> (team_id -> rank)
    const byWeek: Record<number, Record<number, number>> = {};
    const allWeeks = Array.from(new Set((weekRows || []).map((r: any) => r.week_number))).sort((a: number,b: number)=>a-b);
    const { computePrevWeekNameRanksFromNextWeekSchedule } = await import('../LeagueSchedulePage/utils/rankingUtils');
    for (const w of allWeeks) {
      const prevWeek = (w || 0) - 1;
      if (prevWeek < 1) continue;
      const rows = (weekRows || []).filter((r: any) => r.week_number === w);
      const nameRankMap = computePrevWeekNameRanksFromNextWeekSchedule(rows as any);
      const idMap: Record<number, number> = {};
      Object.entries(nameRankMap).forEach(([nm, rk]) => {
        const id = nameToId.get((nm || '').toLowerCase());
        if (id) idMap[id] = rk as number;
      });
      if (Object.keys(idMap).length > 0) byWeek[prevWeek] = idMap;
    }

    // Fill gaps with results-based ranks
    const { data: resultRows } = await supabase
      .from('game_results')
      .select('team_name, week_number, tier_number, tier_position')
      .eq('league_id', parseInt(leagueId!));
    const { computeWeeklyNameRanksFromResults } = await import('../LeagueSchedulePage/utils/rankingUtils');
    const nameRanksByWeek = computeWeeklyNameRanksFromResults(
      (weekRows || []).map((r: any) => ({ id: r.id ?? null, week_number: r.week_number, tier_number: r.tier_number, format: r.format })),
      (resultRows || []) as any,
    );
    for (const w of Object.keys(nameRanksByWeek).map(Number)) {
      const nameMap = nameRanksByWeek[w] || {};
      const idMap: Record<number, number> = {};
      Object.entries(nameMap).forEach(([nm, rk]) => {
        const id = nameToId.get((nm || '').toLowerCase());
        if (id) idMap[id] = rk as number;
      });
      if (!byWeek[w]) {
        byWeek[w] = idMap;
      }
    }
    // Transpose: we need team_id -> (week -> rank) for rendering
    const byTeam: Record<number, Record<number, number>> = {};
    Object.entries(byWeek).forEach(([weekStr, teamMap]) => {
      const weekNum = Number(weekStr);
      Object.entries(teamMap).forEach(([teamIdStr, rank]) => {
        const teamId = Number(teamIdStr);
        if (!byTeam[teamId]) byTeam[teamId] = {};
        byTeam[teamId][weekNum] = rank as number;
      });
    });
    try {
      const weeksWithData = Object.entries(byWeek)
        .filter(([_, m]) => m && Object.keys(m as any).length > 0)
        .map(([w]) => Number(w))
        .sort((a,b)=>a-b);
      // eslint-disable-next-line no-console
      console.info('[Standings] weekly rank weeks:', weeksWithData);
    } catch {}
    setWeeklyRanks(byTeam);
    // Override with shared elite standings engine to ensure slot-reserved, deterministic ranks
    try {
      const { data: weekRowsAll } = await supabase
        .from('weekly_schedules')
        .select('id,week_number,tier_number,format,no_games,team_a_name,team_b_name,team_c_name,team_d_name,team_e_name,team_f_name,team_a_ranking,team_b_ranking,team_c_ranking,team_d_ranking,team_e_ranking,team_f_ranking')
        .eq('league_id', parseInt(leagueId!))
        .order('week_number', { ascending: true })
        .order('tier_number', { ascending: true });
      const { data: teamsAll } = await supabase
        .from('teams')
        .select('id,name')
        .eq('league_id', parseInt(leagueId!))
        .eq('active', true);
      const { seedRanksByTeamId, weeklyRanksByTeamId, maxWeek } = computeEliteWeeklyRanks((weekRowsAll || []) as any, (teamsAll || []) as any);
      setWeeklyRanks(weeklyRanksByTeamId);
      setSeedRanks(seedRanksByTeamId);
      setRegularSeasonWeeks((prev) => Math.max(prev, maxWeek));
      // Force elite table view if elite data is present
      try {
        const elitePresent = Array.isArray(weekRowsAll) && weekRowsAll.some((r: any) => String((r as any).format || '').toLowerCase().includes('elite'));
        if (elitePresent && !String(scheduleFormat || '').toLowerCase().includes('elite')) {
          setScheduleFormat('elite');
        }
      } catch { /* ignore */ }
    } catch {}
        // Compute seed ranks from Week 1 schedule for elite formats (with AB-pair logic)
        try {
          const { data: week1Rows } = await supabase
            .from('weekly_schedules')
            .select('tier_number,format,team_a_name,team_b_name,team_c_name')
            .eq('league_id', parseInt(leagueId!))
            .eq('week_number', 1)
            .order('tier_number', { ascending: true });
          const { computeInitialSeedRankingMap } = await import('../LeagueSchedulePage/utils/rankingUtils');
          const seedMap = computeInitialSeedRankingMap((week1Rows || []) as any);
          const seed: Record<number, number> = {};
          for (const [nm, rk] of seedMap.entries()) {
            const id = nameToId.get((nm || '').toLowerCase());
            if (id) seed[id] = rk;
          }
          setSeedRanks(seed);
        } catch {}
      } catch {}
      setEditedStandings({});
      setEditedWeeklyRanks({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (standing: StandingRow, field: string, value: string) => {
    const numValue = value === '' || value === '-' ? 0 : parseInt(value) || 0;

    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();

    const existingEdits = editedStandings[editKey] || standing;
    const updatedStanding = {
      ...existingEdits,
      [field]: numValue
    };

    const newEditedStandings = {
      ...editedStandings,
      [editKey]: updatedStanding
    };

    setEditedStandings(newEditedStandings);
    setHasChanges(true);
  };

  const getDisplayValue = (standing: StandingRow, field: keyof StandingRow) => {
    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
    if (editedStandings[editKey]) {
      return editedStandings[editKey][field];
    }
    return standing[field];
  };

  const getTotalValue = (standing: StandingRow, baseField: string, adjustmentField: string) => {
    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
    const edited = editedStandings[editKey];
    const base = edited ? edited[baseField as keyof StandingRow] as number : standing[baseField as keyof StandingRow] as number;
    const adjustment = edited ? edited[adjustmentField as keyof StandingRow] as number : standing[adjustmentField as keyof StandingRow] as number;
    
    return (base || 0) + (adjustment || 0);
  };

  const checkWeek3Completion = async () => {
    if (!leagueId) return null;

    try {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('is_completed')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', 3);

      if (error) {
        console.warn('Error checking week 3 completion:', error);
        return;
      }

      const week3Completed = data && data.length > 0 && data.some(tier => tier.is_completed);
      setIsWeek3Completed(week3Completed);
    } catch (error) {
      console.warn('Error checking week 3 completion:', error);
    }
  };

  const handleEnterEditMode = () => setIsEditMode(true);
  
  const handleExitEditMode = () => {
    setIsEditMode(false);
    setEditedStandings({});
    setEditedWeeklyRanks({});
    setHasChanges(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1) Save non-elite numeric adjustments (wins/losses/points/etc.)
      for (const [editKey, standing] of Object.entries(editedStandings)) {
        try {
          if (editKey.startsWith('team_')) {
            const { error } = await supabase
              .from('standings')
              .insert({
                league_id: parseInt(leagueId!),
                team_id: standing.team_id,
                wins: standing.wins,
                losses: standing.losses,
                points: standing.points,
                point_differential: standing.point_differential,
                manual_wins_adjustment: standing.manual_wins_adjustment,
                manual_losses_adjustment: standing.manual_losses_adjustment,
                manual_points_adjustment: standing.manual_points_adjustment,
                manual_differential_adjustment: standing.manual_differential_adjustment,
              });

            if (error) {
              if (error.code === '42P01') {
                alert('Standings table does not exist. Please apply the database migration first.');
                return;
              }
              throw error;
            }
          } else {
            const standingId = parseInt(editKey);
            const { error } = await supabase
              .from('standings')
              .update({
                wins: standing.wins,
                losses: standing.losses,
                points: standing.points,
                point_differential: standing.point_differential,
                manual_wins_adjustment: standing.manual_wins_adjustment,
                manual_losses_adjustment: standing.manual_losses_adjustment,
                manual_points_adjustment: standing.manual_points_adjustment,
                manual_differential_adjustment: standing.manual_differential_adjustment,
              })
              .eq('id', standingId);

            if (error) throw error;
          }
        } catch (err) {
          console.error('Error saving individual standing:', err);
          throw err;
        }
      }

      // 2) Save elite weekly rank overrides by writing to next week's schedule ranking fields
      if (isEliteFormat) {
        try {
          const leagueIdNum = parseInt(leagueId!);
          const teamIdToName = new Map<number, string>();
          standings.forEach(s => teamIdToName.set(s.team_id, s.team_name));
          for (const [teamIdStr, weeksMap] of Object.entries(editedWeeklyRanks)) {
            const teamId = Number(teamIdStr);
            const teamName = teamIdToName.get(teamId);
            if (!teamName) continue;
            for (const [weekStr, rankVal] of Object.entries(weeksMap)) {
              const weekNum = Number(weekStr);
              if (rankVal == null) continue;
              const targetWeek = weekNum + 1; // overrides live on next week's schedule
              // Fetch possible rows for the target week where this team appears
              const { data: rows } = await supabase
                .from('weekly_schedules')
                .select('id, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
                .eq('league_id', leagueIdNum)
                .eq('week_number', targetWeek);
              const match = (rows || []).find((r: any) => {
                return ['team_a_name','team_b_name','team_c_name','team_d_name','team_e_name','team_f_name'].some((col) => {
                  const nm = (r as any)[col] as string | null;
                  return nm && nm.toLowerCase() === teamName.toLowerCase();
                });
              });
                if (!match) continue;
                let rkCol: string | null = null;
              if ((match as any).team_a_name && String((match as any).team_a_name).toLowerCase() === teamName.toLowerCase()) rkCol = 'team_a_ranking';
              else if ((match as any).team_b_name && String((match as any).team_b_name).toLowerCase() === teamName.toLowerCase()) rkCol = 'team_b_ranking';
              else if ((match as any).team_c_name && String((match as any).team_c_name).toLowerCase() === teamName.toLowerCase()) rkCol = 'team_c_ranking';
              else if ((match as any).team_d_name && String((match as any).team_d_name).toLowerCase() === teamName.toLowerCase()) rkCol = 'team_d_ranking';
              else if ((match as any).team_e_name && String((match as any).team_e_name).toLowerCase() === teamName.toLowerCase()) rkCol = 'team_e_ranking';
              else if ((match as any).team_f_name && String((match as any).team_f_name).toLowerCase() === teamName.toLowerCase()) rkCol = 'team_f_ranking';
              if (!rkCol) continue;
                const updates: Record<string, any> = {};
                // 0 means clear override (null), positive values persist as override
                updates[rkCol] = (rankVal === 0) ? null : rankVal;
                await supabase
                  .from('weekly_schedules')
                  .update({ ...updates })
                  .eq('id', (match as any).id);
            }
          }
        } catch (e) {
          console.warn('Failed to save weekly rank overrides', e);
        }
      }

      const { data: currentStandings } = await supabase
        .from('standings')
        .select('id, team_id, current_position, teams!inner(name)')
        .eq('league_id', parseInt(leagueId!));

      const needsInitialPositions = currentStandings && 
        currentStandings.some(s => !s.current_position || s.current_position <= 0);

      if (needsInitialPositions) {
        
        const { data: scheduleRecord } = await supabase
          .from('league_schedules')
          .select('schedule_data, format')
          .eq('league_id', parseInt(leagueId!))
          .maybeSingle();

        const teamRankings = extractTeamRankings(scheduleRecord);

        for (const standing of currentStandings) {
          const teamName = (standing as any).teams.name;
          const initialPosition = teamRankings.get(teamName) || 999;
          
          if (!standing.current_position || standing.current_position <= 0) {
            await supabase
              .from('standings')
              .update({ current_position: initialPosition })
              .eq('id', standing.id);
          }
        }
      }

      const { error: recalcError } = await supabase.rpc('recalculate_standings_positions', {
        p_league_id: parseInt(leagueId!)
      });

      if (recalcError) {
        console.error('Error recalculating positions:', recalcError);
        alert('Standings saved but positions could not be recalculated. Please refresh the page.');
      }

      // Persist Top Tier Line settings for regular formats
      try {
        if (!isEliteFormat && leagueId) {
          const lid = parseInt(leagueId);
          const { data: sched } = await supabase
            .from('league_schedules')
            .select('schedule_data')
            .eq('league_id', lid)
            .maybeSingle();
          const current = (sched as any)?.schedule_data || {};
          const updated = {
            ...current,
            standings_top_tier_line_enabled: Boolean(topTierLineEnabled),
            standings_top_tier_line_after: Number(topTierLineAfter) || 0,
          };
          await supabase
            .from('league_schedules')
            .update({ schedule_data: updated })
            .eq('league_id', lid);
        }
      } catch {}

      await loadStandings();
      
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving standings:', error);
      alert('Failed to save standings adjustments');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      if (isEliteFormat) {
        const lid = parseInt(leagueId!);
        // Persist reset week in schedule_data JSON
        const { data: sched } = await supabase
          .from('league_schedules')
          .select('schedule_data')
          .eq('league_id', lid)
          .maybeSingle();
        const current = (sched as any)?.schedule_data || {};
        const updated = { ...current, standings_reset_week: 3 };
        await supabase
          .from('league_schedules')
          .update({ schedule_data: updated })
          .eq('league_id', lid);
        setStandingsResetWeek(3);
        // Clear any local ranking edits and force refresh of elite data
        setEditedWeeklyRanks({});
      } else {
        // Legacy non-elite behavior: reset numeric standings to zero
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('league_id', parseInt(leagueId!))
          .eq('active', true);
        if (teamsError) throw teamsError;
        if (!teamsData || teamsData.length === 0) {
          alert('No teams found for this league');
          return;
        }
        for (const team of teamsData) {
          const { error: upsertError } = await supabase
            .from('standings')
            .upsert({
              league_id: parseInt(leagueId!),
              team_id: team.id,
              wins: 0,
              losses: 0,
              points: 0,
              point_differential: 0,
              manual_wins_adjustment: 0,
              manual_losses_adjustment: 0,
              manual_points_adjustment: 0,
              manual_differential_adjustment: 0
            }, {
              onConflict: 'league_id,team_id',
              ignoreDuplicates: false
            });
          if (upsertError) {
            console.error('Error upserting standings for team:', team.name, upsertError);
            throw upsertError;
          }
        }
        await loadStandings();
      }
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing standings data:', error);
      alert('Failed to clear standings data: ' + (error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-[#B20000] hover:underline mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[#6F6F6F] mb-2">
                  {league?.name} - Standings Management
                </h1>
                <p className="text-[#6F6F6F] mb-2">
                  Sport: {league?.sport_name} | Location: {league?.location}
                </p>
                {league?.cost && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-[#B20000] mr-1.5" />
                    <p className="text-sm font-medium text-[#6F6F6F]">
                      ${league.cost} + HST {getLeagueUnitLabel(league)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Navigation Links */}
            {isAdmin && league?.id && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <Link
                  to={`/my-account/leagues/edit/${league.id}`}
                  className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                >
                  Edit league
                </Link>
                <span className="text-gray-400 text-sm">|</span>
                <Link
                  to={`/leagues/${league.id}/teams`}
                  className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                >
                  Manage teams
                </Link>
                {league?.sport_name === 'Volleyball' && (
                  <>
                    <span className="text-gray-400 text-sm">|</span>
                    <Link
                      to={`/leagues/${league.id}/schedule`}
                      className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                    >
                      Manage schedule
                    </Link>
                  </>
                )}
                <span className="text-gray-400 text-sm">|</span>
                <span className="text-gray-400 text-sm whitespace-nowrap cursor-default">
                  Manage standings
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {!isEditMode ? (
              <Button
                onClick={handleEnterEditMode}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Standings
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={handleExitEditMode}
                  variant="outline"
                  className="flex items-center gap-2 ml-2"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
          
          {!isEditMode ? (
            <Button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing || isWeek3Completed}
              variant="outline"
              className={`flex items-center gap-2 ${
                isWeek3Completed 
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                  : 'border-red-300 text-red-600 hover:bg-red-50'
              }`}
              title={isWeek3Completed ? 'Clear Data is only available during seeding rounds (before week 3 completion)' : 'Reset all standings data to zero'}
            >
              <Trash2 className="h-4 w-4" />
              {clearing ? 'Clearing...' : 'Clear Data'}
            </Button>
          ) : (
            !isEliteFormat ? (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={topTierLineEnabled}
                    onChange={(e) => {
                      setTopTierLineEnabled(e.target.checked);
                      setHasChanges(true);
                    }}
                  />
                  Top tier line
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6F6F6F]">After tier</span>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, standings.length - 1)}
                    value={topTierLineAfter || ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                      const clamped = v <= 0 ? 0 : Math.max(1, Math.min(standings.length - 1, v));
                      setTopTierLineAfter(clamped);
                      setHasChanges(true);
                    }}
                    disabled={!topTierLineEnabled}
                    className="w-20 h-8 text-center text-sm"
                  />
                </div>
              </div>
            ) : null
          )}
        </div>

        <Card className="shadow-md overflow-hidden rounded-lg">
          <CardContent className="p-0 overflow-visible">
            {(() => {
              return (
                <>
                  {isEliteFormat && (
                    <>
                      {/* Static header row to mirror public elite standings */}
                      <div className="bg-gray-50 border-b">
                        <div
                          className="grid items-center text-[#6F6F6F]"
                          style={{ gridTemplateColumns: '64px 80px 256px 1fr' }}
                        >
                          <div className="px-4 py-3 text-left text-sm font-medium">Rank</div>
                          <div className="px-4 py-3 text-left text-sm font-medium">Avg.</div>
                          <div className="px-4 py-3 text-left text-sm font-medium">Team</div>
                          <div className="px-2 py-3 text-left text-sm font-medium">Week</div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="overflow-visible">
                    {isEliteFormat ? (
                      <div
                        ref={bottomScrollRef}
                        className="overflow-x-auto"
                        style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', overflowY: 'hidden' }}
                        onScroll={() => syncScroll('bot')}
                      >
                        <table ref={tableRef} className="w-full min-w-max table-auto">
                    <thead className="bg-gray-50 border-b">
                      <tr className="h-0">
                        <th
                          aria-hidden="true"
                          className="text-transparent px-0 py-0 h-0 rounded-tl-lg sticky left-0 z-20 bg-gray-50"
                          rowSpan={2}
                          style={{ left: 0, width: 64, minWidth: 64, maxWidth: 64 }}
                        />
                        <th
                          aria-hidden="true"
                          className="text-transparent px-0 py-0 h-0 sticky z-20 bg-gray-50"
                          rowSpan={2}
                          style={{ left: 64, width: 80, minWidth: 80, maxWidth: 80 }}
                        />
                        <th
                          aria-hidden="true"
                          className="text-transparent px-0 py-0 h-0 sticky z-20 bg-gray-50"
                          rowSpan={2}
                          style={{ left: 144, width: 256, minWidth: 256, maxWidth: 256 }}
                        />
                        <th aria-hidden="true" className="text-transparent px-0 py-0 h-0" colSpan={weeklyColumns.length} />
                      </tr>
                      <tr>
                        {weeklyColumns.map(week => {
                          const bg = playoffWeeks.has(week)
                            ? 'bg-red-50'
                            : (movementWeeks.has(week) ? 'bg-yellow-50' : '');
                          const text = (week < standingsResetWeek || noGameWeeks.has(week)) ? 'text-gray-300' : 'text-[#6F6F6F]';
                          return (
                            <th
                              key={`week-${week}`}
                              className={`px-2 py-2 text-center text-sm font-medium ${text} ${bg}`}
                            >
                              {week}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-200">
                      {[...standings]
                        .sort((a, b) => {
                          const aVals = weeklyColumns.filter(w => w >= standingsResetWeek).map(w => weeklyRanks[a.team_id]?.[w]).filter((v): v is number => typeof v === 'number');
                          const bVals = weeklyColumns.filter(w => w >= standingsResetWeek).map(w => weeklyRanks[b.team_id]?.[w]).filter((v): v is number => typeof v === 'number');
                          const useSeedFallback = standingsResetWeek <= 1;
                          const aAvg = aVals.length ? (aVals.reduce((x,y)=>x+y,0) / aVals.length) : (useSeedFallback ? (seedRanks[a.team_id] ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY);
                          const bAvg = bVals.length ? (bVals.reduce((x,y)=>x+y,0) / bVals.length) : (useSeedFallback ? (seedRanks[b.team_id] ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY);
                          if (aAvg !== bAvg) return aAvg - bAvg;
                          return (a.team_name || '').localeCompare(b.team_name || '');
                        })
                        .map((standing, index) => {
                          const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
                          const isEdited = !!editedStandings[editKey];
                          const played = weeklyColumns.filter(w => w >= standingsResetWeek).map(w => weeklyRanks[standing.team_id]?.[w]).filter((v): v is number => typeof v === 'number');
                          const avg = played.length ? (played.reduce((a,b)=>a+b,0) / played.length) : null;
                          return (
                            <tr
                              key={standing.id === 0 ? `team_${standing.team_id}` : standing.id}
                              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                                index === standings.length - 1 ? "last-row" : ""
                              } ${isEdited ? "ring-2 ring-yellow-400 ring-opacity-50" : ""}`}
                            >
                              <td
                                className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] sticky left-0 z-10 bg-inherit w-16 ${index === standings.length - 1 ? "rounded-bl-lg" : ""}`}
                                style={{ left: 0 }}
                              >
                                {index + 1}
                              </td>
                              <td
                                className="px-4 py-3 text-sm font-medium text-[#6F6F6F] sticky z-10 bg-inherit w-20"
                                style={{ left: 64 }}
                              >
                                {typeof avg === 'number' ? avg.toFixed(2) : '-'}
                              </td>
                              <td
                                className="px-4 py-3 text-sm font-semibold text-[#6F6F6F] sticky z-10 bg-inherit w-64"
                                style={{ left: 144 }}
                              >
                                {standing.team_name}
                              </td>
                              {weeklyColumns.map(week => {
                                const current = editedWeeklyRanks[standing.team_id]?.[week] ?? weeklyRanks[standing.team_id]?.[week];
                              const bg = playoffWeeks.has(week)
                                ? 'bg-red-50'
                                : (movementWeeks.has(week) ? 'bg-yellow-50' : '');
                              const text = (week < standingsResetWeek || noGameWeeks.has(week)) ? 'text-gray-300' : 'text-[#6F6F6F]';
                              return (
                                <td key={`week-${standing.team_id}-${week}`} className={`px-2 py-2 text-center text-sm ${text} ${bg}`}>
                                  {isEditMode ? (
                                      <Input
                                        type="number"
                                        min={0}
                                        value={current ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0);
                                          setEditedWeeklyRanks(prev => {
                                            const teamMap = { ...(prev[standing.team_id] || {}) };
                                            teamMap[week] = val;
                                            return { ...prev, [standing.team_id]: teamMap };
                                          });
                                          setHasChanges(true);
                                        }}
                                        className="w-14 h-8 text-center text-sm mx-auto"
                                      />
                                    ) : (
                                      <span>{weeklyRanks[standing.team_id]?.[week] ?? '-'}</span>
                                    )}
                                  </td>
                                );
                              })}
                              
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "40%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "13%" }} />
                  </colgroup>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">
                        Team
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">
                        Wins
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">
                        Losses
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] bg-red-50">
                        Points
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] rounded-tr-lg">
                        +/-
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {standings.map((standing, index) => {
                      const totalWins = getTotalValue(standing, 'wins', 'manual_wins_adjustment');
                      const totalLosses = getTotalValue(standing, 'losses', 'manual_losses_adjustment');
                      const totalPoints = getTotalValue(standing, 'points', 'manual_points_adjustment');
                      const totalDifferential = getTotalValue(standing, 'point_differential', 'manual_differential_adjustment');
                      const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
                      const isEdited = !!editedStandings[editKey];

                      return (
                        <>
                        <tr
                          key={standing.id === 0 ? `team_${standing.team_id}` : standing.id}
                          className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                            index === standings.length - 1 ? "last-row" : ""
                          } ${isEdited ? "ring-2 ring-yellow-400 ring-opacity-50" : ""}`}
                        >
                          <td
                            className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${
                              index === standings.length - 1 ? "rounded-bl-lg" : ""
                            }`}
                          >
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">
                            {standing.team_name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditMode ? (
                              <Input
                                type="number"
                                value={totalWins}
                                onChange={(e) => {
                                  const newTotal = parseInt(e.target.value) || 0;
                                  const base = getDisplayValue(standing, 'wins') as number;
                                  const adjustment = newTotal - base;
                                  handleFieldChange(standing, 'manual_wins_adjustment', adjustment.toString());
                                }}
                                className="w-16 h-8 text-center text-sm mx-auto"
                                min="0"
                              />
                            ) : (
                              <span className="text-sm font-medium text-[#6F6F6F]">{totalWins}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditMode ? (
                              <Input
                                type="number"
                                value={totalLosses}
                                onChange={(e) => {
                                  const newTotal = parseInt(e.target.value) || 0;
                                  const base = getDisplayValue(standing, 'losses') as number;
                                  const adjustment = newTotal - base;
                                  handleFieldChange(standing, 'manual_losses_adjustment', adjustment.toString());
                                }}
                                className="w-16 h-8 text-center text-sm mx-auto"
                                min="0"
                              />
                            ) : (
                              <span className="text-sm font-medium text-[#6F6F6F]">{totalLosses}</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-center ${!isEliteFormat ? 'bg-red-50' : ''}`}>
                            {isEditMode ? (
                              <Input
                                type="number"
                                value={totalPoints}
                                onChange={(e) => {
                                  const newTotal = parseInt(e.target.value) || 0;
                                  const base = getDisplayValue(standing, 'points') as number;
                                  const adjustment = newTotal - base;
                                  handleFieldChange(standing, 'manual_points_adjustment', adjustment.toString());
                                }}
                                className="w-16 h-8 text-center text-sm mx-auto"
                                min="0"
                              />
                            ) : (
                              <span className="text-sm font-medium text-[#6F6F6F]">{totalPoints}</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-center ${index === standings.length - 1 ? "rounded-br-lg" : ""}`}>
                            {isEditMode ? (
                              <Input
                                type="number"
                                value={totalDifferential}
                                onChange={(e) => {
                                  const newTotal = parseInt(e.target.value) || 0;
                                  const base = getDisplayValue(standing, 'point_differential') as number;
                                  const adjustment = newTotal - base;
                                  handleFieldChange(standing, 'manual_differential_adjustment', adjustment.toString());
                                }}
                                className="w-16 h-8 text-center text-sm mx-auto"
                              />
                            ) : (
                              <span className="text-sm font-medium text-[#6F6F6F]">{formatDiff(totalDifferential)}</span>
                            )}
                          </td>
                        </tr>
                        {topTierLineEnabled && (index + 1) === Number(topTierLineAfter) && (
                          <tr key={`divider-${standing.id === 0 ? `team_${standing.team_id}` : standing.id}`}>
                            <td colSpan={6} className="p-0">
                              <div className="relative py-2 overflow-visible">
                                <img
                                  src="/elite-badge.svg"
                                  alt="Top tier"
                                  className="absolute z-10 top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5"
                                  style={{ left: 'calc(5% + 16px)' }}
                                />
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#B20000]"></div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            </>
          );
        })()}
          </CardContent>
        </Card>

        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <Trash2 className="h-6 w-6 text-red-600 mr-3" />
                  <h2 className="text-xl font-bold text-[#6F6F6F]">Clear Standings Data</h2>
                </div>
                <p className="text-[#6F6F6F] mb-6">
                  This will reset all wins, losses, points, and point differentials to zero for all teams in this league. 
                  Team positions and manual adjustments will be preserved.
                </p>
                {isWeek3Completed ? (
                  <p className="text-sm text-red-600 mb-6">
                    <strong>Season Active:</strong> Clear Data is only available during seeding rounds (before week 3 completion).
                  </p>
                ) : (
                  <p className="text-sm text-red-600 mb-6">
                    <strong>Warning:</strong> This action cannot be undone.
                  </p>
                )}
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => setShowClearConfirm(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleClearData}
                    disabled={clearing || isWeek3Completed}
                    className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {clearing ? 'Clearing...' : 'Clear Data'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
