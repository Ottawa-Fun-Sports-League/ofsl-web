import { Card, CardContent } from "../../../components/ui/card";
import { useLeagueStandings } from "../hooks/useLeagueStandings";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { computeInitialSeedRankingMap, computePrevWeekNameRanksFromNextWeekSchedule } from "../../LeagueSchedulePage/utils/rankingUtils";
import { useEliteStandings } from "../../../standings/useEliteStandings";
import { useAuth } from "../../../contexts/AuthContext";

interface LeagueStandingsProps {
  leagueId: string | undefined;
}

export function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const { teams, loading, error, hasSchedule, refetch } = useLeagueStandings(leagueId);
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin === true;
  const [scheduleFormat, setScheduleFormat] = useState<string | null>(null);
  const [regularSeasonWeeks, setRegularSeasonWeeks] = useState<number>(0);
  const [weeklyRanks, setWeeklyRanks] = useState<Record<number, Record<number, number>>>({}); // teamId -> { week -> rank }
  const [seedRanks, setSeedRanks] = useState<Record<number, number>>({}); // teamId -> initial rank from Week 1 schedule
  const [eliteVariantFormat, setEliteVariantFormat] = useState<string | null>(null); // e.g., '2-teams-elite', '3-teams-elite-6-sets'
  const [standingsResetWeek, setStandingsResetWeek] = useState<number>(1);
  const [noGameWeeks, setNoGameWeeks] = useState<Set<number>>(new Set());
  const [movementWeeks, setMovementWeeks] = useState<Set<number>>(new Set());
  const [playoffWeeks, setPlayoffWeeks] = useState<Set<number>>(new Set());
  // Regular formats only: public divider controls
  const [topTierLineEnabled, setTopTierLineEnabled] = useState(false);
  const [topTierLineAfter, setTopTierLineAfter] = useState<number>(0);

  // Horizontal scroll sync (elite table)
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState<number>(0);
  const [showScrollHint, setShowScrollHint] = useState<boolean>(false);
  // Responsive sticky widths for elite table
  const [rankW, setRankW] = useState<number>(64);
  const [avgW, setAvgW] = useState<number>(80);
  const [teamW, setTeamW] = useState<number>(256);
  const leftAvg = rankW;
  const leftTeam = rankW + avgW;
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOverWeeks, setIsOverWeeks] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragScrollLeftRef = useRef<number>(0);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    const update = () => {
      const w = tableRef.current?.scrollWidth || 0;
      const containerW = bottomScrollRef.current?.clientWidth || 0;
      const next = Math.max(w, containerW);
      setScrollWidth(next);
      // Show fade only when there is overflow and we are not already scrolled to the end
      const left = bottomScrollRef.current?.scrollLeft || 0;
      const max = Math.max(0, next - containerW);
      setShowScrollHint(next > (containerW + 4) && left < (max - 1));
    };
    const schedule = () => {
      raf1 = requestAnimationFrame(() => {
        update();
        raf2 = requestAnimationFrame(update);
      });
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    if (tableRef.current) ro.observe(tableRef.current);
    if (bottomScrollRef.current) ro.observe(bottomScrollRef.current as Element);
    window.addEventListener('resize', schedule);
    return () => { try { ro.disconnect(); } catch {} window.removeEventListener('resize', schedule); if (raf1) cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2); };
  }, [regularSeasonWeeks, weeklyRanks]);
  // Update widths on resize for mobile responsiveness (elite only)
  useEffect(() => {
    const updateWidths = () => {
      const ww = window.innerWidth || 1024;
      if (ww < 640) {
        setRankW(36);
        setAvgW(48);
        setTeamW(112);
      } else if (ww < 768) {
        setRankW(40);
        setAvgW(56);
        setTeamW(180);
      } else {
        setRankW(64);
        setAvgW(80);
        setTeamW(256);
      }
    };
    updateWidths();
    window.addEventListener('resize', updateWidths);
    return () => window.removeEventListener('resize', updateWidths);
  }, []);
  const syncScroll = (from: 'top' | 'bot') => {
    const a = from === 'top' ? topScrollRef.current : bottomScrollRef.current;
    const b = from === 'top' ? bottomScrollRef.current : topScrollRef.current;
    if (a && b && Math.abs(b.scrollLeft - a.scrollLeft) > 1) b.scrollLeft = a.scrollLeft;
  };
  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // left click only
    if (!bottomScrollRef.current) return;
    // Only enable drag when clicking within the weeks area, not over sticky Rank/Avg/Team
    const scroller = bottomScrollRef.current as HTMLDivElement;
    const rect = scroller.getBoundingClientRect();
    const stickyRight = leftTeam + teamW; // dynamic boundary
    const xWithin = e.clientX - rect.left;
    if (xWithin <= stickyRight) {
      return; // clicked within sticky columns; do not start drag
    }
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = bottomScrollRef.current.scrollLeft || 0;
    e.preventDefault();
  };
  const handleDragMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const scroller = bottomScrollRef.current;
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const stickyRight = leftTeam + teamW;
      const xWithin = e.clientX - rect.left;
      const overflows = scrollWidth > (scroller.clientWidth + 4);
      setIsOverWeeks(overflows && xWithin > stickyRight);
    }
    if (!isDragging || !scroller) return;
    const dx = e.clientX - dragStartXRef.current;
    scroller.scrollLeft = dragScrollLeftRef.current - dx;
  };
  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsOverWeeks(false);
  };

  // Shared elite standings (single source of truth for elite formats)
  const elite = useEliteStandings(leagueId);
  useEffect(() => {
    if (elite.isElite) {
      setScheduleFormat('elite');
      // Do not copy weekly ranks from the hook here GÇö public rebuilds from scratch below
      if (elite.seedRanksByTeamId && Object.keys(elite.seedRanksByTeamId).length > 0) {
        setSeedRanks(elite.seedRanksByTeamId);
      }
      if (elite.maxWeek && elite.maxWeek > 0) {
        // Never shrink columns: keep the greater of current and elite-reported max
        setRegularSeasonWeeks(prev => Math.max(prev, elite.maxWeek));
      }
    }
  }, [elite.isElite, elite.seedRanksByTeamId, elite.maxWeek]);

  // Ensure elite standings show columns up to inclusive end week
  useEffect(() => {
    const adjustEliteWeeks = async () => {
      if (!leagueId) return;
      if (!elite.isElite) return;
      try {
        const lid = parseInt(leagueId);
        const { data: leagueRow } = await supabase
          .from('leagues')
          .select('start_date,end_date,playoff_weeks')
          .eq('id', lid)
          .maybeSingle();
        const startS = (leagueRow as any)?.start_date as string | undefined;
        const endS = (leagueRow as any)?.end_date as string | undefined;
        const playoffWeeks = Number((leagueRow as any)?.playoff_weeks ?? 0) || 0;
        if (startS && endS) {
          const start = new Date(startS + 'T00:00:00');
          const end = new Date(endS + 'T00:00:00');
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const inclusiveWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
          // Also consider any weeks actually present in weekly_schedules (e.g., playoff weeks added beyond end_date)
          let rowMax = 0;
          try {
            const { data: weeks } = await supabase
              .from('weekly_schedules')
              .select('week_number')
              .eq('league_id', lid);
            rowMax = Array.isArray(weeks) && weeks.length > 0
              ? (weeks as any[]).reduce((m, r) => Math.max(m, Number((r as any).week_number || 0)), 0)
              : 0;
          } catch { /* ignore */ }
          const target = Math.max(inclusiveWeeks + playoffWeeks, elite.maxWeek || 0, rowMax);
          if (Number.isFinite(target) && target > 0) {
            setRegularSeasonWeeks(target);
          }
        }
      } catch { /* ignore */ }
    };
    adjustEliteWeeks();
  }, [leagueId, elite.isElite, elite.maxWeek]);

  // Legacy weekly backfill is intentionally disabled (admin parity handled elsewhere)
  useEffect(() => {
    if (!leagueId) return;
    if (!elite.isElite) return;
  }, [leagueId, elite.isElite]);

  // Public-safe elite variant detection: always compute from weekly_schedules for this league
  useEffect(() => {
    const detectVariant = async () => {
      if (!leagueId) { setEliteVariantFormat(null); return; }
      try {
        setEliteVariantFormat(null); // clear stale value immediately on navigation
        const lid = parseInt(leagueId);
        const { data: weekRows } = await supabase
          .from('weekly_schedules')
          .select('format')
          .eq('league_id', lid);
        const fmt = ((weekRows || [])
          .map((r: any) => String((r?.format ?? '')).toLowerCase())
          .find((f: string) => f.includes('2-teams-elite') || f.includes('3-teams-elite-6-sets') || f.includes('3-teams-elite-9-sets')))
          || null;
        if (fmt !== eliteVariantFormat) setEliteVariantFormat(fmt);
      } catch {
        // leave as null on error
        setEliteVariantFormat(null);
      }
    };
    void detectVariant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Load weeks marked as no-games, movement-week, and playoffs for elite formats (to style columns)
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
        // Compute playoff range from league start/end + playoff_weeks to avoid off-by-one
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
            // Also include any DB-flagged playoff weeks, but never weeks within the regular season
            poSetFromDb.forEach((w) => { if (w >= startWeek) poSet.add(w); });
          }
        } catch { /* ignore */ }
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

  // Rebuild from scratch (placements first, then results) to keep parity with Admin
  useEffect(() => {
    const rebuild = async () => {
      if (!leagueId) return;
      if (!elite.isElite) return;
      const lid = parseInt(leagueId);
      try {
        const [wq, rq, tq, lq] = await Promise.all([
          supabase.from('weekly_schedules')
            .select('id, week_number, tier_number, format, no_games, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
            .eq('league_id', lid),
          supabase.from('game_results')
            .select('team_name, week_number, tier_number, tier_position')
            .eq('league_id', lid),
          supabase.from('teams')
            .select('id,name')
            .eq('league_id', lid)
            .eq('active', true),
          supabase.from('league_schedules')
            .select('schedule_data')
            .eq('league_id', lid)
            .maybeSingle(),
        ]);

        const weekRows: any[] = (wq.data || []) as any[];
        // Load reset week if set
        try {
          const reset = Number(((lq.data as any)?.schedule_data?.standings_reset_week) ?? 1);
          if (Number.isFinite(reset) && reset >= 1) setStandingsResetWeek(reset);
        } catch {}
        try {
          // Detect elite variant format from weekly schedules, if present
          const fmt = ((weekRows || [])
            .map((r: any) => String((r?.format ?? '')).toLowerCase())
            .find((f: string) => f.includes('2-teams-elite') || f.includes('3-teams-elite-6-sets') || f.includes('3-teams-elite-9-sets')))
            || null;
          if (fmt && fmt !== eliteVariantFormat) setEliteVariantFormat(fmt);
        } catch {}
        const results: any[] = (rq.data || []) as any[];
        const teamsRows: any[] = (tq.data || []) as any[];

        const nameToId = new Map<string, number>();
        (teamsRows || []).forEach((t: any) => nameToId.set(String((t?.name || '')).toLowerCase(), t.id));

        const { computePrevWeekNameRanksFromNextWeekSchedule, computeWeeklyNameRanksFromResults } = await import('../../LeagueSchedulePage/utils/rankingUtils');

        const computed: Record<number, Record<number, number>> = {};
        const weeks = Array.from(new Set((weekRows || []).map((r: any) => r.week_number))).sort((a:number,b:number)=>a-b);
        // Aggregate which weeks are full no-games
        const noGameByWeek = new Map<number, { total: number; noGames: number }>();
        (weekRows || []).forEach((r: any) => {
          const w = Number(r.week_number || 0);
          if (!noGameByWeek.has(w)) noGameByWeek.set(w, { total: 0, noGames: 0 });
          const agg = noGameByWeek.get(w)!;
          agg.total += 1;
          if (r.no_games) agg.noGames += 1;
        });
        const isFullNoGames = (w: number) => {
          const agg = noGameByWeek.get(w);
          return !!(agg && agg.total > 0 && agg.noGames === agg.total);
        };
        for (const w of weeks) {
          let prevWeek = (w || 0) - 1;
          while (prevWeek >= 1 && isFullNoGames(prevWeek)) prevWeek -= 1;
          if (prevWeek < 1) continue;
          const rows = (weekRows || []).filter((r: any) => r.week_number === w);
          const map = computePrevWeekNameRanksFromNextWeekSchedule(rows as any);
          Object.entries(map).forEach(([nm, rk]) => {
            const id = nameToId.get(String(nm || '').toLowerCase());
            if (!id) return;
            if (!computed[id]) computed[id] = {} as Record<number, number>;
            computed[id][prevWeek] = rk as number;
          });
        }

        if (Array.isArray(results) && results.length > 0) {
          const byName = computeWeeklyNameRanksFromResults(
            (weekRows || []).map((r: any) => ({ id: r.id ?? null, week_number: r.week_number, tier_number: r.tier_number, format: r.format })) as any,
            results as any,
          );
          Object.keys(byName || {}).map(Number).forEach((w) => {
            const nmMap = (byName as any)[w] || {};
            Object.entries(nmMap).forEach(([nm, rk]) => {
              const id = nameToId.get(String(nm || '').toLowerCase());
              if (!id) return;
              if (!computed[id]) computed[id] = {} as Record<number, number>;
              if (typeof computed[id][w] !== 'number') {
                computed[id][w] = rk as number;
              }
            });
          });
        }

        setWeeklyRanks(computed);
      } catch {
        // ignore
      }
    };
    rebuild();
  }, [leagueId, elite.isElite]);

  // Listen for global standings update events (emitted after score submission)
  useEffect(() => {
    if (!leagueId) return;
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail as { leagueId?: number | string } | undefined;
        if (!detail || !detail.leagueId) {
          refetch();
          return;
        }
        const incoming = String(detail.leagueId);
        if (incoming === String(leagueId)) {
          refetch();
        }
      } catch {
        refetch();
      }
    };
    window.addEventListener('ofsl:standings-updated', handler as EventListener);
    return () => window.removeEventListener('ofsl:standings-updated', handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Compute weekly column indices first so downstream hooks can reference safely
  const weeklyColumns = useMemo(() => Array.from({ length: Math.max(regularSeasonWeeks, 0) }, (_, i) => i + 1), [regularSeasonWeeks]);
  // Canonical elite flag for public: require explicit elite variant detected for this league
  const isEliteFormat = useMemo(() => {
    const varFmt = String(eliteVariantFormat || '').toLowerCase();
    return (
      varFmt.includes('2-teams-elite') ||
      varFmt.includes('3-teams-elite-6-sets') ||
      varFmt.includes('3-teams-elite-9-sets')
    );
  }, [eliteVariantFormat]);
  const eliteRenderable = useMemo(() => {
    const hasEliteCols = Number((elite as any)?.maxWeek || 0) > 0;
    const hasWeeklyRanks = Object.keys(weeklyRanks || {}).length > 0;
    const hasSeeds = Object.keys(seedRanks || {}).length > 0;
    return isEliteFormat && (hasEliteCols || hasWeeklyRanks || hasSeeds);
  }, [isEliteFormat, elite.maxWeek, weeklyRanks, seedRanks]);

  // Final UI gate: on public (non-admin), only show elite UI if an explicit elite variant was detected for this league
  const useEliteUI = useMemo(() => {
    const explicitVariant = Boolean(eliteVariantFormat);
    return isAdmin ? eliteRenderable : (explicitVariant && eliteRenderable);
  }, [isAdmin, eliteRenderable, eliteVariantFormat]);

  // Data-ready guard for non-elite public view: avoid momentary blank paint on Firefox.
  const [nonEliteReady, setNonEliteReady] = useState(false);
  useEffect(() => {
    if (useEliteUI) { setNonEliteReady(false); return; }
    if (teams.length > 0) {
      const id = requestAnimationFrame(() => setNonEliteReady(true));
      return () => { cancelAnimationFrame(id); setNonEliteReady(false); };
    }
    setNonEliteReady(false);
    return () => {};
  }, [useEliteUI, teams.length]);


  // Reset elite-only state when switching to a non-elite league or navigating
  useEffect(() => {
    if (!isEliteFormat) {
      setEliteVariantFormat(null);
      setWeeklyRanks({});
      setSeedRanks({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, isEliteFormat]);
  const hideStandingsNote = useMemo(() => {
    // Hide the blue note for specific elite variants only
    const fmt = String(eliteVariantFormat || '').toLowerCase();
    return isEliteFormat && (
      fmt.includes('2-teams-elite') ||
      fmt.includes('3-teams-elite-6-sets') ||
      fmt.includes('3-teams-elite-9-sets')
    );
  }, [isEliteFormat, eliteVariantFormat]);
  const showDifferentialColumn = useMemo(() => {
    const fmt = (scheduleFormat ?? '').toLowerCase();
    return (
      fmt === '3-teams-6-sets' ||
      fmt === '2-teams-4-sets' ||
      fmt === '2-teams-best-of-5' ||
      fmt === '4-teams-head-to-head' ||
      fmt === '6-teams-head-to-head'
    );
  }, [scheduleFormat]);
  
  // Only display weeks that actually have any data to avoid stray numbers
  const weeksWithData = useMemo(() => {
    const set = new Set<number>();
    Object.values(weeklyRanks || {}).forEach((m) => {
      Object.entries(m || {}).forEach(([w, v]) => {
        if (typeof v === 'number') set.add(Number(w));
      });
    });
    return set;
  }, [weeklyRanks]);

  useEffect(() => {
    const loadFormatAndWeeks = async () => {
      if (!leagueId) return;
      // Skip legacy public computation when elite is enabled; rely on placement-first rebuild instead
      if (elite.isElite) return;
      // Elite path is handled by the shared hook GÇö skip local computations
      if (elite.isElite) return;
      try {
        const lid = parseInt(leagueId);
        const { data: scheduleRecord, error: scheduleError } = await supabase
          .from('league_schedules')
          .select('format, schedule_data')
          .eq('league_id', lid)
          .maybeSingle();
        if (!scheduleError) {
          setScheduleFormat(scheduleRecord?.format ?? null);
          // If DB says elite, skip legacy public computation entirely
          const isEliteDb = String(scheduleRecord?.format || '').toLowerCase().includes('elite');
          if (isEliteDb) return;
          // Load public divider settings for regular formats
          const sd = (scheduleRecord as any)?.schedule_data || {};
          setTopTierLineEnabled(Boolean(sd?.standings_top_tier_line_enabled));
          const cutoff = Number(sd?.standings_top_tier_line_after ?? 0);
          if (Number.isFinite(cutoff) && cutoff > 0) setTopTierLineAfter(cutoff);
        }

        const { data: weekRows, error: weeksErr } = await supabase
          .from('weekly_schedules')
          .select('week_number')
          .eq('league_id', lid);

        if (!weeksErr && Array.isArray(weekRows) && weekRows.length > 0) {
          const maxWeek = weekRows.reduce((max, r: any) => Math.max(max, r.week_number || 0), 0);
          // Do not shrink columns; only ever increase to reflect new weeks (incl. playoffs)
          setRegularSeasonWeeks(prev => Math.max(prev, maxWeek));
          try {
            const { data: nextWeekTiers } = await supabase
              .from('weekly_schedules')
              .select('id,week_number,tier_number,format,team_a_name,team_b_name,team_c_name,team_d_name,team_e_name,team_f_name,team_a_ranking,team_b_ranking,team_c_ranking,team_d_ranking,team_e_ranking,team_f_ranking')
              .eq('league_id', lid)
              .order('week_number', { ascending: true })
              .order('tier_number', { ascending: true });
            const nameToId = new Map<string, number>();
            const { data: teamRows } = await supabase
              .from('teams')
              .select('id,name')
              .eq('league_id', lid)
              .eq('active', true);
            (teamRows || []).forEach((t: any) => nameToId.set(((t as any).name || '').toLowerCase(), (t as any).id));

            // Prefer ranks based on next week's placements (authoritative after movement)
            const byWeek: Record<number, Record<number, number>> = {};
            const allWeeks = Array.from(new Set((nextWeekTiers || []).map((r: any) => r.week_number))).sort((a: number,b: number)=>a-b);
            // Only compute prevWeek ranks when that prevWeek has any recorded results
            const { data: resultsWeeks } = await supabase
              .from('game_results')
              .select('week_number')
              .eq('league_id', lid);
            const weekNums = (resultsWeeks || []).map((r: any) => Number((r as any).week_number || 0)).filter((n: number) => n > 0);
            const completedWeeks = new Set<number>(weekNums);
            const maxCompleted = weekNums.length ? Math.max(...weekNums) : 0;
            for (const w of allWeeks) {
              const prevWeek = (w || 0) - 1;
              if (prevWeek < 1) continue;
              // Gate to weeks that actually have results, and also never exceed max completed week
              if (!completedWeeks.has(prevWeek) || prevWeek > maxCompleted) continue;
              const rows = (nextWeekTiers || []).filter((r: any) => r.week_number === w);
              const nameRankMap = computePrevWeekNameRanksFromNextWeekSchedule(rows as any);
              const idMap: Record<number, number> = {};
              Object.entries(nameRankMap).forEach(([nm, rk]) => {
                const id = nameToId.get((nm || '').toLowerCase());
                if (id) idMap[id] = rk as number;
              });
              if (Object.keys(idMap).length > 0) byWeek[prevWeek] = idMap;
            }
            // Fill gaps using current-week results if no next-week placements yet
            const { data: resultRows } = await supabase
              .from('game_results')
              .select('team_name, week_number, tier_number, tier_position')
              .eq('league_id', lid);
            const { computeWeeklyNameRanksFromResults } = await import('../../LeagueSchedulePage/utils/rankingUtils');
            const nameRanksByWeek = computeWeeklyNameRanksFromResults(
              (nextWeekTiers || []).map((r: any) => ({ id: r.id ?? null, week_number: r.week_number, tier_number: r.tier_number, format: r.format })),
              (resultRows || []) as any,
            );
            for (const w of Object.keys(nameRanksByWeek).map(Number)) {
              const nameMap = nameRanksByWeek[w] || {};
              const idMap: Record<number, number> = {};
              Object.entries(nameMap).forEach(([nm, rk]) => {
                const id = nameToId.get((nm || '').toLowerCase());
                if (id) idMap[id] = rk as number;
              });
              if (Object.keys(idMap).length > 0) {
                if (!byWeek[w]) {
                  byWeek[w] = idMap;
                }
              } else if (!byWeek[w]) {
                byWeek[w] = {};
              }
            }
            setWeeklyRanks(byWeek);
            // Compute initial seed ranks from Week 1 schedule using AB-pair logic
            try {
              const { data: week1Rows } = await supabase
                .from('weekly_schedules')
                .select('tier_number,format,team_a_name,team_b_name,team_c_name')
                .eq('league_id', lid)
                .eq('week_number', 1)
                .order('tier_number', { ascending: true });
              const seedMap = computeInitialSeedRankingMap((week1Rows || []) as any);
              const seed: Record<number, number> = {};
              for (const [nm, rk] of seedMap.entries()) {
                const id = nameToId.get((nm || '').toLowerCase());
                if (id) seed[id] = rk;
              }
              setSeedRanks(seed);
            } catch {}
          } catch {}
        } else {
          // Fallback to a reasonable default if no schedule rows yet
          setRegularSeasonWeeks(12);
        }
      } catch (_) {
        setRegularSeasonWeeks(12);
      }
    };

    loadFormatAndWeeks();
  }, [leagueId, elite.isElite]);
  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
          League Standings
        </h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
          League Standings
        </h2>
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Error loading standings: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
          League Standings
        </h2>
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-2">
              No Teams Registered
            </h3>
            <p className="text-[#6F6F6F]">
              This league doesn&apos;t have any registered teams yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
        League Standings
      </h2>

      {/* Note about standings (hidden for elite 2-team and elite 3-team 6-sets) */}
      {!hideStandingsNote && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            {hasSchedule ? (
              <>
                <strong>Note:</strong> Standings are updated weekly. Ordered by points, then wins, then point differential.
              </>
            ) : (
              <>
                <strong>Note:</strong> Game records and standings will be available once league play begins. Below shows the current registered teams.
              </>
            )}
          </p>
        </div>
      )}

      {/* Standings table */}
      <Card className="shadow-md overflow-hidden rounded-lg">
        <CardContent className="p-0 overflow-visible">
          {(() => {
            return (
              <>
                {useEliteUI && (
                  <>
                    {/* Static header row: Rank / Avg. / Team / Week (does not scroll) */}
                    <div className="bg-gray-50 border-b">
                      <div
                        className="grid items-center text-[#6F6F6F]"
                        style={{ gridTemplateColumns: `${rankW}px ${avgW}px ${teamW}px 1fr` }}
                      >
                        <div className="px-2 sm:px-4 py-3 text-left text-sm font-medium">Rank</div>
                        <div className="px-2 sm:px-4 py-3 text-left text-sm font-medium">Avg.</div>
                        <div className="px-2 sm:px-4 py-3 text-left text-sm font-medium">Team</div>
                        <div className="px-2 py-3 text-left text-sm font-medium">Week</div>
                      </div>
                    </div>
                    {/* Removed top horizontal scrollbar in favor of subtle hint */}
                    <div className="relative">
                      <div
                        ref={bottomScrollRef}
                        className={`overflow-x-auto ${isDragging ? 'cursor-grabbing select-none' : (isOverWeeks ? 'cursor-grab' : 'cursor-default')}`}
                        style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', overflowY: 'hidden' }}
                        onScroll={() => {
                          const el = bottomScrollRef.current;
                          if (el) {
                            const max = Math.max(0, scrollWidth - el.clientWidth);
                            setShowScrollHint(max > 4 && el.scrollLeft < (max - 1));
                          }
                          syncScroll('bot');
                        }}
                        onMouseDown={handleDragMouseDown}
                        onMouseMove={handleDragMouseMove}
                        onMouseUp={endDrag}
                        onMouseLeave={endDrag}
                      >
                        {/* Elite table rendered inside scroller */}
                        {useEliteUI && (
                          <table ref={tableRef} className="w-full min-w-max table-auto">
                            <thead className="bg-gray-50 border-b">
                              <tr className="h-0">
                                <th aria-hidden="true" className="text-transparent px-0 py-0 h-0 rounded-tl-lg sticky left-0 z-20 bg-gray-50" rowSpan={2} style={{ left: 0, width: rankW, minWidth: rankW, maxWidth: rankW }} />
                                <th aria-hidden="true" className="text-transparent px-0 py-0 h-0 sticky z-20 bg-gray-50" rowSpan={2} style={{ left: leftAvg, width: avgW, minWidth: avgW, maxWidth: avgW }} />
                                <th aria-hidden="true" className="text-transparent px-0 py-0 h-0 sticky z-20 bg-gray-50" rowSpan={2} style={{ left: leftTeam, width: teamW, minWidth: teamW, maxWidth: teamW }} />
                                <th aria-hidden="true" className="text-transparent px-0 py-0 h-0" colSpan={weeklyColumns.length} />
                              </tr>
                              <tr>
                                {weeklyColumns.map(week => {
                                  const bg = playoffWeeks.has(week)
                                    ? 'bg-red-50'
                                    : (movementWeeks.has(week) ? 'bg-yellow-50' : '');
                                  const text = (week < standingsResetWeek || noGameWeeks.has(week)) ? 'text-gray-300' : 'text-[#6F6F6F]';
                                  return (
                                    <th key={`week-${week}`} className={`px-2 py-2 text-center text-sm font-medium ${text} ${bg}`}>{week}</th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {[...teams].sort((a, b) => {
                                const aVals = weeklyColumns.filter(w => w >= standingsResetWeek).map(week => weeklyRanks[a.id]?.[week]).filter((v): v is number => typeof v === 'number');
                                const bVals = weeklyColumns.filter(w => w >= standingsResetWeek).map(week => weeklyRanks[b.id]?.[week]).filter((v): v is number => typeof v === 'number');
                                const useSeedFallback = standingsResetWeek <= 1;
                                const aAvg = aVals.length ? (aVals.reduce((x,y)=>x+y,0) / aVals.length) : (useSeedFallback ? (seedRanks[a.id] ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY);
                                const bAvg = bVals.length ? (bVals.reduce((x,y)=>x+y,0) / bVals.length) : (useSeedFallback ? (seedRanks[b.id] ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY);
                                if (aAvg !== bAvg) return aAvg - bAvg;
                                return (a.name || '').localeCompare(b.name || '');
                              }).map((team, index) => {
                                const played = weeklyColumns.filter(w => w >= standingsResetWeek).map(week => weeklyRanks[team.id]?.[week]).filter((v): v is number => typeof v === 'number');
                                const avg = played.length ? (played.reduce((a,b)=>a+b,0) / played.length) : null;
                                const cols = 5 + (showDifferentialColumn ? 1 : 0);
                                return (
                                  <>
                                    <tr key={team.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${index === teams.length - 1 ? 'last-row' : ''} ${topTierLineEnabled && index === Number(topTierLineAfter) ? 'border-t-2 border-[#B20000]' : ''}`}>
                                      <td className={`px-2 py-3 text-xs sm:text-sm font-medium text-[#6F6F6F] sticky left-0 z-10 bg-inherit ${index === teams.length - 1 ? 'rounded-bl-lg' : ''}`} style={{ left: 0, width: rankW, minWidth: rankW, maxWidth: rankW }}>{index + 1}</td>
                                      <td className="px-2 py-3 text-xs sm:text-sm font-medium text-[#6F6F6F] sticky z-10 bg-inherit" style={{ left: leftAvg, width: avgW, minWidth: avgW, maxWidth: avgW }}>{typeof avg === 'number' ? avg.toFixed(2) : '-'}</td>
                                      <td className="px-2 py-3 text-sm font-semibold text-[#6F6F6F] sticky z-10 bg-inherit whitespace-nowrap overflow-hidden text-ellipsis" style={{ left: leftTeam, width: teamW, minWidth: teamW, maxWidth: teamW }}>{team.name}</td>
                                      {weeklyColumns.map(week => {
                                        const val = weeklyRanks[team.id]?.[week];
                                        const show = weeksWithData.has(week);
                                        const bg = playoffWeeks.has(week)
                                          ? 'bg-red-50'
                                          : (movementWeeks.has(week) ? 'bg-yellow-50' : '');
                                        const text = (week < standingsResetWeek || noGameWeeks.has(week)) ? 'text-gray-300' : 'text-[#6F6F6F]';
                                        return (
                                          <td key={`week-${team.id}-${week}`} className={`px-4 py-3 text-center text-sm ${text} ${bg}`}>{show ? (typeof val === 'number' ? val : '-') : '-'}</td>
                                        );
                                      })}
                                    </tr>
                                    {topTierLineEnabled && (index + 1) === Number(topTierLineAfter) && (
                                      <tr key={`divider-${team.id}`}>
                                        <td colSpan={cols} className="p-0">
                                          <div className="relative py-2 overflow-visible z-20">
                                            <img src="/elite-badge.svg" alt="Top tier" className="absolute z-30 top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 pointer-events-none" style={{ left: 'calc(5% + 16px)' }} />
                                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#B20000] z-10" />
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
                      {showScrollHint && (
                        <div
                          className="pointer-events-none absolute inset-y-0 right-0 w-10"
                          style={{ background: 'linear-gradient(to left, rgba(249,250,251,1), rgba(249,250,251,0))' }}
                        />
                      )}
                    </div>
                  </>
                )}
          
            {!useEliteUI && (
              !nonEliteReady ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
                </div>
              ) : (
              <table className="w-full table-auto" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">Team</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">Wins</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">Losses</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] bg-red-50">Points</th>
                    {showDifferentialColumn && (
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] rounded-tr-lg">+/-</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teams.map((team, index) => {
                    const cols = 5 + (showDifferentialColumn ? 1 : 0);
                    return (
                      <React.Fragment key={`row-${team.id}`}>
                        <tr className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${index === teams.length - 1 ? "last-row" : ""}`}>
                          <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${index === teams.length - 1 ? "rounded-bl-lg" : ""}`}>{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                          <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">{team.wins}</td>
                          <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">{team.losses}</td>
                          <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center bg-red-50">{team.points}</td>
                          {showDifferentialColumn && (
                            <td className={`px-4 py-3 text-sm text-[#6F6F6F] text-center ${index === teams.length - 1 ? "rounded-br-lg" : ""}`}>{team.differential > 0 ? `+${team.differential}` : `${team.differential}`}</td>
                          )}
                        </tr>
                        {topTierLineEnabled && (index + 1) === Number(topTierLineAfter) && (
                          <tr key={`divider-${team.id}`}>
                            <td colSpan={cols} className="p-0">
                              <div className="relative py-2 overflow-visible z-20">
                                <img
                                  src="/elite-badge.svg"
                                  alt="Top tier"
                                  className="absolute z-30 top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 pointer-events-none"
                                  style={{ left: 'calc(5% + 16px)' }}
                                />
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#B20000] z-10"></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              )
            )}
            </>
          );
        })()}
        </CardContent>
      </Card>
    </div>
  );
}


