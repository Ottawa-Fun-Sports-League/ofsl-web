/**
 * Schedule Database Layer
 * 
 * Standardized database operations for all schedule-related functionality.
 * This layer provides consistent error handling, type safety, and performance
 * optimization for all schedule database interactions.
 */

import { supabase } from '../../../lib/supabase';
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
    // Use optimized RPC function if available
    const { error: rpcError } = await supabase.rpc('add_tier_optimized', {
      p_league_id: leagueId,
      p_current_week: currentWeek,
      p_after_tier: afterTierNumber
    });

    if (rpcError) {
      // Fallback to manual insertion if RPC doesn't exist
      if (rpcError.code === 'PGRST202' || rpcError.code === '42883') {
        await addTierManually(leagueId, currentWeek, afterTierNumber, tierTemplate);
      } else {
        handleDatabaseError(rpcError);
      }
    }
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

  // Determine destination week: skip a week if destination week is marked no games (all tiers no_games)
  let destWeek = nextWeek;
  try {
    const { data: destRows } = await supabase
      .from('weekly_schedules')
      .select('no_games')
      .eq('league_id', leagueId)
      .eq('week_number', destWeek);
    if (Array.isArray(destRows) && destRows.length > 0 && destRows.every((r: any) => !!r.no_games)) {
      destWeek = nextWeek + 1; // Skip the no-games week
    }
  } catch { /* ignore */ }

  // Determine target assignments based on movement rules
  const winnerKey = sortedKeys[0];
  const neutralKey = sortedKeys[1];
  const loserKey = sortedKeys[2];

  type Pos = 'A' | 'B' | 'C';
  const assignments: Array<{ name: string; targetTier: number; targetPos: Pos }> = [];

  // Determine adjacency-based boundaries for this week
  let aboveNoGames = false;
  let belowNoGames = false;
  try {
    const neighborTiers = [tierNumber - 1, tierNumber + 1].filter(n => n >= 1);
    if (neighborTiers.length) {
      const { data: neighborRows } = await supabase
        .from('weekly_schedules')
        .select('tier_number,no_games')
        .eq('league_id', leagueId)
        .eq('week_number', currentWeek)
        .in('tier_number', neighborTiers as number[]);
      aboveNoGames = !!(neighborRows || []).find(r => (r as any).tier_number === tierNumber - 1 && (r as any).no_games);
      belowNoGames = !!(neighborRows || []).find(r => (r as any).tier_number === tierNumber + 1 && (r as any).no_games);
    }
  } catch { /* ignore */ }

  const effectiveTop = isTopTier || aboveNoGames;
  const effectiveBottom = isBottomTier || belowNoGames;

  // Winner
  if (teamNames[winnerKey]) {
    if (effectiveTop) {
      assignments.push({ name: teamNames[winnerKey], targetTier: tierNumber, targetPos: 'A' });
    } else {
      assignments.push({ name: teamNames[winnerKey], targetTier: Math.max(1, tierNumber - 1), targetPos: 'C' });
    }
  }
  // Neutral always to B in same tier
  if (teamNames[neutralKey]) {
    assignments.push({ name: teamNames[neutralKey], targetTier: tierNumber, targetPos: 'B' });
  }
  // Loser
  if (teamNames[loserKey]) {
    if (effectiveBottom) {
      assignments.push({ name: teamNames[loserKey], targetTier: tierNumber, targetPos: 'C' });
    } else {
      assignments.push({ name: teamNames[loserKey], targetTier: tierNumber + 1, targetPos: 'A' });
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

  // Perform targeted updates by (league_id, week_number, tier_number) placing A, then B, then C
  const order: Array<'A'|'B'|'C'> = ['A','B','C'];
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
  const { data: nextRow } = await supabase
    .from('weekly_schedules')
    .select('id')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek)
    .eq('tier_number', tierNumber)
    .maybeSingle();
  if (!nextRow) {
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
  }

  // Clear these team names anywhere in next week first
  const { data: allNext } = await supabase
    .from('weekly_schedules')
    .select('id, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
    .eq('league_id', leagueId)
    .eq('week_number', destWeek);
  const namesSet = new Set(names);
  for (const row of (allNext || [])) {
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
      const { error: clrErr } = await supabase
        .from('weekly_schedules')
        .update(updates)
        .eq('id', (row as any).id);
      if (clrErr) handleDatabaseError(clrErr);
    }
  }

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
  const { data: fromRows, error: fromErr } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', fromWeek);
  if (fromErr) handleDatabaseError(fromErr);
  if (!fromRows || fromRows.length === 0) return;

  // Gather names to clear in target
  const names: string[] = [];
  fromRows.forEach((r: any) => {
    ['team_a_name','team_b_name','team_c_name'].forEach((k) => { if (r[k]) names.push(r[k]); });
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

  // Copy A/B/C to target same tier; then clear from source
  for (const src of fromRows) {
    const updates: Record<string, any> = {};
    if (src.team_a_name) { updates.team_a_name = src.team_a_name; updates.team_a_ranking = src.team_a_ranking; }
    if (src.team_b_name) { updates.team_b_name = src.team_b_name; updates.team_b_ranking = src.team_b_ranking; }
    if (src.team_c_name) { updates.team_c_name = src.team_c_name; updates.team_c_ranking = src.team_c_ranking; }
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
    if (Object.keys(clear).length > 0) {
      const { error: clrErr } = await supabase
        .from('weekly_schedules')
        .update(clear)
        .eq('id', src.id);
      if (clrErr) handleDatabaseError(clrErr);
    }
  }
}

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

    // Shift existing tiers up by 1
    const { error: shiftError } = await supabase
      .from('weekly_schedules')
      .update({ tier_number: { increment: 1 } } as Record<string, unknown>)
      .eq('league_id', leagueId)
      .gte('week_number', currentWeek)
      .gt('tier_number', afterTierNumber);

    if (shiftError) handleDatabaseError(shiftError);

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
