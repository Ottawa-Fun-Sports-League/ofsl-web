import { Card, CardContent } from "../../../components/ui/card";
import { useLeagueStandings } from "../hooks/useLeagueStandings";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { computeInitialSeedRankingMap, computePrevWeekNameRanksFromNextWeekSchedule } from "../../LeagueSchedulePage/utils/rankingUtils";
import { useEliteStandings } from "../../../standings/useEliteStandings";

interface LeagueStandingsProps {
  leagueId: string | undefined;
}

export function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const { teams, loading, error, hasSchedule, refetch } = useLeagueStandings(leagueId);
  const [scheduleFormat, setScheduleFormat] = useState<string | null>(null);
  const [regularSeasonWeeks, setRegularSeasonWeeks] = useState<number>(0);
  const [weeklyRanks, setWeeklyRanks] = useState<Record<number, Record<number, number>>>({}); // teamId -> { week -> rank }
  const [seedRanks, setSeedRanks] = useState<Record<number, number>>({}); // teamId -> initial rank from Week 1 schedule
  const [eliteVariantFormat, setEliteVariantFormat] = useState<string | null>(null); // e.g., '2-teams-elite', '3-teams-elite-6-sets'
  const [standingsResetWeek, setStandingsResetWeek] = useState<number>(1);
  const [noGameWeeks, setNoGameWeeks] = useState<Set<number>>(new Set());
  const [movementWeeks, setMovementWeeks] = useState<Set<number>>(new Set());

  // Shared elite standings (single source of truth for elite formats)
  const elite = useEliteStandings(leagueId);
  useEffect(() => {
    if (elite.isElite) {
      setScheduleFormat('elite');
      // Do not copy weekly ranks from the hook here — public rebuilds from scratch below
      if (elite.seedRanksByTeamId && Object.keys(elite.seedRanksByTeamId).length > 0) {
        setSeedRanks(elite.seedRanksByTeamId);
      }
      if (elite.maxWeek && elite.maxWeek > 0) {
        setRegularSeasonWeeks(elite.maxWeek);
      }
    }
  }, [elite.isElite, elite.seedRanksByTeamId, elite.maxWeek]);

  // Legacy weekly backfill is intentionally disabled (admin parity handled elsewhere)
  useEffect(() => {
    if (!leagueId) return;
    if (!elite.isElite) return;
  }, [leagueId, elite.isElite]);

  // Load weeks marked as no-games and movement-week for elite formats (to style columns)
  useEffect(() => {
    const run = async () => {
      if (!leagueId) return;
      if (!elite.isElite) return;
      const lid = parseInt(leagueId);
      try {
        const { data } = await supabase
          .from('weekly_schedules')
          .select('week_number, no_games, movement_week')
          .eq('league_id', lid);
        const weeks = new Map<number, { total: number; noGames: number; anyMovement: boolean }>();
        (data || []).forEach((row: any) => {
          const w = Number(row.week_number || 0);
          if (!weeks.has(w)) weeks.set(w, { total: 0, noGames: 0, anyMovement: false });
          const agg = weeks.get(w)!;
          agg.total += 1;
          if (row.no_games) agg.noGames += 1;
          if (row.movement_week) agg.anyMovement = true;
        });
        const noSet = new Set<number>();
        const mvSet = new Set<number>();
        weeks.forEach((agg, w) => {
          if (agg.total > 0 && agg.noGames === agg.total) noSet.add(w);
          if (agg.anyMovement) mvSet.add(w);
        });
        setNoGameWeeks(noSet);
        setMovementWeeks(mvSet);
      } catch {
        setNoGameWeeks(new Set());
        setMovementWeeks(new Set());
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

  const isEliteFormat = useMemo(() => (scheduleFormat ?? "").includes("elite"), [scheduleFormat]);
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
  const weeklyColumns = useMemo(() => Array.from({ length: Math.max(regularSeasonWeeks, 0) }, (_, i) => i + 1), [regularSeasonWeeks]);
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
      // Elite path is handled by the shared hook — skip local computations
      if (elite.isElite) return;
      try {
        const lid = parseInt(leagueId);
        const { data: scheduleRecord, error: scheduleError } = await supabase
          .from('league_schedules')
          .select('format')
          .eq('league_id', lid)
          .maybeSingle();
        if (!scheduleError) {
          setScheduleFormat(scheduleRecord?.format ?? null);
          // If DB says elite, skip legacy public computation entirely
          const isEliteDb = String(scheduleRecord?.format || '').toLowerCase().includes('elite');
          if (isEliteDb) return;
        }

        const { data: weekRows, error: weeksErr } = await supabase
          .from('weekly_schedules')
          .select('week_number')
          .eq('league_id', lid);

        if (!weeksErr && Array.isArray(weekRows) && weekRows.length > 0) {
          const maxWeek = weekRows.reduce((max, r: any) => Math.max(max, r.week_number || 0), 0);
          setRegularSeasonWeeks(maxWeek);
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
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {isEliteFormat ? (
              <table className="w-full min-w-max table-auto">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg" rowSpan={2}>
                      Ranking
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]" rowSpan={2}>
                      Team
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]" colSpan={weeklyColumns.length}>
                      Week
                    </th>
                    
                  </tr>
                  <tr>
                    {weeklyColumns.map(week => (
                      <th key={`week-${week}`} className={`px-2 py-2 text-center text-sm font-medium ${week < standingsResetWeek || noGameWeeks.has(week) ? 'text-gray-300' : 'text-[#6F6F6F]'} ${movementWeeks.has(week) ? 'bg-yellow-50' : ''}`}>
                        {week}
                      </th>
                    ))}
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
                    return (
                      <tr key={team.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${index === teams.length - 1 ? "last-row" : ""}`}>
                        <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${index === teams.length - 1 ? "rounded-bl-lg" : ""}`}>{avg ? avg.toFixed(2) : (standingsResetWeek <= 1 ? (seedRanks[team.id] ?? '-') : '-')}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                        {weeklyColumns.map(week => {
                          const val = weeklyRanks[team.id]?.[week];
                          const show = weeksWithData.has(week);
                          return (
                            <td key={`week-${team.id}-${week}`} className={`px-4 py-3 text-center text-sm ${week < standingsResetWeek || noGameWeeks.has(week) ? 'text-gray-300' : 'text-[#6F6F6F]'} ${movementWeeks.has(week) ? 'bg-yellow-50' : ''}`}>
                              {show ? (typeof val === 'number' ? val : '-') : '-'}
                            </td>
                          );
                        })}
                        
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-max table-fixed">
                <colgroup>
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "13%" }} />
                  {showDifferentialColumn && (
                    <col style={{ width: "13%" }} />
                  )}
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">#</th>
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
                  {teams.map((team, index) => (
                    <tr key={team.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${index === teams.length - 1 ? "last-row" : ""}`}>
                      <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${index === teams.length - 1 ? "rounded-bl-lg" : ""}`}>{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">{team.wins}</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">{team.losses}</td>
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center bg-red-50">{team.points}</td>
                      {showDifferentialColumn && (
                        <td className={`px-4 py-3 text-sm text-[#6F6F6F] text-center ${index === teams.length - 1 ? "rounded-br-lg" : ""}`}>{team.differential > 0 ? `+${team.differential}` : `${team.differential}`}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
