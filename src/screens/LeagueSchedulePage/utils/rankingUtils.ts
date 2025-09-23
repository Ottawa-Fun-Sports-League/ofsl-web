import { buildWeekTierLabels, getTeamCountForFormat } from './formatUtils';

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
    const enriched = rows.map((row, idx) => ({ ...row, __id: (((row as { id?: number }).id) ?? (idx + 1)) as number }));
    const labelMap = buildWeekTierLabels(enriched.map(row => ({ id: row.__id, tier_number: row.tier_number, format: String(row.format || '') })));
    const orderIndex = (row: typeof enriched[number]) => {
      const label = labelMap.get(row.__id);
      if (!label) return Number.MAX_SAFE_INTEGER;
      const match = /^([0-9]+)([A|B])?$/.exec(label);
      if (!match) return Number.MAX_SAFE_INTEGER;
      const tierNum = Number(match[1]);
      const suffix = match[2] || '';
      if (suffix === 'A') return tierNum * 10 + 1;
      if (suffix === 'B') return tierNum * 10 + 2;
      return tierNum * 10;
    };

    const sorted = [...enriched].sort((a, b) => orderIndex(a) - orderIndex(b));
    const orderedSlots: Array<string | null> = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const curLabel = labelMap.get(cur.__id) || '';
      const nextLabel = next ? (labelMap.get(next.__id) || '') : '';
      const sameBlock = curLabel && nextLabel && curLabel.replace(/[AB]/, '') === nextLabel.replace(/[AB]/, '');
      if (isTwoElite(cur.format) && next && isTwoElite(next.format) && sameBlock) {
        // Pair of 2-team elite tiers
        const keyTop = `${week}#${cur.tier_number}`;
        const keyBot = `${week}#${next.tier_number}`;
        const top = (resByWeekTier.get(keyTop) || []).sort((a, b) => (a.tier_position || 0) - (b.tier_position || 0));
        const bot = (resByWeekTier.get(keyBot) || []).sort((a, b) => (a.tier_position || 0) - (b.tier_position || 0));

        // Build four slots: [topWinner, botWinner, topLoser, botLoser]
        const winnerOf = (list: WeeklyResultRow[]) => (list.find(r => (r.tier_position || 0) === 1)?.team_name || list[0]?.team_name || null);
        const loserOf = (list: WeeklyResultRow[]) => (list.find(r => (r.tier_position || 0) > 1)?.team_name || null);

        const topWinner = winnerOf(top) || null;
        const topLoser = loserOf(top) || null;
        const botWinner = winnerOf(bot) || null;
        const botLoser = loserOf(bot) || null;

        orderedSlots.push(topWinner);
        orderedSlots.push(botWinner);
        orderedSlots.push(topLoser);
        orderedSlots.push(botLoser);
        i += 1; // skip the paired next
      } else {
        // Single tier: order by tier_position ascending
        const key = `${week}#${cur.tier_number}`;
        const list = (resByWeekTier.get(key) || []).sort((a, b) => (a.tier_position || 0) - (b.tier_position || 0));
        const expected = getTeamCountForFormat(String(cur.format || '3-teams-6-sets'));
        for (let slot = 0; slot < expected; slot++) {
          const r = list[slot];
          orderedSlots.push(r?.team_name ?? null);
        }
      }
    }

    try {
      // Debug: log ordering used for weekly ranks
      // eslint-disable-next-line no-console
      console.info('[Weekly order]', { week, orderedNames: [...orderedNames] });
    } catch {/* ignore logging issues */}

    // Assign sequential ranks; reserve slots for nulls
    const nameRanks: Record<string, number> = {};
    let rank = 1;
    for (const nm of orderedSlots) {
      const key = (nm || '').trim();
      if (key && nameRanks[key] == null) {
        nameRanks[key] = rank;
      }
      rank += 1;
    }
    byWeek[week] = nameRanks;
  }

  return byWeek;
}

// ============================================================================
// Name->rank mapping from next week's placements (for previous week's rank)
// ============================================================================

export type NextWeekRow = {
  id?: number | null;
  tier_number: number;
  format?: string | null;
  team_a_name?: string | null;
  team_b_name?: string | null;
  team_c_name?: string | null;
  team_d_name?: string | null;
  team_e_name?: string | null;
  team_f_name?: string | null;
};

/**
 * Given rows from weekly_schedules for week W+1, compute the global name->rank
 * for week W by enumerating the next week's placements in tier label order.
 */
