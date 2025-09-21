import { Card, CardContent } from "../../../components/ui/card";
import { useLeagueStandings } from "../hooks/useLeagueStandings";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface LeagueStandingsProps {
  leagueId: string | undefined;
}

export function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const { teams, loading, error, hasSchedule } = useLeagueStandings(leagueId);
  const formatDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const [scheduleFormat, setScheduleFormat] = useState<string | null>(null);
  const [regularSeasonWeeks, setRegularSeasonWeeks] = useState<number>(0);

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
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] rounded-tr-lg" rowSpan={2}>
                      +/-
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
                  {teams.map((team, index) => (
                    <tr key={team.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${index === teams.length - 1 ? "last-row" : ""}`}>
                      <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${index === teams.length - 1 ? "rounded-bl-lg" : ""}`}>{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                      {weeklyColumns.map(week => (
                        <td key={`week-${team.id}-${week}`} className="px-4 py-3 text-center text-sm text-[#6F6F6F]">-</td>
                      ))}
                      <td className={`px-4 py-3 text-center ${index === teams.length - 1 ? "rounded-br-lg" : ""}`}>
                        <span className="text-sm font-medium text-[#6F6F6F]">{formatDiff(team.differential as number)}</span>
                      </td>
                    </tr>
                  ))}
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
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] bg-red-50">Points</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] rounded-tr-lg">+/-</th>
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
                      <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center bg-red-50">{team.points}</td>
                      <td className={`px-4 py-3 text-sm text-[#6F6F6F] text-center ${index === teams.length - 1 ? "rounded-br-lg" : ""}`}>{formatDiff(team.differential as number)}</td>
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
