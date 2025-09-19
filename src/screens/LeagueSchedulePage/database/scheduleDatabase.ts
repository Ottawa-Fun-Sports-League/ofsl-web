/**
 * Schedule Database Layer
 * 
 * Standardized database operations for all schedule-related functionality.
 * This layer provides consistent error handling, type safety, and performance
 * optimization for all schedule database interactions.
 */

import { supabase } from '../../../lib/supabase';
import { getPositionsForFormat } from '../utils/formatUtils';
import type { 
  WeeklyScheduleTier, 
  TierUpdatePayload, 
  BatchTierUpdate,
  AvailableTeam,
  LeagueScheduleConfig,
  GameFormatId,
  TeamPositionId
} from '../types';

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

export class ScheduleDatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string,
    public hint?: string
  ) {
    super(message);
    this.name = 'ScheduleDatabaseError';
  }
}

function handleDatabaseError(error: unknown): never {
  console.error('Schedule database error:', error);
  
  const dbError = new ScheduleDatabaseError(
    (error as Error).message || 'Unknown database error',
    (error as { code?: string }).code,
    (error as { details?: string }).details,
    (error as { hint?: string }).hint
  );
  
  throw dbError;
}

// =============================================================================
// WEEKLY SCHEDULE OPERATIONS
// =============================================================================

/**
 * Fetches weekly schedule data for a specific league and week
 */
