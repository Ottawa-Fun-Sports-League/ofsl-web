/**
 * Ranking utilities for elite formats
 *
 * Implements initial seeding order for week 1 with the required 2-team elite
 * A/B pairing rule. If a 3-team tier appears between two 2-team elite tiers,
 * its entries are ranked after the paired A/B tiers.
 */

export type Week1Row = {
  tier_number: number;
  format?: string | null;
  team_a_name?: string | null;
  team_b_name?: string | null;
  team_c_name?: string | null;
};

const isTwoTeamElite = (fmt: string | null | undefined): boolean =>
  String(fmt || '').toLowerCase() === '2-teams-elite';

const isThreeTeam = (fmt: string | null | undefined): boolean => {
  const f = String(fmt || '').toLowerCase();
  return f.includes('3-teams');
};

/**
 * Computes ordered team names for initial seed ranking from week 1 rows,
 * honoring the AB-pairing for 2-team elite.
 */
export function computeInitialSeedOrder(week1Rows: Week1Row[]): string[] {
  if (!Array.isArray(week1Rows) || week1Rows.length === 0) return [];

  const rows = [...week1Rows].sort((a, b) => (a.tier_number || 0) - (b.tier_number || 0));

  const pendingElite: Week1Row[] = [];
  const queuedNonElite: Week1Row[] = [];
  const output: string[] = [];

  const flushPair = () => {
    if (pendingElite.length === 2) {
      // First 2-team row then second 2-team row (A,B then A,B)
      for (const r of pendingElite) {
        if (r.team_a_name) output.push(r.team_a_name);
        if (r.team_b_name) output.push(r.team_b_name);
      }
      pendingElite.length = 0;
    }
  };

  const flushQueuedSingles = () => {
    while (queuedNonElite.length > 0) {
      const r = queuedNonElite.shift()!;
      // 3-team rows: A,B,C; otherwise preserve A,B where present
      if (isThreeTeam(r.format)) {
        if (r.team_a_name) output.push(r.team_a_name);
        if (r.team_b_name) output.push(r.team_b_name);
        if (r.team_c_name) output.push(r.team_c_name);
      } else {
        if (r.team_a_name) output.push(r.team_a_name);
        if (r.team_b_name) output.push(r.team_b_name);
      }
    }
  };

  for (const row of rows) {
    if (isTwoTeamElite(row.format)) {
      pendingElite.push(row);
      if (pendingElite.length === 2) {
        flushPair();
        flushQueuedSingles();
      }
    } else {
      // Hold singles until any pending A gets its B partner
      if (pendingElite.length === 1) {
        queuedNonElite.push(row);
      } else {
        // No pending pair, emit now
        if (isThreeTeam(row.format)) {
          if (row.team_a_name) output.push(row.team_a_name);
          if (row.team_b_name) output.push(row.team_b_name);
          if (row.team_c_name) output.push(row.team_c_name);
        } else {
          if (row.team_a_name) output.push(row.team_a_name);
          if (row.team_b_name) output.push(row.team_b_name);
        }
      }
    }
  }

  // Finalize leftovers
  if (pendingElite.length === 1) {
    const r = pendingElite[0];
    if (r.team_a_name) output.push(r.team_a_name);
    if (r.team_b_name) output.push(r.team_b_name);
    pendingElite.length = 0;
  }
  flushQueuedSingles();

  // De-dup and return in order
  const seen = new Set<string>();
  const ordered = output.filter((name) => {
    const key = (name || '').trim();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return ordered;
}

/**
 * Builds a map of team name -> 1-based rank from week 1 rows.
 */
export function computeInitialSeedRankingMap(week1Rows: Week1Row[]): Map<string, number> {
  const order = computeInitialSeedOrder(week1Rows);
  const map = new Map<string, number>();
  let rank = 1;
  for (const name of order) {
    if (!map.has(name)) {
      map.set(name, rank);
      rank += 1;
    }
  }
  return map;
}

// ============================================================================
// Weekly rank calculation from current week results
// ============================================================================

export type WeeklyTierRow = {
  week_number: number;
  tier_number: number;
  format?: string | null;
};

export type WeeklyResultRow = {
  week_number: number;
  tier_number: number;
  team_name: string | null;
  tier_position: number | null;
};

/**
 * Computes name->rank mapping per week based on results of that same week.
 * For elite 2-team formats, pairs of consecutive rows are evaluated together
 * and mapped to ranks [winner(top), winner(bottom), loser(top), loser(bottom)]
 * which correspond to next week's positions (1A-A, 1A-B, 1B-A, 1B-B).
 */
export function computeWeeklyNameRanksFromResults(
  weeklyTiers: WeeklyTierRow[],
  results: WeeklyResultRow[],
): Record<number, Record<string, number>> {
  const byWeek: Record<number, Record<string, number>> = {};
  if (!Array.isArray(weeklyTiers) || weeklyTiers.length === 0) return byWeek;

  const tiersByWeek = new Map<number, WeeklyTierRow[]>();
  weeklyTiers.forEach((row) => {
    const w = Number(row.week_number || 0);
    if (!tiersByWeek.has(w)) tiersByWeek.set(w, []);
    tiersByWeek.get(w)!.push(row);
  });

  const resByWeekTier = new Map<string, WeeklyResultRow[]>();
  results.forEach((r) => {
    const key = `${r.week_number}#${r.tier_number}`;
    if (!resByWeekTier.has(key)) resByWeekTier.set(key, []);
    resByWeekTier.get(key)!.push(r);
  });

  const isTwoElite = (fmt?: string | null) => String(fmt || '').toLowerCase() === '2-teams-elite';

  for (const [week, rows] of tiersByWeek.entries()) {
    const sorted = [...rows].sort((a, b) => (a.tier_number || 0) - (b.tier_number || 0));
    const orderedNames: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      if (isTwoElite(cur.format) && next && isTwoElite(next.format)) {
        // Pair of 2-team elite tiers
        const keyTop = `${week}#${cur.tier_number}`;
        const keyBot = `${week}#${next.tier_number}`;
        const top = (resByWeekTier.get(keyTop) || []).sort((a, b) => (a.tier_position || 0) - (b.tier_position || 0));
        const bot = (resByWeekTier.get(keyBot) || []).sort((a, b) => (a.tier_position || 0) - (b.tier_position || 0));
        const topWinner = top.find(r => (r.tier_position || 0) === 1)?.team_name || top[0]?.team_name || null;
        const topLoser = top.find(r => (r.tier_position || 0) > 1)?.team_name || null;
        const botWinner = bot.find(r => (r.tier_position || 0) === 1)?.team_name || bot[0]?.team_name || null;
        const botLoser = bot.find(r => (r.tier_position || 0) > 1)?.team_name || null;
        if (topWinner) orderedNames.push(topWinner);
        if (botWinner) orderedNames.push(botWinner);
        if (topLoser) orderedNames.push(topLoser);
        if (botLoser) orderedNames.push(botLoser);
        i += 1; // skip the paired next
      } else {
        // Single tier: order by tier_position ascending
        const key = `${week}#${cur.tier_number}`;
        const list = (resByWeekTier.get(key) || []).sort((a, b) => (a.tier_position || 0) - (b.tier_position || 0));
        for (const r of list) {
          if (r.team_name) orderedNames.push(r.team_name);
        }
      }
    }

    // Assign sequential ranks
    const nameRanks: Record<string, number> = {};
    let rank = 1;
    for (const nm of orderedNames) {
      const key = (nm || '').trim();
      if (!key) continue;
      if (nameRanks[key] != null) continue;
      nameRanks[key] = rank++;
    }
    byWeek[week] = nameRanks;
  }

  return byWeek;
}

