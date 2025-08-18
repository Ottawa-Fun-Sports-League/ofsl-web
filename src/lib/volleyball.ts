// =============================================
// Volleyball API Functions
// =============================================
// API utilities for volleyball schedule and standings management

import { supabase } from './supabase';
import type {
  Match,
  LeagueStanding,
  TierHistoryEntry,
  WeeklySchedule,
  ScheduleResponse,
  StandingsResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
  TierSchedule,
  MatchValidation,
  ScoreEntryPermissions,
  ScheduleTemplate,
  TierMovementPreview
} from '../types/volleyball';

export { assignFacilitators } from './volleyballAlgorithms';

// =============================================
// SCHEDULE MANAGEMENT
// =============================================

/**
 * Fetch weekly schedule for a league
 */
export async function getLeagueSchedule(
  leagueId: number,
  weekNumber?: number,
  includePast: boolean = false
): Promise<ScheduleResponse> {
  try {
    let query = supabase
      .from('matches')
      .select(`
        *,
        team_a:teams!matches_position_a_fkey(id, name, captain_id),
        team_b:teams!matches_position_b_fkey(id, name, captain_id),
        team_c:teams!matches_position_c_fkey(id, name, captain_id),
        gym:gyms(id, gym, address),
        facilitator:users!matches_facilitator_id_fkey(id, name),
        template:schedule_templates(*)
      `)
      .eq('league_id', leagueId)
      .order('week_number')
      .order('tier')
      .order('time_slot');

    if (weekNumber) {
      query = query.eq('week_number', weekNumber);
    }

    if (!includePast) {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('match_date', today);
    }

    const { data: matches, error } = await query;

    if (error) throw error;

    // Group matches by week
    const weeklySchedules = groupMatchesByWeek(matches || []);
    
    // Get current week and total weeks
    const currentWeek = getCurrentWeek(matches || []);
    const totalWeeks = Math.max(...(matches || []).map(m => m.week_number), 0);

    return {
      current_week: currentWeek,
      total_weeks: totalWeeks,
      schedules: weeklySchedules
    };

  } catch (error) {
    console.error('Error fetching league schedule:', error);
    throw error;
  }
}

/**
 * Get schedule for a specific week
 */
export async function getWeekSchedule(
  leagueId: number,
  weekNumber: number
): Promise<WeeklySchedule | null> {
  const response = await getLeagueSchedule(leagueId, weekNumber);
  return response.schedules.find(s => s.week_number === weekNumber) || null;
}

/**
 * Get matches by tier for a specific week
 */