export function computePrevWeekNameRanksFromNextWeekSchedule(
  nextWeekRows: NextWeekRow[],
): Record<string, number> {
  if (!Array.isArray(nextWeekRows) || nextWeekRows.length === 0) return {};

  const enriched = nextWeekRows.map((row, idx) => ({ ...row, __id: ((row.id ?? (idx + 1)) as number) } as (NextWeekRow & { __id: number } )));
  const labelMap = buildWeekTierLabels(
    enriched.map((r) => ({ id: r.__id, tier_number: r.tier_number, format: String(r.format || '') })),
  );

  // Build lookup: label -> row
  const byLabel = new Map<string, typeof enriched[number]>();
  let maxBase = 0;
  for (const r of enriched) {
    const label = labelMap.get(r.__id);
    if (!label) continue;
    byLabel.set(label, r);
    const m = /^([0-9]+)([A|B])?$/.exec(label);
    if (m) maxBase = Math.max(maxBase, Number(m[1]));
  }

  const positionsAll = ['team_a_name','team_b_name','team_c_name','team_d_name','team_e_name','team_f_name'] as const;
  const seen = new Set<string>();
  const map: Record<string, number> = {};
  let rank = 1;
  const overrides: Record<string, number> = {};
  // Collect explicit ranking overrides if present (do not return yet; we'll merge with base order)
  for (const row of enriched) {
    for (const p of positionsAll) {
      const nm = (row as unknown as any)[p] as string | null | undefined;
      const rkField = (p.replace('_name', '_ranking')) as keyof any;
      const rkVal = (row as unknown as any)[rkField] as number | null | undefined;
      if (!nm) continue;
      const name = (nm || '').trim();
      if (!name) continue;
      if (typeof rkVal === 'number' && rkVal > 0) {
        overrides[name] = rkVal;
      }
    }
  }

  const addRow = (row: (typeof enriched[number]) | undefined, expectedCount: number): void => {
    if (!row) {
      // Entire row missing, reserve all expected slots
      rank += expectedCount;
      return;
    }
    // Determine ordered subset of positions based on expectedCount
    const rowPositions = positionsAll.slice(0, Math.max(0, Math.min(expectedCount, positionsAll.length)));
    for (const pos of rowPositions) {
      const raw = (row as any)[pos] as string | null | undefined;
      const nm = raw ? String(raw).trim() : '';
      if (!nm) {
        // Reserve slot even if no name yet, to keep global numbering stable
        rank += 1;
        continue;
      }
      const key = nm.toLowerCase();
      if (!seen.has(key)) {
        map[nm] = rank;
        seen.add(key);
      }
      // Whether duplicate or not, advance rank to next slot
      rank += 1;
    }
  };

  // Iterate bases in order; for elite 2-team tiers ensure A then B sequence,
  // inserting phantom slots for a missing pair to keep global ranks consistent.
  const baseMap: Record<string, number> = {};
  for (let base = 1; base <= maxBase; base++) {
    const lblA = `${base}A`;
    const lblB = `${base}B`;
    const lblSingle = `${base}`;
    const hasA = byLabel.has(lblA);
    const hasB = byLabel.has(lblB);
    const hasSingle = byLabel.has(lblSingle);

    if (hasA || hasB) {
      // 2-team elite base — always reserve slots in position order
      const rowA = byLabel.get(lblA);
      const fmtA = rowA?.format ? String(rowA.format) : '2-teams-elite';
      const expectedA = Math.max(2, getTeamCountForFormat(fmtA));
      addRow(rowA, expectedA);

      if (hasB) {
        const rowB = byLabel.get(lblB);
        const fmtB = rowB?.format ? String(rowB.format) : fmtA;
        const expectedB = Math.max(2, getTeamCountForFormat(fmtB));
        addRow(rowB, expectedB);
      } else {
        // Missing partner row entirely: reserve full expected team slots (A,B)
        rank += Math.max(2, getTeamCountForFormat('2-teams-elite'));
      }
    }
    if (hasSingle) {
      // Non-elite format occupying this base — reserve slots in position order
      const row = byLabel.get(lblSingle);
      const fmt = row?.format ? String(row.format) : '';
      const expected = getTeamCountForFormat(fmt || '3-teams-6-sets');
      addRow(row, expected);
    }
  }
  // Capture the base enumeration map before overrides
  for (const [name, r] of Object.entries({ ...map })) {
    baseMap[name] = r;
  }
  // Merge overrides, preferring explicit ranks where provided
  const finalMap: Record<string, number> = { ...baseMap };
  Object.entries(overrides).forEach(([name, r]) => { finalMap[name] = r; });
  return finalMap;
}
