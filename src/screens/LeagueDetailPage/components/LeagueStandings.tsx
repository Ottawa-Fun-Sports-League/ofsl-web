import { Card, CardContent } from "../../../components/ui/card";
import { useLeagueStandings } from "../hooks/useLeagueStandings";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { computeInitialSeedRankingMap } from "../../LeagueSchedulePage/utils/rankingUtils";

interface LeagueStandingsProps {
  leagueId: string | undefined;
}

export function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const { teams, loading, error, hasSchedule } = useLeagueStandings(leagueId);
  const formatDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const [scheduleFormat, setScheduleFormat] = useState<string | null>(null);
  const [regularSeasonWeeks, setRegularSeasonWeeks] = useState<number>(0);
  const [weeklyRanks, setWeeklyRanks] = useState<Record<number, Record<number, number>>>({}); // teamId -> { week -> rank }
  const [seedRanks, setSeedRanks] = useState<Record<number, number>>({}); // teamId -> initial rank from Week 1 schedule

  const isEliteFormat = useMemo(() => (scheduleFormat ?? "").includes("elite"), [scheduleFormat]);
  const isSixTeamsFormat = useMemo(() => {
    const fmt = (scheduleFormat ?? "").toLowerCase();
    return fmt.includes('6-teams') || fmt.includes('6 teams') || fmt === '6-teams-head-to-head';
  }, [scheduleFormat]);
  const weeklyColumns = useMemo(() => Array.from({ length: Math.max(regularSeasonWeeks, 0) }, (_, i) => i + 1), [regularSeasonWeeks]);

  useEffect(() => {
    const loadFormatAndWeeks = async () => {
      if (!leagueId) return;
      try {
        const lid = parseInt(leagueId);
        const { data: scheduleRecord, error: scheduleError } = await supabase
          .from('league_schedules')
          .select('format')
          .eq('league_id', lid)
          .maybeSingle();
        if (!scheduleError) {
          setScheduleFormat(scheduleRecord?.format ?? null);
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
              .select('week_number,tier_number,format,team_a_name,team_b_name,team_c_name,team_d_name,team_e_name,team_f_name')
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
            for (const w of allWeeks) {
              const prevWeek = (w || 0) - 1;
              if (prevWeek < 1) continue;
              const rows = (nextWeekTiers || []).filter((r: any) => r.week_number === w).sort((a: any, b: any) => (a.tier_number||0)-(b.tier_number||0));
              let rank = 1;
              const idMap: Record<number, number> = {};
              for (const row of rows) {
                const order = ['team_a_name','team_b_name','team_c_name','team_d_name','team_e_name','team_f_name'];
                for (const key of order) {
                  const nm = (row as any)[key] as string | null | undefined;
                  if (!nm) continue;
                  const id = nameToId.get((nm || '').toLowerCase());
                  if (id && !idMap[id]) { idMap[id] = rank; rank += 1; }
                }
              }
              if (Object.keys(idMap).length > 0) byWeek[prevWeek] = idMap;
            }
            // Fill gaps using current-week results if no next-week placements yet
            const { data: resultRows } = await supabase
              .from('game_results')
              .select('team_name, week_number, tier_number, tier_position')
              .eq('league_id', lid);
            const { computeWeeklyNameRanksFromResults } = await import('../../LeagueSchedulePage/utils/rankingUtils');
            const nameRanksByWeek = computeWeeklyNameRanksFromResults(
              (nextWeekTiers || []).map((r: any) => ({ week_number: r.week_number, tier_number: r.tier_number, format: r.format })),
              (resultRows || []) as any,
            );
            for (const w of Object.keys(nameRanksByWeek).map(Number)) {
              if (byWeek[w]) continue; // already have placements derived
              const nameMap = nameRanksByWeek[w] || {};
              const idMap: Record<number, number> = {};
              Object.entries(nameMap).forEach(([nm, rk]) => {
                const id = nameToId.get((nm || '').toLowerCase());
                if (id) idMap[id] = rk as number;
              });
              if (Object.keys(idMap).length > 0) byWeek[w] = idMap;
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
  }, [leagueId]);
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

      {/* Note about standings */}
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
                      <th key={`week-${week}`} className="px-2 py-2 text-center text-sm font-medium text-[#6F6F6F]">
                        {week}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...teams].sort((a, b) => {
                    const aVals = weeklyColumns.map(week => weeklyRanks[a.id]?.[week]).filter((v): v is number => typeof v === 'number');
                    const bVals = weeklyColumns.map(week => weeklyRanks[b.id]?.[week]).filter((v): v is number => typeof v === 'number');
                    const aAvg = aVals.length ? (aVals.reduce((x,y)=>x+y,0) / aVals.length) : (seedRanks[a.id] ?? Number.POSITIVE_INFINITY);
                    const bAvg = bVals.length ? (bVals.reduce((x,y)=>x+y,0) / bVals.length) : (seedRanks[b.id] ?? Number.POSITIVE_INFINITY);
                    if (aAvg !== bAvg) return aAvg - bAvg;
                    return (a.name || '').localeCompare(b.name || '');
                  }).map((team, index) => {
                    const played = weeklyColumns.map(week => weeklyRanks[team.id]?.[week]).filter((v): v is number => typeof v === 'number');
                    const avg = played.length ? (played.reduce((a,b)=>a+b,0) / played.length) : null;
                    return (
                      <tr key={team.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${index === teams.length - 1 ? "last-row" : ""}`}>
                        <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${index === teams.length - 1 ? "rounded-bl-lg" : ""}`}>{avg ? avg.toFixed(2) : (seedRanks[team.id] ?? '-')}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                        {weeklyColumns.map(week => (
                          <td key={`week-${team.id}-${week}`} className="px-4 py-3 text-center text-sm text-[#6F6F6F]">{weeklyRanks[team.id]?.[week] ?? '-'}</td>
                        ))}
                        
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-max table-fixed">
                <colgroup>
                  <col style={{ width: "10%" }} />
                  <col style={{ width: isSixTeamsFormat ? "50%" : "40%" }} />
                  {!isSixTeamsFormat && <col style={{ width: "12%" }} />}
                  {!isSixTeamsFormat && <col style={{ width: "12%" }} />}
                  <col style={{ width: isSixTeamsFormat ? "20%" : "13%" }} />
                  <col style={{ width: isSixTeamsFormat ? "20%" : "13%" }} />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">Team</th>
                    {!isSixTeamsFormat && (
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">Wins</th>
                    )}
                    {!isSixTeamsFormat && (
                      <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">Losses</th>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] bg-red-50 rounded-tr-lg">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teams.map((team, index) => (
                    <tr key={team.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${index === teams.length - 1 ? "last-row" : ""}`}>
                      <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${index === teams.length - 1 ? "rounded-bl-lg" : ""}`}>{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                      {!isSixTeamsFormat && (
                        <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">{team.wins}</td>
                      )}
                      {!isSixTeamsFormat && (
                        <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">{team.losses}</td>
                      )}
                      <td className={`px-4 py-3 text-sm text-[#6F6F6F] text-center bg-red-50 ${index === teams.length - 1 ? "rounded-br-lg" : ""}`}>{team.points}</td>
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