export async function getTierSchedule(
  leagueId: number,
  weekNumber: number,
  tier: number
): Promise<TierSchedule> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      team_a:teams!matches_position_a_fkey(id, name, captain_id),
      team_b:teams!matches_position_b_fkey(id, name, captain_id),
      team_c:teams!matches_position_c_fkey(id, name, captain_id),
      gym:gyms(id, gym, address)
    `)
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('tier', tier)
    .order('time_slot');

  if (error) throw error;

  return {
    tier_number: tier,
    matches: matches || [],
    teams: extractTeamsFromMatches(matches || [])
  };
}

// =============================================
// STANDINGS MANAGEMENT
// =============================================

/**
 * Get current standings for a league
 */
export async function getLeagueStandings(
  leagueId: number,
  weekNumber?: number
): Promise<StandingsResponse> {
  try {
    let query = supabase
      .from('league_standings')
      .select(`
        *,
        team:teams(
          id, name, captain_id,
          captain:users!teams_captain_id_fkey(id, name)
        )
      `)
      .eq('league_id', leagueId)
      .order('current_tier')
      .order('tier_rank');

    if (weekNumber) {
      query = query.eq('week_number', weekNumber);
    } else {
      // Get latest standings for each team
      const { data: latestWeek } = await supabase
        .from('league_standings')
        .select('week_number')
        .eq('league_id', leagueId)
        .order('week_number', { ascending: false })
        .limit(1);

      if (latestWeek && latestWeek[0]) {
        query = query.eq('week_number', latestWeek[0].week_number);
      }
    }

    const { data: standings, error } = await query;

    if (error) throw error;

    // Group standings by tier
    const tierStandings = groupStandingsByTier(standings || []);
    
    // Get metadata
    const currentWeek = weekNumber || Math.max(...(standings || []).map(s => s.week_number), 0);
    const totalTeams = (standings || []).length;
    const lastUpdated = (standings || []).reduce((latest, s) => 
      s.calculated_at > latest ? s.calculated_at : latest, '');

    return {
      current_week: currentWeek,
      total_teams: totalTeams,
      tiers: tierStandings,
      last_updated: lastUpdated
    };

  } catch (error) {
    console.error('Error fetching league standings:', error);
    throw error;
  }
}

/**
 * Get tier history for a team
 */
export async function getTeamTierHistory(
  teamId: number,
  leagueId?: number
): Promise<TierHistoryEntry[]> {
  let query = supabase
    .from('tier_history')
    .select(`
      *,
      team:teams(id, name)
    `)
    .eq('team_id', teamId)
    .order('effective_date', { ascending: false });

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

// =============================================
// SCORE MANAGEMENT
// =============================================

/**
 * Submit match scores
 */
export async function submitMatchScores(
  request: ScoreSubmissionRequest
): Promise<ScoreSubmissionResponse> {
  try {
    // Start a transaction for score submission
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', request.match_id)
      .single();

    if (matchError) throw matchError;
    if (!match) throw new Error('Match not found');

    // Validate the match can accept scores
    const validation = await validateScoreSubmission(request);
    if (!validation.is_valid) {
      throw new Error(`Score validation failed: ${validation.errors.join(', ')}`);
    }

    // Delete existing sets for this match
    await supabase
      .from('match_sets')
      .delete()
      .eq('match_id', request.match_id);

    // Insert new sets
    const setsToInsert = request.sets.map(set => ({
      match_id: request.match_id,
      set_number: set.set_number,
      team_a_score: set.team_a_score,
      team_b_score: set.team_b_score,
      team_c_score: set.team_c_score || 0,
      completed_at: new Date().toISOString()
    }));

    const { error: setsError } = await supabase
      .from('match_sets')
      .insert(setsToInsert);

    if (setsError) throw setsError;

    // Update match status and notes
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        notes: request.notes,
        completed_at: new Date().toISOString()
      })
      .eq('id', request.match_id);

    if (updateError) throw updateError;

    // Get updated match data
    const { data: updatedMatch, error: fetchError } = await supabase
      .from('matches')
      .select(`
        *,
        team_a:teams!matches_position_a_fkey(id, name, captain_id),
        team_b:teams!matches_position_b_fkey(id, name, captain_id),
        team_c:teams!matches_position_c_fkey(id, name, captain_id),
        sets:match_sets(*)
      `)
      .eq('id', request.match_id)
      .single();

    if (fetchError) throw fetchError;

    // Recalculate standings (this would trigger the standings calculation)
    await recalculateStandings(match.league_id, match.week_number);

    return {
      success: true,
      match: updatedMatch,
      // TODO: Return updated standings and tier movements
      updated_standings: [],
      tier_movements: []
    };

  } catch (error) {
    console.error('Error submitting match scores:', error);
    throw error;
  }
}

/**
 * Get match details with sets
 */
export async function getMatchWithSets(matchId: number): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      team_a:teams!matches_position_a_fkey(id, name, captain_id),
      team_b:teams!matches_position_b_fkey(id, name, captain_id),
      team_c:teams!matches_position_c_fkey(id, name, captain_id),
      gym:gyms(id, gym, address),
      facilitator:users!matches_facilitator_id_fkey(id, name),
      template:schedule_templates(*),
      sets:match_sets(*)
    `)
    .eq('id', matchId)
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// VALIDATION FUNCTIONS
// =============================================

/**
 * Validate score submission
 */