export async function getWeeklySchedule(
  leagueId: number, 
  weekNumber: number
): Promise<WeeklyScheduleTier[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('*')
      .eq('league_id', leagueId)
      .eq('week_number', weekNumber)
      .order('tier_number', { ascending: true });

    if (error) handleDatabaseError(error);
    return data || [];
  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Fetches schedule data for multiple weeks
 */
export async function getScheduleRange(
  leagueId: number,
  startWeek: number,
  endWeek: number
): Promise<WeeklyScheduleTier[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('*')
      .eq('league_id', leagueId)
      .gte('week_number', startWeek)
      .lte('week_number', endWeek)
      .order('week_number', { ascending: true })
      .order('tier_number', { ascending: true });

    if (error) handleDatabaseError(error);
    return data || [];
  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Gets the complete schedule structure for Week 1 (template for future weeks)
 */
export async function getWeek1Structure(leagueId: number): Promise<WeeklyScheduleTier[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('*')
      .eq('league_id', leagueId)
      .eq('week_number', 1)
      .order('tier_number', { ascending: true });

    if (error) handleDatabaseError(error);
    return data || [];
  } catch (error) {
    handleDatabaseError(error);
  }
}

// =============================================================================
// TIER MANAGEMENT OPERATIONS
// =============================================================================

/**
 * Updates a single tier with new data
 */
export async function updateTier(
  tierId: number,
  updates: TierUpdatePayload
): Promise<WeeklyScheduleTier> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('weekly_schedules')
      .update(updateData)
      .eq('id', tierId)
      .select()
      .single();

    if (error) handleDatabaseError(error);
    return data;
  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Performs batch update for current week + future weeks (for format changes)
 */
export async function batchUpdateTier(update: BatchTierUpdate): Promise<void> {
  try {
    // Update current week with full data
    await updateTier(update.currentWeekUpdate.id, update.currentWeekUpdate);

    // Update future weeks if specified
    if (update.futureWeeksUpdate) {
      const { payload, where } = update.futureWeeksUpdate;
      
      const { error } = await supabase
        .from('weekly_schedules')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('league_id', where.league_id)
        .eq('tier_number', where.tier_number)
        .gt('week_number', where.week_number_gt);

      if (error) handleDatabaseError(error);
    }
  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Adds a new tier to all weeks from current week onwards
 */
export async function addTierToAllWeeks(
  leagueId: number,
  currentWeek: number,
  afterTierNumber: number,
  tierTemplate: Partial<WeeklyScheduleTier>
): Promise<void> {
  try {
    // Use manual path so we can preserve and apply the desired format (e.g., 2-teams-elite) for the new tier.
    // The RPC version defaults format to '3-teams-6-sets' and cannot accept a custom format parameter.
    await addTierManually(leagueId, currentWeek, afterTierNumber, tierTemplate);
  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Removes a tier from all weeks from current week onwards
 */
export async function removeTierFromAllWeeks(
  leagueId: number,
  currentWeek: number,
  tierNumber: number
): Promise<void> {
  try {
    // Simple approach: Delete target tier first, then shift remaining tiers
    
    // Step 1: Delete the target tier from all weeks
    const { error: deleteError } = await supabase
      .from('weekly_schedules')
      .delete()
      .eq('league_id', leagueId)
      .gte('week_number', currentWeek)
      .eq('tier_number', tierNumber);

    if (deleteError) handleDatabaseError(deleteError);

    // Step 2: Get all higher tier numbers that need to be shifted down
    const { data: tiersToShift, error: selectError } = await supabase
      .from('weekly_schedules')
      .select('id, tier_number')
      .eq('league_id', leagueId)
      .gte('week_number', currentWeek)
      .gt('tier_number', tierNumber)
      .order('tier_number', { ascending: true });

    if (selectError) handleDatabaseError(selectError);

    // Step 3: Batch update all tiers that need shifting
    if (tiersToShift && tiersToShift.length > 0) {
      // Group tiers by their new tier number for batch updates
      const updateGroups = new Map<number, number[]>();
      
      tiersToShift.forEach(tier => {
        const newTierNumber = tier.tier_number - 1;
        if (!updateGroups.has(newTierNumber)) {
          updateGroups.set(newTierNumber, []);
        }
        updateGroups.get(newTierNumber)!.push(tier.id);
      });

      // Perform batch updates for each tier number group
      for (const [newTierNumber, tierIds] of updateGroups) {
        const { error: batchUpdateError } = await supabase
          .from('weekly_schedules')
          .update({ tier_number: newTierNumber })
          .in('id', tierIds);

        if (batchUpdateError) handleDatabaseError(batchUpdateError);
      }
    }

  } catch (error) {
    handleDatabaseError(error);
  }
}

// =============================================================================
// TEAM MANAGEMENT OPERATIONS
// =============================================================================

/**
 * Assigns a team to a specific tier position
 */
export async function assignTeamToPosition(
  tierId: number,
  position: TeamPositionId,
  teamName: string,
  teamRanking: number
): Promise<WeeklyScheduleTier> {
  const updates: TierUpdatePayload = {
    [`team_${position.toLowerCase()}_name`]: teamName,
    [`team_${position.toLowerCase()}_ranking`]: teamRanking
  };

  return updateTier(tierId, updates);
}

/**
 * Removes a team from a specific position
 */
export async function removeTeamFromPosition(
  tierId: number,
  position: TeamPositionId
): Promise<WeeklyScheduleTier> {
  const updates: TierUpdatePayload = {
    [`team_${position.toLowerCase()}_name`]: null,
    [`team_${position.toLowerCase()}_ranking`]: null
  };

  return updateTier(tierId, updates);
}

/**
 * Moves a team from one position to another (can be different tiers)
 */
export async function moveTeam(
  fromTierId: number,
  fromPosition: TeamPositionId,
  toTierId: number,
  toPosition: TeamPositionId
): Promise<void> {
  try {
    // Get team data from source position
    const { data: sourceTier, error: sourceError } = await supabase
      .from('weekly_schedules')
      .select(`team_${fromPosition.toLowerCase()}_name, team_${fromPosition.toLowerCase()}_ranking`)
      .eq('id', fromTierId)
      .single();

    if (sourceError) handleDatabaseError(sourceError);

    const teamName = (sourceTier as unknown as Record<string, string | number | null>)[`team_${fromPosition.toLowerCase()}_name`];
    const teamRanking = (sourceTier as unknown as Record<string, string | number | null>)[`team_${fromPosition.toLowerCase()}_ranking`];

    if (!teamName) {
      throw new ScheduleDatabaseError('No team found at source position');
    }

    // Check if target position is empty
    const { data: targetTier, error: targetError } = await supabase
      .from('weekly_schedules')
      .select(`team_${toPosition.toLowerCase()}_name`)
      .eq('id', toTierId)
      .single();

    if (targetError) handleDatabaseError(targetError);

    if ((targetTier as unknown as Record<string, string | number | null>)[`team_${toPosition.toLowerCase()}_name`]) {
      throw new ScheduleDatabaseError('Target position is already occupied');
    }

    // Perform the move in a transaction-like manner
    // First, clear the source position
    await removeTeamFromPosition(fromTierId, fromPosition);
    
    // Then, assign to target position
    await assignTeamToPosition(toTierId, toPosition, teamName as string, teamRanking as number);

  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Applies three-team (A/B/C) tier movement to the following week's schedule
 * - Winner: moves up one tier to position C (or stays in Tier 1 at A)
 * - Neutral: stays in the same tier at position B
 * - Loser: moves down one tier to position A (or stays in bottom tier at C)
 */
export async function applyThreeTeamTierMovementNextWeek(params: {
  leagueId: number;
  currentWeek: number;
  tierNumber: number;
  isTopTier: boolean;
  isBottomTier: boolean;
  teamNames: { A: string; B: string; C: string };
  sortedKeys: Array<'A' | 'B' | 'C'>; // sorted best->worst by this week's results
}): Promise<void> {
  const { leagueId, currentWeek, tierNumber, isTopTier, isBottomTier, teamNames, sortedKeys } = params;
  const nextWeek = (currentWeek || 0) + 1;
  if (!leagueId || !nextWeek || !tierNumber) return;

  // Find next playable destination week (skip any full no-games stretches)
  const destWeek = await getNextPlayableWeek(leagueId, nextWeek);

  // destWeek chosen via getNextPlayableWeek

  // Determine adjacent tier formats for current week to adjust cross-format movement
  let aboveFormat: string | null = null;
  let belowFormat: string | null = null;
  try {
    const tiersToCheck = [tierNumber - 1, tierNumber + 1].filter(n => n >= 1);
    if (tiersToCheck.length > 0) {
      const { data: adj } = await supabase
        .from('weekly_schedules')
        .select('tier_number, format')
        .eq('league_id', leagueId)
        .eq('week_number', currentWeek)
        .in('tier_number', tiersToCheck as number[]);
      (adj || []).forEach((row: any) => {
        if (row.tier_number === tierNumber - 1) aboveFormat = row.format || null;
        if (row.tier_number === tierNumber + 1) belowFormat = row.format || null;
      });
    }
  } catch {/* ignore format checks */}

  // Determine target assignments based on movement rules
  const winnerKey = sortedKeys[0];
  const neutralKey = sortedKeys[1];
  const loserKey = sortedKeys[2];

  type Pos = TeamPositionId;
  const assignments: Array<{ name: string; targetTier: number; targetPos: Pos }> = [];

  // Winner
  if (teamNames[winnerKey]) {
    if (isTopTier) {
      // Stay in same tier at A to preserve existing rotation behavior
      assignments.push({ name: teamNames[winnerKey], targetTier: tierNumber, targetPos: 'A' });
    } else {
      const targetTier = Math.max(1, tierNumber - 1);
      const pos = aboveFormat ? getPositionsForFormat(aboveFormat) : ['A','B','C'];
      const highest = pos[pos.length - 1] as TeamPositionId;
      assignments.push({ name: teamNames[winnerKey], targetTier, targetPos: highest });
    }
  }
  // Neutral: keep in same tier at middle where applicable (for 3-team, 'B')
  if (teamNames[neutralKey]) {
    let middle: TeamPositionId = 'B';
    try {
      const { data: cur } = await supabase
        .from('weekly_schedules')
        .select('format')
        .eq('league_id', leagueId)
        .eq('week_number', currentWeek)
        .eq('tier_number', tierNumber)
        .maybeSingle();
      const fmt = (cur as any)?.format as string | undefined;
      if (fmt) {
        const positions = getPositionsForFormat(fmt);
        middle = positions[Math.floor(positions.length / 2)] as TeamPositionId;
      }
    } catch {/* ignore; default 'B' */}
    assignments.push({ name: teamNames[neutralKey], targetTier: tierNumber, targetPos: middle });
  }
  // Loser
  if (teamNames[loserKey]) {
    if (isBottomTier) {
      // Stay in same tier; keep existing convention to place at C
      assignments.push({ name: teamNames[loserKey], targetTier: tierNumber, targetPos: 'C' });
    } else {
      const pos = belowFormat ? getPositionsForFormat(belowFormat) : ['A','B','C'];
      const lowest = pos[0] as TeamPositionId;
      assignments.push({ name: teamNames[loserKey], targetTier: tierNumber + 1, targetPos: lowest });
    }
  }

  // Fetch next week's relevant tiers (current, +/- 1) to minimize updates
  const tierNumbersToFetch = Array.from(new Set(assignments.map(a => a.targetTier).concat([tierNumber, tierNumber - 1, tierNumber + 1]).filter(n => n >= 1)));

  let { data: nextWeekRows, error: fetchErr } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek)
    .in('tier_number', tierNumbersToFetch as number[]);
  if (fetchErr) handleDatabaseError(fetchErr);

  const rowsByTier = new Map<number, any>();
  (nextWeekRows || []).forEach((row: any) => rowsByTier.set(row.tier_number, row));

  // Ensure next week rows exist for all target tiers; create from current week's template if missing
  const missingTiers = assignments
    .map(a => a.targetTier)
    .filter(t => !rowsByTier.has(t));
  if (missingTiers.length > 0) {
    // Try to fetch current week templates for those tier numbers
    const { data: currentWeekTemplates } = await supabase
      .from('weekly_schedules')
      .select('tier_number, location, time_slot, court, format')
      .eq('league_id', leagueId)
      .eq('week_number', currentWeek)
      .in('tier_number', missingTiers as number[]);

    const tmplByTier = new Map<number, any>();
    (currentWeekTemplates || []).forEach((r: any) => tmplByTier.set(r.tier_number, r));

    const inserts = missingTiers.map((t) => {
      const tmpl = tmplByTier.get(t);
      return {
        league_id: leagueId,
        week_number: destWeek,
        tier_number: t,
        location: tmpl?.location || 'TBD',
        time_slot: tmpl?.time_slot || 'TBD',
        court: tmpl?.court || 'TBD',
        format: tmpl?.format || '3-teams-6-sets',
        team_a_name: null,
        team_a_ranking: null,
        team_b_name: null,
        team_b_ranking: null,
        team_c_name: null,
        team_c_ranking: null,
        team_d_name: null,
        team_d_ranking: null,
        team_e_name: null,
        team_e_ranking: null,
        team_f_name: null,
        team_f_ranking: null,
        is_completed: false,
        no_games: false,
        is_playoff: false,
      } as Partial<WeeklyScheduleTier>;
    });

    if (inserts.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('weekly_schedules')
        .insert(inserts)
        .select('*');
      if (insErr) handleDatabaseError(insErr);
      (inserted || []).forEach((row: any) => {
        rowsByTier.set(row.tier_number, row);
        (nextWeekRows || (nextWeekRows = [])).push(row);
      });
    }
  }

  // Clear any existing occurrences of these team names anywhere in next week to avoid duplicates
  // This ensures edits remove prior placements regardless of previous target tiers
  const namesToPlace = new Set(assignments.map(a => a.name));
  const { data: allNextWeekRows, error: fetchAllErr } = await supabase
    .from('weekly_schedules')
    .select('id, tier_number, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek);
  if (fetchAllErr) handleDatabaseError(fetchAllErr);
  for (const row of allNextWeekRows || []) {
    const updates: Record<string, any> = {};
    (['a','b','c','d','e','f'] as const).forEach((p) => {
      const key = `team_${p}_name` as const;
      const rk = `team_${p}_ranking` as const;
      const name = (row as any)[key] as string | null;
      if (name && namesToPlace.has(name)) {
        updates[key] = null;
        updates[rk] = null;
      }
    });

    if (Object.keys(updates).length > 0) {
      const { error: clrErr } = await supabase
        .from('weekly_schedules')
        .update(updates)
        .eq('id', row.id);
      if (clrErr) handleDatabaseError(clrErr);
    }
  }

  // Perform targeted updates in A..F position order
  const order: TeamPositionId[] = ['A','B','C','D','E','F'];
  const sortedAssignments = assignments.slice().sort((x, y) => order.indexOf(x.targetPos) - order.indexOf(y.targetPos));
  for (const a of sortedAssignments) {
    const updates: Record<string, any> = {};
    updates[`team_${a.targetPos.toLowerCase()}_name`] = a.name;
    updates[`team_${a.targetPos.toLowerCase()}_ranking`] = null;
    const { error: updErr } = await supabase
      .from('weekly_schedules')
      .update(updates)
      .eq('league_id', leagueId)
      .eq('week_number', destWeek)
      .eq('tier_number', a.targetTier);
    if (updErr) handleDatabaseError(updErr);
  }
}

/**
 * Applies four-team (A/B/C/D) head-to-head movement to the following week's schedule
 * Courts are sub-tiers:
 * - Game 2 Court 1 winner: Up one tier to position D (if top tier: Stay -> A)
 * - Game 2 Court 1 loser: Stay in same tier -> Court 2 position C
 * - Game 2 Court 2 winner: Stay in same tier -> Court 1 position B
 * - Game 2 Court 2 loser: Down one tier to position A (if bottom tier: Stay -> D)
 */
export async function applyFourTeamTierMovementNextWeek(params: {
  leagueId: number;
  currentWeek: number;
  tierNumber: number;
  isTopTier: boolean;
  isBottomTier: boolean;
  teamNames: { A: string; B: string; C: string; D: string };
  game1: { court1: Array<{ label: string; scores: Record<'A'|'B', string> }>; court2: Array<{ label: string; scores: Record<'C'|'D', string> }>; };
  game2: { court1: Array<{ label: string; scores: Record<'WC1'|'WC2', string> }>; court2: Array<{ label: string; scores: Record<'LC1'|'LC2', string> }>; };
}): Promise<void> {
  const { leagueId, currentWeek, tierNumber, isTopTier, isBottomTier, teamNames, game1, game2 } = params;
  const nextWeek = (currentWeek || 0) + 1;
  if (!leagueId || !nextWeek || !tierNumber) return;

  const destWeek = await getNextPlayableWeek(leagueId, nextWeek);

  const evalCourt = (rows: Array<Record<string,string>>, L: 'A'|'B'|'C'|'D', R: 'A'|'B'|'C'|'D') => {
    let lw=0, rw=0, diff=0; for(const row of rows){ const sl=row[L]??''; const sr=row[R]??''; const nl=Number(sl), nr=Number(sr); if(sl===''||sr===''||Number.isNaN(nl)||Number.isNaN(nr)||nl===nr) return {winner:null as any, loser:null as any}; diff+=(nl-nr); if(nl>nr) lw++; else rw++; }
    if (lw!==rw) return { winner: (lw>rw? L:R), loser: (lw>rw? R:L) };
    if (diff!==0) return { winner: (diff>0? L:R), loser: (diff>0? R:L) };
    return { winner:null as any, loser:null as any };
  };
  const g1c1Rows = (game1.court1||[]).map(s => ({ A: (s.scores as any).A ?? '', B: (s.scores as any).B ?? '' }));
  const g1c2Rows = (game1.court2||[]).map(s => ({ C: (s.scores as any).C ?? '', D: (s.scores as any).D ?? '' }));
  const g1c1 = evalCourt(g1c1Rows as any, 'A','B');
  const g1c2 = evalCourt(g1c2Rows as any, 'C','D');
  if (!g1c1.winner || !g1c1.loser || !g1c2.winner || !g1c2.loser) return;

  const w1 = g1c1.winner as 'A'|'B';
  const l1 = g1c1.loser as 'A'|'B';
  const w2 = g1c2.winner as 'C'|'D';
  const l2 = g1c2.loser as 'C'|'D';

  const scoreRows = (rows: Array<Record<string,string>>, L: string, R: string) => {
    let lw=0, rw=0, diff=0; for(const row of rows){ const sl=row[L]??''; const sr=row[R]??''; const nl=Number(sl), nr=Number(sr); diff += (nl-nr); if(nl>nr) lw++; else rw++; }
    if (lw!==rw) return lw>rw? L:R; return diff>0? L:R;
  };
  const g2c1Rows = (game2.court1||[]).map(s => ({ [w1]: (s.scores as any).WC1 ?? '', [w2]: (s.scores as any).WC2 ?? '' })) as any;
  const g2c2Rows = (game2.court2||[]).map(s => ({ [l1]: (s.scores as any).LC1 ?? '', [l2]: (s.scores as any).LC2 ?? '' })) as any;
  const c1Winner = scoreRows(g2c1Rows, w1, w2) as 'A'|'B'|'C'|'D';
  const c1Loser = (c1Winner === (w1 as any)) ? (w2 as any) : (w1 as any);
  const c2Winner = scoreRows(g2c2Rows, l1, l2) as 'A'|'B'|'C'|'D';
  const c2Loser = (c2Winner === (l1 as any)) ? (l2 as any) : (l1 as any);

  // Assignments for next week based on movement rules
  type Pos = 'A'|'B'|'C'|'D';
  const assignments: Array<{ name:string; targetTier:number; targetPos: Pos }> = [];
  // Court 1 winner
  if (teamNames[c1Winner]) {
    if (isTopTier) assignments.push({ name: teamNames[c1Winner], targetTier: tierNumber, targetPos: 'A' });
    else assignments.push({ name: teamNames[c1Winner], targetTier: Math.max(1, tierNumber - 1), targetPos: 'D' });
  }
  // Court 1 loser -> same tier C
  if (teamNames[c1Loser]) assignments.push({ name: teamNames[c1Loser], targetTier: tierNumber, targetPos: 'C' });
  // Court 2 winner -> same tier B
  if (teamNames[c2Winner]) assignments.push({ name: teamNames[c2Winner], targetTier: tierNumber, targetPos: 'B' });
  // Court 2 loser -> down A (or stay D if bottom tier)
  if (teamNames[c2Loser]) {
    if (isBottomTier) assignments.push({ name: teamNames[c2Loser], targetTier: tierNumber, targetPos: 'D' });
    else assignments.push({ name: teamNames[c2Loser], targetTier: tierNumber + 1, targetPos: 'A' });
  }

  // Fetch next week target tiers
  const tierNumbersToFetch = Array.from(new Set(assignments.map(a => a.targetTier).concat([tierNumber, tierNumber - 1, tierNumber + 1]).filter(n => n >= 1)));
  let { data: nextWeekRows, error: fetchErr } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek)
    .in('tier_number', tierNumbersToFetch as number[]);
  if (fetchErr) handleDatabaseError(fetchErr);
  const rowsByTier = new Map<number, any>(); (nextWeekRows||[]).forEach((row:any)=>rowsByTier.set(row.tier_number, row));

  const missingTiers = assignments.map(a=>a.targetTier).filter(t=>!rowsByTier.has(t));
  if (missingTiers.length>0) {
    const { data: currentWeekTemplates } = await supabase
      .from('weekly_schedules')
      .select('tier_number, location, time_slot, court, format')
      .eq('league_id', leagueId)
      .eq('week_number', currentWeek)
      .in('tier_number', missingTiers as number[]);
    const tmplByTier = new Map<number, any>(); (currentWeekTemplates||[]).forEach((r:any)=>tmplByTier.set(r.tier_number, r));
    const inserts = missingTiers.map((t)=>({
      league_id: leagueId, week_number: destWeek, tier_number: t,
      location: tmplByTier.get(t)?.location || 'TBD', time_slot: tmplByTier.get(t)?.time_slot || 'TBD', court: tmplByTier.get(t)?.court || 'TBD',
      format: tmplByTier.get(t)?.format || '4-teams-head-to-head',
      team_a_name: null, team_a_ranking: null,
      team_b_name: null, team_b_ranking: null,
      team_c_name: null, team_c_ranking: null,
      team_d_name: null, team_d_ranking: null,
      team_e_name: null, team_e_ranking: null,
      team_f_name: null, team_f_ranking: null,
      is_completed:false, no_games:false, is_playoff:false,
    } as Partial<WeeklyScheduleTier>));
    if (inserts.length>0) {
      const { data: inserted, error: insErr } = await supabase.from('weekly_schedules').insert(inserts).select('*');
      if (insErr) handleDatabaseError(insErr);
      (inserted||[]).forEach((row:any)=>{ rowsByTier.set(row.tier_number,row); (nextWeekRows||(nextWeekRows=[])).push(row); });
    }
  }

  // Clear duplicates across next week rows
  const namesToPlace = new Set(assignments.map(a=>a.name));
  const { data: allNextWeekRows, error: fetchAllErr } = await supabase
    .from('weekly_schedules')
    .select('id, tier_number, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek);
  if (fetchAllErr) handleDatabaseError(fetchAllErr);
  for (const row of allNextWeekRows||[]) {
    const updates: Record<string, any> = {};
    (['a','b','c','d','e','f'] as const).forEach((p)=>{ const key=`team_${p}_name` as const; const rk = `team_${p}_ranking` as const; const name=(row as any)[key] as string|null; if (name && namesToPlace.has(name)) { updates[key]=null; updates[rk]=null; } });
    if (Object.keys(updates).length>0) {
      const { error: clrErr } = await supabase.from('weekly_schedules').update(updates).eq('id', (row as any).id);
      if (clrErr) handleDatabaseError(clrErr);
    }
  }

  // Apply assignments
  // Group updates by target tier so we can update multiple positions atomically
  const updatesByTier = new Map<number, Record<string, any>>();
  for (const a of assignments) {
    const lower = a.targetPos.toLowerCase();
    const rec = updatesByTier.get(a.targetTier) || {};
    rec[`team_${lower}_name`] = a.name;
    rec[`team_${lower}_ranking`] = null;
    // If placing into C or D, ensure the row format supports 4 teams to satisfy DB constraints
    if (lower === 'c' || lower === 'd') {
      rec.format = '4-teams-head-to-head';
    }
    updatesByTier.set(a.targetTier, rec);
  }

  // Apply grouped updates per tier (ensures C before D constraints are satisfied in one statement)
  for (const [tier, updates] of updatesByTier.entries()) {
    const { error: updErr } = await supabase
      .from('weekly_schedules')
      .update(updates)
      .eq('league_id', leagueId)
      .eq('week_number', destWeek)
      .eq('tier_number', tier);
    if (updErr) handleDatabaseError(updErr);
  }
}
/**
 * Applies two-team (A/B) tier movement to the following week's schedule
 * - Winner: moves up one tier to position B (or stays in Tier 1 at A)
 * - Loser: moves down one tier to position A (or stays in bottom tier at B)
 */
export async function applyTwoTeamTierMovementNextWeek(params: {
  leagueId: number;
  currentWeek: number;
  tierNumber: number;
  isTopTier: boolean;
  isBottomTier: boolean;
  teamNames: { A: string; B: string };
  sortedKeys: Array<'A' | 'B'>; // sorted best->worst by this week's results
}): Promise<void> {
  const { leagueId, currentWeek, tierNumber, isTopTier, isBottomTier, teamNames, sortedKeys } = params;
  const nextWeek = (currentWeek || 0) + 1;
  if (!leagueId || !nextWeek || !tierNumber) return;

  const destWeek = await getNextPlayableWeek(leagueId, nextWeek);

  const winnerKey = sortedKeys[0];
  const loserKey = sortedKeys[1];

  type Pos2 = TeamPositionId;
  const assignments: Array<{ name: string; targetTier: number; targetPos: Pos2 }> = [];

  // Check adjacent tier formats in current week for cross-format movement adjustments
  let aboveFormat: string | null = null;
  let belowFormat: string | null = null;
  try {
    const tiersToCheck = [tierNumber - 1, tierNumber + 1].filter(n => n >= 1);
    if (tiersToCheck.length > 0) {
      const { data: adj } = await supabase
        .from('weekly_schedules')
        .select('tier_number, format')
        .eq('league_id', leagueId)
        .eq('week_number', currentWeek)
        .in('tier_number', tiersToCheck as number[]);
      (adj || []).forEach((row: any) => {
        if (row.tier_number === tierNumber - 1) aboveFormat = row.format || null;
        if (row.tier_number === tierNumber + 1) belowFormat = row.format || null;
      });
    }
  } catch {/* ignore */}

  // Winner
  if (teamNames[winnerKey]) {
    if (isTopTier) {
      assignments.push({ name: teamNames[winnerKey], targetTier: tierNumber, targetPos: 'A' });
    } else {
      const targetTier = Math.max(1, tierNumber - 1);
      const pos = aboveFormat ? getPositionsForFormat(aboveFormat) : ['A','B'];
      const highest = pos[pos.length - 1] as TeamPositionId;
      assignments.push({ name: teamNames[winnerKey], targetTier, targetPos: highest });
    }
  }
  // Loser
  if (teamNames[loserKey]) {
    if (isBottomTier) {
      assignments.push({ name: teamNames[loserKey], targetTier: tierNumber, targetPos: 'B' });
    } else {
      const pos = belowFormat ? getPositionsForFormat(belowFormat) : ['A','B'];
      const lowest = pos[0] as TeamPositionId;
      assignments.push({ name: teamNames[loserKey], targetTier: tierNumber + 1, targetPos: lowest });
    }
  }

  // Fetch/create next week rows for destination tiers
  const tierNumbersToFetch = Array.from(new Set(assignments.map(a => a.targetTier).concat([tierNumber, tierNumber - 1, tierNumber + 1]).filter(n => n >= 1)));

  let { data: nextWeekRows, error: fetchErr } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek)
    .in('tier_number', tierNumbersToFetch as number[]);
  if (fetchErr) handleDatabaseError(fetchErr);

  const rowsByTier = new Map<number, any>();
  (nextWeekRows || []).forEach((row: any) => rowsByTier.set(row.tier_number, row));

  const missingTiers = assignments.map(a => a.targetTier).filter(t => !rowsByTier.has(t));
  if (missingTiers.length > 0) {
    const { data: currentWeekTemplates } = await supabase
      .from('weekly_schedules')
      .select('tier_number, location, time_slot, court, format')
      .eq('league_id', leagueId)
      .eq('week_number', currentWeek)
      .in('tier_number', missingTiers as number[]);

    const tmplByTier = new Map<number, any>();
    (currentWeekTemplates || []).forEach((r: any) => tmplByTier.set(r.tier_number, r));

    const inserts = missingTiers.map((t) => {
      const tmpl = tmplByTier.get(t);
      return {
        league_id: leagueId,
        week_number: destWeek,
        tier_number: t,
        location: tmpl?.location || 'TBD',
        time_slot: tmpl?.time_slot || 'TBD',
        court: tmpl?.court || 'TBD',
        format: tmpl?.format || '2-teams-4-sets',
        team_a_name: null,
        team_a_ranking: null,
        team_b_name: null,
        team_b_ranking: null,
        team_c_name: null,
        team_c_ranking: null,
        team_d_name: null,
        team_d_ranking: null,
        team_e_name: null,
        team_e_ranking: null,
        team_f_name: null,
        team_f_ranking: null,
        is_completed: false,
        no_games: false,
        is_playoff: false,
      } as Partial<WeeklyScheduleTier>;
    });

    if (inserts.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('weekly_schedules')
        .insert(inserts)
        .select('*');
      if (insErr) handleDatabaseError(insErr);
      (inserted || []).forEach((row: any) => {
        rowsByTier.set(row.tier_number, row);
        (nextWeekRows || (nextWeekRows = [])).push(row);
      });
    }
  }

  // Clear duplicates of these names across all next-week rows
  const namesToPlace = new Set(assignments.map(a => a.name));
  const { data: allNextWeekRows, error: fetchAllErr } = await supabase
    .from('weekly_schedules')
    .select('id, tier_number, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek);
  if (fetchAllErr) handleDatabaseError(fetchAllErr);
  for (const row of allNextWeekRows || []) {
    const updates: Record<string, any> = {};
    (['a','b','c','d','e','f'] as const).forEach((p) => {
      const key = `team_${p}_name` as const;
      const rk = `team_${p}_ranking` as const;
      const name = (row as any)[key] as string | null;
      if (name && namesToPlace.has(name)) {
        updates[key] = null;
        updates[rk] = null;
      }
    });
    if (Object.keys(updates).length > 0) {
      const { error: clrErr } = await supabase
        .from('weekly_schedules')
        .update(updates)
        .eq('id', row.id);
      if (clrErr) handleDatabaseError(clrErr);
    }
  }

  // Apply assignments to target (league_id, destWeek, targetTier)
  for (const a of assignments) {
    const updates: Record<string, any> = {};
    const lower = a.targetPos.toLowerCase();
    updates[`team_${lower}_name`] = a.name;
    updates[`team_${lower}_ranking`] = null;
    const { error: updErr } = await supabase
      .from('weekly_schedules')
      .update(updates)
      .eq('league_id', leagueId)
      .eq('week_number', destWeek)
      .eq('tier_number', a.targetTier);
    if (updErr) handleDatabaseError(updErr);
  }
}

/**
 * Returns the next playable week number starting from startWeek, skipping any weeks
 * where all tiers are marked no_games = true. If no rows exist for a week, treat as playable.
 */
export async function getNextPlayableWeek(leagueId: number, startWeek: number): Promise<number> {
  let candidate = startWeek;
  for (let i = 0; i < 52; i++) { // safety cap
    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('no_games')
      .eq('league_id', leagueId)
      .eq('week_number', candidate);
    if (error) return candidate; // fallback: treat as playable
    if (!Array.isArray(data) || data.length === 0) return candidate; // no rows: playable
    const allNoGames = data.every((r: any) => !!r.no_games);
    if (!allNoGames) return candidate; // playable week
    candidate += 1; // skip to next
  }
  return candidate;
}

/**
 * Carry forward A/B/C assignments unchanged to next week for a tier marked no_games.
 */
export async function carryForwardNoGamesTierNextWeek(params: {
  leagueId: number;
  currentWeek: number;
  tierNumber: number;
}): Promise<void> {
  const { leagueId, currentWeek, tierNumber } = params;
  const nextWeek = currentWeek + 1;
  // Determine destination week: if next week is a full no-games week, skip to the following week
  let destWeek = nextWeek;
  try {
    const { data: destRows } = await supabase
      .from('weekly_schedules')
      .select('no_games')
      .eq('league_id', leagueId)
      .eq('week_number', destWeek);
    if (Array.isArray(destRows) && destRows.length > 0 && destRows.every((r: any) => !!r.no_games)) {
      destWeek = nextWeek + 1;
    }
  } catch { /* ignore */ }

  const { data: curRow, error: curErr } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', currentWeek)
    .eq('tier_number', tierNumber)
    .maybeSingle();
  if (curErr) handleDatabaseError(curErr);
  if (!curRow) return;

  const names = [curRow.team_a_name, curRow.team_b_name, curRow.team_c_name].filter(Boolean) as string[];

  // Ensure next week tier exists matching current week template
  let { data: nextRowFull } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek)
    .eq('tier_number', tierNumber)
    .maybeSingle();
  if (!nextRowFull) {
    const { error: insErr } = await supabase
      .from('weekly_schedules')
      .insert([{
        league_id: leagueId,
        week_number: destWeek,
        tier_number: tierNumber,
        location: curRow.location,
        time_slot: curRow.time_slot,
        court: curRow.court,
        format: curRow.format || '3-teams-6-sets',
        team_a_name: null, team_a_ranking: null,
        team_b_name: null, team_b_ranking: null,
        team_c_name: null, team_c_ranking: null,
        team_d_name: null, team_d_ranking: null,
        team_e_name: null, team_e_ranking: null,
        team_f_name: null, team_f_ranking: null,
        is_completed: false,
        no_games: false,
        is_playoff: false,
      }]);
    if (insErr) handleDatabaseError(insErr);
    // Re-read inserted row
    const { data: reread } = await supabase
      .from('weekly_schedules')
      .select('*')
      .eq('league_id', leagueId)
      .eq('week_number', destWeek)
      .eq('tier_number', tierNumber)
      .maybeSingle();
    nextRowFull = reread as any;
  }

    // Removed: per-tier carry-forward duplicate clearing and overwriting logic by request

  // Apply A/B/C identical to current week

  const updates: Record<string, any> = {
    team_a_name: curRow.team_a_name,
    team_a_ranking: curRow.team_a_ranking,
    team_b_name: curRow.team_b_name,
    team_b_ranking: curRow.team_b_ranking,
    team_c_name: curRow.team_c_name,
    team_c_ranking: curRow.team_c_ranking,
  };
  const { error: updErr } = await supabase
    .from('weekly_schedules')
    .update(updates)
    .eq('league_id', leagueId)
    .eq('week_number', destWeek)
    .eq('tier_number', tierNumber);
  if (updErr) handleDatabaseError(updErr);
}

/**
 * Clears any occurrences of given team names from all next-week schedule rows for the league.
 */
export async function clearTeamPlacementsFromNextWeek(params: {
  leagueId: number;
  currentWeek: number;
  teamNames: string[];
}): Promise<void> {
  const { leagueId, currentWeek, teamNames } = params;
  const nextWeek = currentWeek + 1;
  const namesSet = new Set(teamNames.filter(Boolean));
  if (namesSet.size === 0) return;

  const { data: rows, error } = await supabase
    .from('weekly_schedules')
    .select('id, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
    .eq('league_id', leagueId)
    .eq('week_number', nextWeek);
  if (error) handleDatabaseError(error);

  for (const row of rows || []) {
    const updates: Record<string, any> = {};
    (['a','b','c','d','e','f'] as const).forEach((p) => {
      const key = `team_${p}_name` as const;
      const rk = `team_${p}_ranking` as const;
      const val = (row as any)[key] as string | null;
      if (val && namesSet.has(val)) {
        updates[key] = null;
        updates[rk] = null;
      }
    });
    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('weekly_schedules')
        .update(updates)
        .eq('id', (row as any).id);
      if (updErr) handleDatabaseError(updErr);
    }
  }
}

/**
 * Move all A/B/C placements from one week to another within the same league, preserving tier and position.
 * Clears placements from the source week after copying. Ensures target rows exist and avoids duplicates.
 */
export async function moveWeekPlacements(params: {
  leagueId: number;
  fromWeek: number;
  toWeek: number;
}): Promise<void> {
  const { leagueId, fromWeek, toWeek } = params;
  if (fromWeek === toWeek) return;

  // Attempt to use transactional RPC if available
  try {
    const { error: rpcErr } = await supabase.rpc('apply_week_bump', {
      p_league_id: leagueId,
      p_from_week: fromWeek,
      p_to_week: toWeek,
    });
    if (!rpcErr) {
      // Optional debug summary
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env: any = (import.meta as any)?.env;
        if (env?.VITE_DEBUG_MOVEMENT) {
          const { data: moved } = await supabase
            .from('weekly_schedules')
            .select('tier_number, team_a_name, team_b_name, team_c_name')
            .eq('league_id', leagueId)
            .eq('week_number', toWeek)
            .order('tier_number');
          const summary = (moved || [])
            .map((r: any) => `T${r.tier_number}: A=${r.team_a_name || '-'} B=${r.team_b_name || '-'} C=${r.team_c_name || '-'}`)
            .join(' | ');
          console.info('[Week bump][RPC]', `W${fromWeek} -> W${toWeek}:`, summary);
        }
      } catch { /* ignore logging errors */ }
      return;
    }
    // If RPC not found or not defined, fall through to client fallback
    if (rpcErr && rpcErr.code !== '42883' && rpcErr.code !== 'PGRST202') {
      // Unexpected error
      handleDatabaseError(rpcErr);
    }
  } catch { /* ignore and fallback */ }

  const { data: fromRows, error: fromErr } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', fromWeek);
  if (fromErr) handleDatabaseError(fromErr);
  if (!fromRows || fromRows.length === 0) return;

  // Gather names to clear in target (include all possible positions A-F)
  const names: string[] = [];
  fromRows.forEach((r: any) => {
    ['team_a_name','team_b_name','team_c_name','team_d_name','team_e_name','team_f_name']
      .forEach((k) => { if ((r as any)[k]) names.push((r as any)[k]); });
  });

  // Ensure target rows exist for each tier
  const tierNumbers = Array.from(new Set(fromRows.map((r: any) => r.tier_number)));
  const { data: targetRows } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', toWeek)
    .in('tier_number', tierNumbers as number[]);
  const byTier = new Map<number, any>();
  (targetRows || []).forEach((row: any) => byTier.set(row.tier_number, row));
  const missing = tierNumbers.filter(t => !byTier.has(t));
  if (missing.length > 0) {
    const inserts = fromRows.filter((r: any) => missing.includes(r.tier_number)).map((src: any) => ({
      league_id: leagueId,
      week_number: toWeek,
      tier_number: src.tier_number,
      location: src.location,
      time_slot: src.time_slot,
      court: src.court,
      format: src.format || '3-teams-6-sets',
      team_a_name: null, team_a_ranking: null,
      team_b_name: null, team_b_ranking: null,
      team_c_name: null, team_c_ranking: null,
      team_d_name: null, team_d_ranking: null,
      team_e_name: null, team_e_ranking: null,
      team_f_name: null, team_f_ranking: null,
      is_completed: false,
      no_games: false,
      is_playoff: false,
    }));
    if (inserts.length) {
      const { data: inserted, error: insErr } = await supabase
        .from('weekly_schedules')
        .insert(inserts)
        .select('*');
      if (insErr) handleDatabaseError(insErr);
      (inserted || []).forEach((row: any) => byTier.set(row.tier_number, row));
    }
  }

  // Clear duplicates in target
  await clearTeamPlacementsFromNextWeek({ leagueId, currentWeek: toWeek - 1, teamNames: names });

  // Copy A/B/C/D/E/F to target same tier when present; then clear from source
  for (const src of fromRows) {
    const updates: Record<string, any> = {};
    if (src.team_a_name) { updates.team_a_name = src.team_a_name; updates.team_a_ranking = src.team_a_ranking; }
    if (src.team_b_name) { updates.team_b_name = src.team_b_name; updates.team_b_ranking = src.team_b_ranking; }
    if (src.team_c_name) { updates.team_c_name = src.team_c_name; updates.team_c_ranking = src.team_c_ranking; }
    // Include D/E/F if present (e.g., 4- or 6-team head-to-head formats)
    if (src.team_d_name) {
      updates.team_d_name = src.team_d_name; updates.team_d_ranking = src.team_d_ranking;
      // Ensure destination format supports D position; prefer source format when available
      if (src.format) updates.format = src.format; else updates.format = '4-teams-head-to-head';
    }
    if (src.team_e_name) {
      updates.team_e_name = src.team_e_name; updates.team_e_ranking = src.team_e_ranking;
      if (src.format) updates.format = src.format; else updates.format = '6-teams-head-to-head';
    }
    if (src.team_f_name) {
      updates.team_f_name = src.team_f_name; updates.team_f_ranking = src.team_f_ranking;
      if (src.format) updates.format = src.format; else updates.format = '6-teams-head-to-head';
    }
    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('weekly_schedules')
        .update(updates)
        .eq('league_id', leagueId)
        .eq('week_number', toWeek)
        .eq('tier_number', src.tier_number);
      if (updErr) handleDatabaseError(updErr);
    }

    // Clear in source
    const clear: Record<string, any> = {};
    if (src.team_a_name) { clear.team_a_name = null; clear.team_a_ranking = null; }
    if (src.team_b_name) { clear.team_b_name = null; clear.team_b_ranking = null; }
    if (src.team_c_name) { clear.team_c_name = null; clear.team_c_ranking = null; }
    if (src.team_d_name) { clear.team_d_name = null; clear.team_d_ranking = null; }
    if (src.team_e_name) { clear.team_e_name = null; clear.team_e_ranking = null; }
    if (src.team_f_name) { clear.team_f_name = null; clear.team_f_ranking = null; }
    if (Object.keys(clear).length > 0) {
      const { error: clrErr } = await supabase
        .from('weekly_schedules')
        .update(clear)
        .eq('id', src.id);
      if (clrErr) handleDatabaseError(clrErr);
    }
  }

  // Optional debug summary (client fallback)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env: any = (import.meta as any)?.env;
    if (env?.VITE_DEBUG_MOVEMENT) {
      const { data: moved } = await supabase
        .from('weekly_schedules')
        .select('tier_number, team_a_name, team_b_name, team_c_name')
        .eq('league_id', leagueId)
        .eq('week_number', toWeek)
        .order('tier_number');
      const summary = (moved || [])
        .map((r: any) => `T${r.tier_number}: A=${r.team_a_name || '-'} B=${r.team_b_name || '-'} C=${r.team_c_name || '-'}`)
        .join(' | ');
      console.info('[Week bump][Client]', `W${fromWeek} -> W${toWeek}:`, summary);
    }
  } catch { /* ignore logging errors */ }
}

/**
 * Revert a prior per-tier no_games carry-forward: remove carried A/B/C from dest week
 * and restore previously displaced teams (lower A back to dest C, upper C back to dest A).
 */
// Note: Removed per-tier revert logic by request; weekly-level bump still available.

/**
 * Gets all available teams for a league that aren't already scheduled
 */
export async function getAvailableTeams(
  leagueId: number,
  currentWeek: number
): Promise<AvailableTeam[]> {
  try {
    // Get all teams in the league
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        captain_id,
        users!inner(name),
        skills(name)
      `)
      .eq('league_id', leagueId);

    if (teamsError) handleDatabaseError(teamsError);

    // Get already scheduled team names for current week
    const { data: scheduledTiers, error: scheduledError } = await supabase
      .from('weekly_schedules')
      .select(`
        team_a_name, team_b_name, team_c_name,
        team_d_name, team_e_name, team_f_name
      `)
      .eq('league_id', leagueId)
      .eq('week_number', currentWeek);

    if (scheduledError) handleDatabaseError(scheduledError);

    // Create set of scheduled team names
    const scheduledTeamNames = new Set<string>();
    scheduledTiers?.forEach(tier => {
      [tier.team_a_name, tier.team_b_name, tier.team_c_name, 
       tier.team_d_name, tier.team_e_name, tier.team_f_name]
        .filter(name => name)
        .forEach(name => scheduledTeamNames.add(name!));
    });

    // Format available teams
    return (allTeams || []).map(team => ({
      id: team.id,
      name: team.name,
      captain_id: team.captain_id,
      captain_name: Array.isArray(team.users) ? null : (team.users as { name?: string })?.name || null,
      skill_name: Array.isArray(team.skills) ? null : (team.skills as { name?: string })?.name || null,
      isScheduled: scheduledTeamNames.has(team.name),
      league_id: leagueId
    }));

  } catch (error) {
    handleDatabaseError(error);
  }
}

// =============================================================================
// LEAGUE CONFIGURATION OPERATIONS
// =============================================================================

/**
 * Gets league schedule configuration and settings
 */
export async function getLeagueScheduleConfig(leagueId: number): Promise<LeagueScheduleConfig | null> {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select(`
        id,
        start_date,
        end_date,
        playoff_weeks,
        league_schedules(
          defaults
        )
      `)
      .eq('id', leagueId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      handleDatabaseError(error);
    }

    const defaults = data.league_schedules?.[0]?.defaults || {};

    return {
      league_id: leagueId,
      start_date: data.start_date,
      end_date: data.end_date,
      total_weeks: calculateTotalWeeks(data.start_date, data.end_date),
      playoff_weeks: data.playoff_weeks || 0,
      default_location: defaults.location || 'TBD',
      default_time_slot: defaults.time || 'TBD',
      default_court: defaults.court || 'TBD',
      default_format: defaults.format || '3-teams-6-sets'
    };

  } catch (error) {
    handleDatabaseError(error);
  }
}

/**
 * Updates league schedule defaults
 */
export async function updateLeagueDefaults(
  leagueId: number,
  defaults: {
    location?: string;
    time?: string;
    court?: string;
    format?: GameFormatId;
  }
): Promise<void> {
  try {
    // Get current defaults
    const { data: current, error: fetchError } = await supabase
      .from('league_schedules')
      .select('defaults')
      .eq('league_id', leagueId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') handleDatabaseError(fetchError);

    const updatedDefaults = {
      ...(current?.defaults || {}),
      ...defaults
    };

    const { error } = await supabase
      .from('league_schedules')
      .upsert({
        league_id: leagueId,
        defaults: updatedDefaults,
        updated_at: new Date().toISOString()
      });

    if (error) handleDatabaseError(error);

  } catch (error) {
    handleDatabaseError(error);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Manual tier addition fallback
 */
async function addTierManually(
  leagueId: number,
  currentWeek: number,
  afterTierNumber: number,
  tierTemplate: Partial<WeeklyScheduleTier>
): Promise<void> {
  try {
    // Get max week for this league
    const { data: maxWeekData, error: maxWeekError } = await supabase
      .from('weekly_schedules')
      .select('week_number')
      .eq('league_id', leagueId)
      .order('week_number', { ascending: false })
      .limit(1);

    if (maxWeekError) handleDatabaseError(maxWeekError);

    const maxWeek = maxWeekData?.[0]?.week_number || currentWeek;

    // Shift existing tiers up by 1 (manual grouping by current tier_number)
    const { data: toShift, error: selectShiftErr } = await supabase
      .from('weekly_schedules')
      .select('id, tier_number')
      .eq('league_id', leagueId)
      .gte('week_number', currentWeek)
      .gt('tier_number', afterTierNumber)
      .order('tier_number', { ascending: false });

    if (selectShiftErr) handleDatabaseError(selectShiftErr);

    if (toShift && toShift.length > 0) {
      // Group by current (old) tier_number: all rows with tn -> update to tn+1
      const byTier = new Map<number, number[]>();
      toShift.forEach((row: any) => {
        const tn = row.tier_number as number;
        if (!byTier.has(tn)) byTier.set(tn, []);
        byTier.get(tn)!.push(row.id as number);
      });

      for (const [oldTier, ids] of byTier) {
        const newTier = oldTier + 1;
        const { error: updErr } = await supabase
          .from('weekly_schedules')
          .update({ tier_number: newTier })
          .in('id', ids as number[]);
        if (updErr) handleDatabaseError(updErr);
      }
    }

    // Insert new tiers for all weeks
    const newTiers = [];
    for (let week = currentWeek; week <= maxWeek; week++) {
      newTiers.push({
        league_id: leagueId,
        week_number: week,
        tier_number: afterTierNumber + 1,
        location: tierTemplate.location || 'TBD',
        time_slot: tierTemplate.time_slot || 'TBD',
        court: tierTemplate.court || 'TBD',
        format: tierTemplate.format || '3-teams-6-sets',
        team_a_name: null,
        team_a_ranking: null,
        team_b_name: null,
        team_b_ranking: null,
        team_c_name: null,
        team_c_ranking: null,
        team_d_name: null,
        team_d_ranking: null,
        team_e_name: null,
        team_e_ranking: null,
        team_f_name: null,
        team_f_ranking: null,
        is_completed: false,
        no_games: false
      });
    }

    const { error: insertError } = await supabase
      .from('weekly_schedules')
      .insert(newTiers);

    if (insertError) handleDatabaseError(insertError);

  } catch (error) {
    handleDatabaseError(error);
  }
}


/**
 * Calculate total weeks between two dates
 */
function calculateTotalWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
}

// =============================================================================
// PERFORMANCE OPTIMIZATION
// =============================================================================

/**
 * Refreshes the materialized view for schedule summaries
 */
export async function refreshScheduleSummary(): Promise<void> {
  try {
    const { error } = await supabase.rpc('refresh_league_schedule_summary');
    if (error) handleDatabaseError(error);
  } catch (error) {
    // Ignore errors if the function doesn't exist yet
    console.warn('Schedule summary refresh not available:', error);
  }
}
