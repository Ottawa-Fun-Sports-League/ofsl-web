import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeEliteWeeklyRanks, WeeklyScheduleRow, TeamRow } from './eliteStandings';

export function useEliteStandings(leagueId?: number | string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedRanksByTeamId, setSeed] = useState<Record<number, number>>({});
  const [weeklyRanksByTeamId, setWeekly] = useState<Record<number, Record<number, number>>>({});
  const [maxWeek, setMaxWeek] = useState(0);
  const [isElite, setIsElite] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (!leagueId) return;
      setLoading(true); setError(null);
      try {
        const lid = typeof leagueId === 'string' ? parseInt(leagueId) : leagueId;
        const { data: weekRows } = await supabase
          .from('weekly_schedules')
          .select('id,week_number,tier_number,format,team_a_name,team_b_name,team_c_name,team_d_name,team_e_name,team_f_name,team_a_ranking,team_b_ranking,team_c_ranking,team_d_ranking,team_e_ranking,team_f_ranking')
          .eq('league_id', lid)
          .order('week_number', { ascending: true })
          .order('tier_number', { ascending: true });

        const { data: teamRows } = await supabase
          .from('teams')
          .select('id,name')
          .eq('league_id', lid)
          .eq('active', true);

        const elitePresent = Array.isArray(weekRows) && (weekRows as any[]).some(r => {
          const fmt = String((r as any).format || '').toLowerCase();
          return (
            fmt.includes('2-teams-elite') ||
            fmt.includes('3-teams-elite-6-sets') ||
            fmt.includes('3-teams-elite-9-sets')
          );
        });
        setIsElite(elitePresent);

        const { seedRanksByTeamId, weeklyRanksByTeamId, maxWeek } = computeEliteWeeklyRanks((weekRows || []) as WeeklyScheduleRow[], (teamRows || []) as TeamRow[]);
        try {
          // Dev aid: quick summary to verify population
          // eslint-disable-next-line no-console
          console.info('[EliteStandings] seed count:', Object.keys(seedRanksByTeamId || {}).length, 'maxWeek:', maxWeek);
          // eslint-disable-next-line no-console
          console.info('[EliteStandings] weekly weeks present:', Array.from(new Set(Object.values(weeklyRanksByTeamId || {}).flatMap(m => Object.keys(m).map(Number)))).sort((a,b)=>a-b));
        } catch {}
        // Merge in results-based ranks as fallback for any week without next-week placements
        try {
          const { data: resultRows } = await supabase
            .from('game_results')
            .select('team_name, week_number, tier_number, tier_position')
            .eq('league_id', lid);
          if (Array.isArray(resultRows)) {
            const { computeWeeklyNameRanksFromResults } = await import('../screens/LeagueSchedulePage/utils/rankingUtils');
            const nameRanksByWeek = computeWeeklyNameRanksFromResults(
              ((weekRows || []) as WeeklyScheduleRow[]).map(r => ({ id: r.id ?? null, week_number: r.week_number, tier_number: r.tier_number, format: r.format })) as any,
              (resultRows as any),
            );
            const nameToId = new Map<string, number>();
            (teamRows || []).forEach((t: any) => nameToId.set(String((t as any).name || '').toLowerCase(), (t as any).id));
            const merged: Record<number, Record<number, number>> = { ...(weeklyRanksByTeamId || {}) };
            Object.keys(nameRanksByWeek || {}).map(Number).forEach((w) => {
              const nameMap = (nameRanksByWeek as any)[w] || {};
              const idMap: Record<number, number> = {};
              Object.entries(nameMap).forEach(([nm, rk]) => {
                const id = nameToId.get(String(nm || '').toLowerCase());
                if (id) idMap[id] = rk as number;
              });
              const existing = merged || {};
              const cur = existing as Record<number, Record<number, number>>;
              // Only backfill if week has no ranks yet
              const hasWeek = Object.values(cur).some(m => m && typeof m[w] === 'number');
              if (!hasWeek && Object.keys(idMap).length > 0) {
                Object.entries(idMap).forEach(([idStr, rk]) => {
                  const id = Number(idStr);
                  if (!cur[id]) cur[id] = {} as Record<number, number>;
                  cur[id][w] = rk as number;
                });
              }
            });
            // Replace with merged
            if (Object.keys(merged).length > 0) {
              setWeekly(merged);
            } else if (weeklyRanksByTeamId && Object.keys(weeklyRanksByTeamId).length > 0) {
              setWeekly(weeklyRanksByTeamId);
            }
          } else if (weeklyRanksByTeamId && Object.keys(weeklyRanksByTeamId).length > 0) {
            setWeekly(weeklyRanksByTeamId);
          }
        } catch {
          if (weeklyRanksByTeamId && Object.keys(weeklyRanksByTeamId).length > 0) setWeekly(weeklyRanksByTeamId);
        }
        if (seedRanksByTeamId && Object.keys(seedRanksByTeamId).length > 0) {
          setSeed(seedRanksByTeamId);
        }
        if (maxWeek && maxWeek > 0) {
          setMaxWeek(maxWeek);
        }
        // If we still have no weekly ranks but we do have elite & seeds, retry once after a short delay
        const weeklyHasData = Object.values(weeklyRanksByTeamId || {}).some(w => Object.keys(w || {}).length > 0);
        if (elitePresent && (Object.keys(seedRanksByTeamId || {}).length > 0) && !weeklyHasData && retry < 2) {
          setTimeout(() => setRetry(r => r + 1), 1200);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load elite standings');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [leagueId, retry]);

  return useMemo(() => ({ loading, error, seedRanksByTeamId, weeklyRanksByTeamId, maxWeek, isElite }), [loading, error, seedRanksByTeamId, weeklyRanksByTeamId, maxWeek, isElite]);
}