export async function validateScoreSubmission(
  request: ScoreSubmissionRequest
): Promise<MatchValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get match details
    const { data: match } = await supabase
      .from('matches')
      .select('*, template:schedule_templates(*)')
      .eq('id', request.match_id)
      .single();

    if (!match) {
      errors.push('Match not found');
      return { is_valid: false, errors, warnings };
    }

    // Check if match is already completed
    if (match.status === 'completed') {
      warnings.push('Match is already completed - scores will be overwritten');
    }

    // Validate number of sets
    const template = match.template;
    if (template) {
      if (request.sets.length > template.sets_per_match) {
        errors.push(`Too many sets - maximum is ${template.sets_per_match}`);
      }
      if (request.sets.length < 1) {
        errors.push('At least one set is required');
      }

      // Validate set scores
      request.sets.forEach(set => {
        if (set.team_a_score < 0 || set.team_b_score < 0 || (set.team_c_score && set.team_c_score < 0)) {
          errors.push(`Set ${set.set_number}: Scores cannot be negative`);
        }

        const maxScore = Math.max(set.team_a_score, set.team_b_score, set.team_c_score || 0);
        const minWinningScore = template.points_per_set;

        if (maxScore < minWinningScore) {
          warnings.push(`Set ${set.set_number}: No team reached ${minWinningScore} points`);
        }
      });
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    errors.push('Validation error occurred');
    return { is_valid: false, errors, warnings };
  }
}

/**
 * Check user's score entry permissions for a match
 */
