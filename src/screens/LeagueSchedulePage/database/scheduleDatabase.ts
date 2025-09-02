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