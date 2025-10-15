import { computeInitialSeedRankingMap, computePrevWeekNameRanksFromNextWeekSchedule } from '../screens/LeagueSchedulePage/utils/rankingUtils';

export type TeamRow = { id: number; name: string };

export type WeeklyScheduleRow = {
  id?: number | null;
  week_number: number;
  tier_number: number;
  format?: string | null;
  no_games?: boolean | null;
  team_a_name?: string | null;
  team_b_name?: string | null;
  team_c_name?: string | null;
  team_d_name?: string | null;
  team_e_name?: string | null;
  team_f_name?: string | null;
  team_a_ranking?: number | null;
  team_b_ranking?: number | null;
  team_c_ranking?: number | null;
  team_d_ranking?: number | null;
  team_e_ranking?: number | null;
  team_f_ranking?: number | null;
};

export type GameResultRow = {
  week_number: number;
  tier_number: number;
  team_name: string | null;
};

export interface EliteStandingsResult {
  seedRanksByTeamId: Record<number, number>;
  weeklyRanksByTeamId: Record<number, Record<number, number>>;
  maxWeek: number;
}

const toKey = (s: string | null | undefined) => (s || '').trim().toLowerCase();

export function computeSeedRanks(
  week1Rows: Array<Pick<WeeklyScheduleRow, 'tier_number' | 'format' | 'team_a_name' | 'team_b_name' | 'team_c_name'>>,
  teams: TeamRow[],
): Record<number, number> {
  const nameToId = new Map<string, number>();
  teams.forEach((t) => nameToId.set(toKey(t.name), t.id));
  const seedMap = computeInitialSeedRankingMap(
    (week1Rows || []).map((r) => ({
      tier_number: r.tier_number,
      format: r.format ?? null,
      team_a_name: r.team_a_name ?? null,
      team_b_name: r.team_b_name ?? null,
      team_c_name: r.team_c_name ?? null,
    })),
  );
  const out: Record<number, number> = {};
  for (const [nm, rk] of seedMap.entries()) {
    const id = nameToId.get(toKey(nm));
    if (id) out[id] = rk;
  }
  return out;
}

export function computePrevWeekRanks(
  nextWeekRows: WeeklyScheduleRow[],
  teams: TeamRow[],
): Record<number, number> {
  const nameToId = new Map<string, number>();
  teams.forEach((t) => nameToId.set(toKey(t.name), t.id));
  const nameRank = computePrevWeekNameRanksFromNextWeekSchedule(nextWeekRows);
  const out: Record<number, number> = {};
  Object.entries(nameRank).forEach(([nm, rk]) => {
    const id = nameToId.get(toKey(nm));
    if (id) out[id] = rk as number;
  });
  return out;
}

export function computeEliteWeeklyRanks(
  weeklySchedules: WeeklyScheduleRow[],
  teams: TeamRow[],
): EliteStandingsResult {
  const maxWeek = (weeklySchedules || []).reduce((m, r: any) => Math.max(m, Number((r as any).week_number || 0)), 0);
  const weeklyRanksByTeamId: Record<number, Record<number, number>> = {};
  const weeks = Array.from(new Set((weeklySchedules || []).map((r) => r.week_number))).sort((a, b) => a - b);

  // Determine which weeks are full no-games (all rows marked no_games)
  const noGameWeeks = new Set<number>();
  {
    const byWeek = new Map<number, { total: number; noGames: number }>();
    (weeklySchedules || []).forEach((r) => {
      const w = Number(r.week_number || 0);
      if (!byWeek.has(w)) byWeek.set(w, { total: 0, noGames: 0 });
      const agg = byWeek.get(w)!;
      agg.total += 1;
      if ((r as any).no_games) agg.noGames += 1;
    });
    byWeek.forEach((agg, w) => {
      if (agg.total > 0 && agg.noGames === agg.total) noGameWeeks.add(w);
    });
  }

  for (const w of weeks) {
    if (w < 2) continue; // week 1 ranks come from seed (week 1 positions) and are filled after movement via week 2 placements
    // Find the last played week before w (skip full no-games weeks)
    let prevWeek = w - 1;
    while (prevWeek >= 1 && noGameWeeks.has(prevWeek)) {
      prevWeek -= 1;
    }
    if (prevWeek < 1) continue;
    const rowsForNext = (weeklySchedules || []).filter((r) => r.week_number === w);
    if (rowsForNext.length === 0) continue;
    const idRanks = computePrevWeekRanks(rowsForNext as WeeklyScheduleRow[], teams);
    // stamp into team-centric map
    Object.entries(idRanks).forEach(([idStr, rk]) => {
      const id = Number(idStr);
      if (!weeklyRanksByTeamId[id]) weeklyRanksByTeamId[id] = {};
      weeklyRanksByTeamId[id][prevWeek] = rk as number;
    });
  }

  // Seed ranks from week 1 schedule
  const seedRanksByTeamId = computeSeedRanks(
    (weeklySchedules || [])
      .filter((r) => r.week_number === 1)
      .map((r) => ({
        tier_number: r.tier_number,
        format: r.format ?? null,
        team_a_name: r.team_a_name ?? null,
        team_b_name: r.team_b_name ?? null,
        team_c_name: r.team_c_name ?? null,
      })),
    teams,
  );

  return { seedRanksByTeamId, weeklyRanksByTeamId, maxWeek };
}