export async function checkScorePermissions(
  matchId: number,
  userId: string
): Promise<ScoreEntryPermissions> {
  try {
    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('is_admin, is_facilitator')
      .eq('id', userId)
      .single();

    if (!user) {
      return {
        can_enter_scores: false,
        permission_level: 'none',
        reason: 'User not found'
      };
    }

    // Check if user is admin
    if (user.is_admin) {
      return {
        can_enter_scores: true,
        permission_level: 'admin'
      };
    }

    // Check if user is assigned facilitator for this match
    const { data: match } = await supabase
      .from('matches')
      .select('facilitator_id')
      .eq('id', matchId)
      .single();

    if (match?.facilitator_id === userId) {
      return {
        can_enter_scores: true,
        permission_level: 'facilitator'
      };
    }

    // Check if user is a general facilitator
    if (user.is_facilitator) {
      return {
        can_enter_scores: true,
        permission_level: 'facilitator'
      };
    }

    return {
      can_enter_scores: false,
      permission_level: 'none',
      reason: 'Insufficient permissions'
    };

  } catch (error) {
    return {
      can_enter_scores: false,
      permission_level: 'none',
      reason: 'Permission check failed'
    };
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Group matches by week
 */
function groupMatchesByWeek(matches: Match[]): WeeklySchedule[] {
  const weekMap = new Map<number, Match[]>();

  matches.forEach(match => {
    if (!weekMap.has(match.week_number)) {
      weekMap.set(match.week_number, []);
    }
    weekMap.get(match.week_number)!.push(match);
  });

  return Array.from(weekMap.entries()).map(([weekNumber, weekMatches]) => {
    // Calculate week dates (assuming matches are on same day of week)
    const firstMatch = weekMatches[0];
    const matchDate = new Date(firstMatch.match_date);
    const weekStart = new Date(matchDate);
    weekStart.setDate(matchDate.getDate() - matchDate.getDay()); // Start of week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week

    return {
      week_number: weekNumber,
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      matches: weekMatches,
      tiers: groupMatchesByTier(weekMatches)
    };
  }).sort((a, b) => a.week_number - b.week_number);
}

/**
 * Group matches by tier
 */
function groupMatchesByTier(matches: Match[]): TierSchedule[] {
  const tierMap = new Map<number, Match[]>();

  matches.forEach(match => {
    if (!tierMap.has(match.tier)) {
      tierMap.set(match.tier, []);
    }
    tierMap.get(match.tier)!.push(match);
  });

  return Array.from(tierMap.entries()).map(([tier, tierMatches]) => ({
    tier_number: tier,
    matches: tierMatches,
    teams: extractTeamsFromMatches(tierMatches)
  })).sort((a, b) => a.tier_number - b.tier_number);
}

/**
 * Extract team information from matches
 */
function extractTeamsFromMatches(matches: Match[]) {
  const teams = {
    position_a: undefined as unknown,
    position_b: undefined as unknown,
    position_c: undefined as unknown
  };

  if (matches.length > 0) {
    const match = matches[0]; // Use first match for team assignments
    if (match.team_a) {
      teams.position_a = {
        id: match.team_a.id,
        name: match.team_a.name,
        captain_name: match.team_a.captain_id, // Would need to join with users
        current_rank: 1, // Would need to get from standings
        win_percentage: 0, // Would need to calculate
        point_differential: 0 // Would need to calculate
      };
    }
    // Similar for position_b and position_c
  }

  return teams;
}

/**
 * Group standings by tier
 */
function groupStandingsByTier(standings: LeagueStanding[]) {
  const tierMap = new Map<number, LeagueStanding[]>();

  standings.forEach(standing => {
    if (!tierMap.has(standing.current_tier)) {
      tierMap.set(standing.current_tier, []);
    }
    tierMap.get(standing.current_tier)!.push(standing);
  });

  return Array.from(tierMap.entries()).map(([tier, tierStandings]) => ({
    tier_number: tier,
    teams: tierStandings.sort((a, b) => a.tier_rank - b.tier_rank)
  })).sort((a, b) => a.tier_number - b.tier_number);
}

/**
 * Get current week number
 */
function getCurrentWeek(matches: Match[]): number {
  const today = new Date();
  const currentMatches = matches.filter(m => {
    const matchDate = new Date(m.match_date);
    return matchDate >= today;
  });

  if (currentMatches.length === 0) {
    return Math.max(...matches.map(m => m.week_number), 1);
  }

  return Math.min(...currentMatches.map(m => m.week_number));
}

/**
 * Recalculate standings for a league and week
 * This calls the comprehensive standings calculation algorithm
 */
async function recalculateStandings(leagueId: number, weekNumber: number): Promise<void> {
  try {
    // Import the algorithm dynamically to avoid circular dependencies
    const { recalculateStandings: algorithmRecalculate } = await import('./volleyballAlgorithms');
    await algorithmRecalculate(leagueId, weekNumber);
  } catch (error) {
    console.error(`Error recalculating standings for league ${leagueId}, week ${weekNumber}:`, error);
    throw error;
  }
}

/**
 * Get available schedule templates
 */
export async function getScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const { data, error } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

// =============================================
// TIER MOVEMENT MANAGEMENT
// =============================================

/**
 * Calculate suggested tier movements for a league
 */
export async function calculateTierMovements(
  leagueId: number,
  weekNumber: number
): Promise<TierMovementPreview[]> {
  try {
    const { calculateTierMovements: algorithmCalculate } = await import('./volleyballAlgorithms');
    return await algorithmCalculate(leagueId, weekNumber);
  } catch (error) {
    console.error('Error calculating tier movements:', error);
    throw error;
  }
}

/**
 * Apply tier movements to teams
 */
export async function applyTierMovements(
  leagueId: number,
  weekNumber: number,
  movements: TierMovementPreview[],
  userId: string,
  automated: boolean = false
): Promise<void> {
  try {
    const { applyTierMovements: algorithmApply } = await import('./volleyballAlgorithms');
    await algorithmApply(leagueId, weekNumber, movements, userId, automated);
  } catch (error) {
    console.error('Error applying tier movements:', error);
    throw error;
  }
}

/**
 * Generate schedule for a league week
 */
export async function generateWeekSchedule(
  leagueId: number,
  weekNumber: number,
  templateId: number,
  preserveTiers: boolean = true
): Promise<Match[]> {
  try {
    const { generateWeekSchedule: algorithmGenerate } = await import('./volleyballAlgorithms');
    return await algorithmGenerate(leagueId, weekNumber, templateId, preserveTiers);
  } catch (error) {
    console.error('Error generating week schedule:', error);
    throw error;
  }
}

/**
 * Trigger automatic tier movement calculation and application
 */
export async function processAutomaticTierMovements(
  leagueId: number,
  weekNumber: number,
  userId: string
): Promise<TierMovementPreview[]> {
  try {
    // Calculate movements
    const movements = await calculateTierMovements(leagueId, weekNumber);
    
    // Apply automatic movements (only teams that clearly qualify)
    const automaticMovements = movements.filter(movement => 
      Math.abs(movement.current_tier - movement.suggested_tier) === 1 && // Only single tier moves
      (movement.performance_metrics.win_percentage >= 0.8 || movement.performance_metrics.win_percentage <= 0.2) // Clear winners/losers
    );
    
    if (automaticMovements.length > 0) {
      await applyTierMovements(leagueId, weekNumber, automaticMovements, userId, true);
    }
    
    return movements;
  } catch (error) {
    console.error('Error processing automatic tier movements:', error);
    throw error;
  }
}