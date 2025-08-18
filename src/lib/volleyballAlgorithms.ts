// =============================================
// Volleyball Tier Movement & Scheduling Algorithms
// =============================================
// Algorithms for calculating tier movements and automatic scheduling

import { supabase } from './supabase';
import type { 
  LeagueStanding, 
  Match, 
  TierMovementPreview 
} from '../types/volleyball';

// =============================================
// TIER MOVEMENT ALGORITHMS
// =============================================

/**
 * Calculate tier movements based on performance metrics
 */
export async function calculateTierMovements(
  leagueId: number,
  weekNumber: number
): Promise<TierMovementPreview[]> {
  try {
    // Get current standings for all teams
    const { data: standings, error } = await supabase
      .from('league_standings')
      .select(`
        *,
        team:teams(id, name)
      `)
      .eq('league_id', leagueId)
      .eq('week_number', weekNumber)
      .order('current_tier')
      .order('tier_rank');

    if (error) throw error;
    if (!standings || standings.length === 0) return [];

    const movements: TierMovementPreview[] = [];
    
    // Group standings by tier
    const tierGroups = groupStandingsByTier(standings);
    const tierNumbers = Object.keys(tierGroups).map(Number).sort();
    
    // Apply tier movement rules for each tier
    for (let i = 0; i < tierNumbers.length; i++) {
      const currentTier = tierNumbers[i];
      const tierStandings = tierGroups[currentTier];
      
      if (!tierStandings || tierStandings.length === 0) continue;
      
      // Sort by performance (tier_rank should already be correct, but ensure)
      tierStandings.sort((a, b) => a.tier_rank - b.tier_rank);
      
      // Promotion candidates (top performers in lower tiers)
      if (i < tierNumbers.length - 1) { // Not the highest tier
        const promotionCandidates = getPromotionCandidates(tierStandings, currentTier);
        movements.push(...promotionCandidates);
      }
      
      // Relegation candidates (bottom performers in higher tiers)
      if (i > 0) { // Not the lowest tier
        const relegationCandidates = getRelegationCandidates(tierStandings, currentTier);
        movements.push(...relegationCandidates);
      }
    }
    
    return movements;
    
  } catch (error) {
    console.error('Error calculating tier movements:', error);
    throw error;
  }
}

/**
 * Apply tier movements to the database
 */
export async function applyTierMovements(
  leagueId: number,
  weekNumber: number,
  movements: TierMovementPreview[],
  userId: string,
  automated: boolean = true
): Promise<void> {
  try {
    // Start a transaction for all movements
    const tierHistoryEntries = movements.map(movement => ({
      league_id: leagueId,
      team_id: movement.team_id,
      week_number: weekNumber,
      previous_tier: movement.current_tier,
      new_tier: movement.suggested_tier,
      movement_type: movement.suggested_tier > movement.current_tier ? 'relegation' : 'promotion',
      final_rank: movement.performance_metrics.tier_rank,
      win_percentage: movement.performance_metrics.win_percentage,
      point_differential: movement.performance_metrics.point_differential,
      reason: movement.movement_reason,
      moved_by: automated ? null : userId,
      automated,
      effective_date: new Date().toISOString().split('T')[0]
    }));
    
    // Insert tier history records
    const { error: historyError } = await supabase
      .from('tier_history')
      .insert(tierHistoryEntries);
    
    if (historyError) throw historyError;
    
    // Update current standings with new tiers
    for (const movement of movements) {
      const { error: updateError } = await supabase
        .from('league_standings')
        .update({
          previous_tier: movement.current_tier,
          current_tier: movement.suggested_tier,
          tier_movement: movement.suggested_tier - movement.current_tier
        })
        .eq('league_id', leagueId)
        .eq('team_id', movement.team_id)
        .eq('week_number', weekNumber);
      
      if (updateError) throw updateError;
    }
    
  } catch (error) {
    console.error('Error applying tier movements:', error);
    throw error;
  }
}

// =============================================
// SCHEDULING ALGORITHMS
// =============================================

/**
 * Generate schedule for a league week using round-robin format
 */
export async function generateWeekSchedule(
  leagueId: number,
  weekNumber: number,
  templateId: number,
  _preserveTiers: boolean = true
): Promise<Match[]> {
  try {
    // Get teams with their current tier assignments
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id, name, captain_id,
        standings:league_standings!inner(current_tier, tier_rank)
      `)
      .eq('league_id', leagueId)
      .eq('standings.league_id', leagueId)
      .eq('standings.week_number', weekNumber - 1); // Previous week for tier info
    
    if (teamsError) throw teamsError;
    if (!teams || teams.length === 0) {
      throw new Error('No teams found for league');
    }
    
    // Get schedule template
    const { data: template, error: templateError } = await supabase
      .from('schedule_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError) throw templateError;
    if (!template) {
      throw new Error('Schedule template not found');
    }
    
    // Group teams by tier
    const teamsByTier = groupTeamsByTier(teams);
    const matches: Partial<Match>[] = [];
    
    // Generate matches for each tier
    for (const [tier, tierTeams] of Object.entries(teamsByTier)) {
      const tierNumber = parseInt(tier);
      const tierMatches = generateTierMatches(
        tierTeams,
        tierNumber,
        weekNumber,
        leagueId,
        template
      );
      matches.push(...tierMatches);
    }
    
    return matches as Match[];
    
  } catch (error) {
    console.error('Error generating week schedule:', error);
    throw error;
  }
}

/**
 * Automatically assign facilitators to matches
 */
export async function assignFacilitators(
  matches: Match[],
  _leagueId: number
): Promise<Match[]> {
  try {
    // Get available facilitators
    const { data: facilitators, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('is_facilitator', true);
    
    if (error) throw error;
    if (!facilitators || facilitators.length === 0) {
      return matches; // No facilitators available
    }
    
    // Simple round-robin assignment
    const updatedMatches = matches.map((match, index) => ({
      ...match,
      facilitator_id: facilitators[index % facilitators.length].id
    }));
    
    return updatedMatches;
    
  } catch (error) {
    console.error('Error assigning facilitators:', error);
    return matches; // Return original matches if assignment fails
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function groupStandingsByTier(standings: LeagueStanding[]): Record<number, LeagueStanding[]> {
  return standings.reduce((groups, standing) => {
    const tier = standing.current_tier;
    if (!groups[tier]) {
      groups[tier] = [];
    }
    groups[tier].push(standing);
    return groups;
  }, {} as Record<number, LeagueStanding[]>);
}

function groupTeamsByTier(teams: unknown[]): Record<number, unknown[]> {
  return teams.reduce((groups, team: any) => {
    const tier = team.standings?.[0]?.current_tier || 1;
    if (!groups[tier]) {
      groups[tier] = [];
    }
    groups[tier].push(team);
    return groups;
  }, {} as Record<number, unknown[]>);
}

function getPromotionCandidates(
  tierStandings: LeagueStanding[],
  currentTier: number
): TierMovementPreview[] {
  const movements: TierMovementPreview[] = [];
  
  // Promote top 2 teams if they meet criteria
  const topTeams = tierStandings.slice(0, Math.min(2, tierStandings.length));
  
  for (const standing of topTeams) {
    if (shouldPromoteTeam(standing)) {
      movements.push({
        team_id: standing.team_id,
        team_name: standing.team?.name || 'Unknown Team',
        current_tier: currentTier,
        suggested_tier: currentTier - 1, // Move up one tier
        movement_reason: `Top performer in Tier ${currentTier} with ${standing.match_win_percentage.toFixed(1)}% win rate`,
        performance_metrics: {
          win_percentage: standing.match_win_percentage,
          point_differential: standing.point_differential,
          tier_rank: standing.tier_rank
        }
      });
    }
  }
  
  return movements;
}

function getRelegationCandidates(
  tierStandings: LeagueStanding[],
  currentTier: number
): TierMovementPreview[] {
  const movements: TierMovementPreview[] = [];
  
  // Relegate bottom 2 teams if they meet criteria
  const bottomTeams = tierStandings.slice(-Math.min(2, tierStandings.length));
  
  for (const standing of bottomTeams) {
    if (shouldRelegateTeam(standing)) {
      movements.push({
        team_id: standing.team_id,
        team_name: standing.team?.name || 'Unknown Team',
        current_tier: currentTier,
        suggested_tier: currentTier + 1, // Move down one tier
        movement_reason: `Poor performance in Tier ${currentTier} with ${standing.match_win_percentage.toFixed(1)}% win rate`,
        performance_metrics: {
          win_percentage: standing.match_win_percentage,
          point_differential: standing.point_differential,
          tier_rank: standing.tier_rank
        }
      });
    }
  }
  
  return movements;
}

function shouldPromoteTeam(standing: LeagueStanding): boolean {
  // Promotion criteria: high win percentage and positive point differential
  return (
    standing.match_win_percentage >= 0.75 && // 75% win rate
    standing.point_differential > 20 && // Strong point differential
    standing.matches_played >= 3 // Minimum games played
  );
}

function shouldRelegateTeam(standing: LeagueStanding): boolean {
  // Relegation criteria: low win percentage and negative point differential
  return (
    standing.match_win_percentage <= 0.25 && // 25% win rate or lower
    standing.point_differential < -20 && // Poor point differential
    standing.matches_played >= 3 // Minimum games played
  );
}

interface ScheduleTemplate {
  id: number;
  match_format: string;
  [key: string]: unknown;
}

function generateTierMatches(
  teams: unknown[],
  tier: number,
  weekNumber: number,
  leagueId: number,
  template: ScheduleTemplate
): Partial<Match>[] {
  const matches: Partial<Match>[] = [];
  
  // For 3-team round robin format
  if (template.match_format === 'round_robin_3' && teams.length >= 3) {
    // Group teams into sets of 3
    for (let i = 0; i < teams.length; i += 3) {
      const groupTeams = teams.slice(i, i + 3);
      
      if (groupTeams.length >= 3) {
        // Create one match with 3 teams
        const team1 = groupTeams[0] as { id: number };
        const team2 = groupTeams[1] as { id: number };
        const team3 = groupTeams[2] as { id: number };
        
        matches.push({
          league_id: leagueId,
          week_number: weekNumber,
          tier,
          position_a: team1.id,
          position_b: team2.id,
          position_c: team3.id,
          match_format: template.match_format,
          template_id: template.id,
          status: 'scheduled',
          match_date: getMatchDate(weekNumber), // Helper function needed
          team_a_total_points: 0,
          team_b_total_points: 0,
          team_c_total_points: 0,
          team_a_sets_won: 0,
          team_b_sets_won: 0,
          team_c_sets_won: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }
  
  return matches;
}

function getMatchDate(weekNumber: number): string {
  // Simple calculation - assumes week 1 starts on a specific date
  const baseDate = new Date('2025-01-06'); // Adjust based on league start
  const matchDate = new Date(baseDate);
  matchDate.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
  return matchDate.toISOString().split('T')[0];
}

// =============================================
// STANDINGS CALCULATION
// =============================================

/**
 * Recalculate standings for a league after matches are completed
 */
export async function recalculateStandings(
  leagueId: number,
  weekNumber: number
): Promise<void> {
  try {
    // Get all completed matches for this week
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        sets:match_sets(*)
      `)
      .eq('league_id', leagueId)
      .eq('week_number', weekNumber)
      .eq('status', 'completed');
    
    if (matchesError) throw matchesError;
    if (!matches || matches.length === 0) return;
    
    // Get all teams in the league
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId);
    
    if (teamsError) throw teamsError;
    if (!teams || teams.length === 0) return;
    
    // Calculate standings for each team
    const standingsData = [];
    
    for (const team of teams) {
      const teamStats = calculateTeamStats(team.id, matches);
      standingsData.push({
        league_id: leagueId,
        team_id: team.id,
        week_number: weekNumber,
        ...teamStats
      });
    }
    
    // Delete existing standings for this week
    await supabase
      .from('league_standings')
      .delete()
      .eq('league_id', leagueId)
      .eq('week_number', weekNumber);
    
    // Insert new standings
    const { error: insertError } = await supabase
      .from('league_standings')
      .insert(standingsData);
    
    if (insertError) throw insertError;
    
    // Calculate tier rankings
    await calculateTierRankings(leagueId, weekNumber);
    
  } catch (error) {
    console.error('Error recalculating standings:', error);
    throw error;
  }
}

function calculateTeamStats(teamId: number, matches: Match[]) {
  let matchesPlayed = 0;
  let matchesWon = 0;
  let matchesLost = 0;
  let setsPlayed = 0;
  let setsWon = 0;
  let setsLost = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  
  // Find matches where this team participated
  const teamMatches = matches.filter(match => 
    match.position_a === teamId || 
    match.position_b === teamId || 
    match.position_c === teamId
  );
  
  for (const match of teamMatches) {
    matchesPlayed++;
    
    // Determine team position in this match
    const isTeamA = match.position_a === teamId;
    const isTeamB = match.position_b === teamId;
    const isTeamC = match.position_c === teamId;
    
    if (isTeamA) {
      pointsFor += match.team_a_total_points;
      pointsAgainst += match.team_b_total_points + match.team_c_total_points;
      setsWon += match.team_a_sets_won;
      
      // Determine if team won the match (most sets won)
      if (match.team_a_sets_won > match.team_b_sets_won && 
          match.team_a_sets_won > match.team_c_sets_won) {
        matchesWon++;
      } else {
        matchesLost++;
      }
    } else if (isTeamB) {
      pointsFor += match.team_b_total_points;
      pointsAgainst += match.team_a_total_points + match.team_c_total_points;
      setsWon += match.team_b_sets_won;
      
      if (match.team_b_sets_won > match.team_a_sets_won && 
          match.team_b_sets_won > match.team_c_sets_won) {
        matchesWon++;
      } else {
        matchesLost++;
      }
    } else if (isTeamC) {
      pointsFor += match.team_c_total_points;
      pointsAgainst += match.team_a_total_points + match.team_b_total_points;
      setsWon += match.team_c_sets_won;
      
      if (match.team_c_sets_won > match.team_a_sets_won && 
          match.team_c_sets_won > match.team_b_sets_won) {
        matchesWon++;
      } else {
        matchesLost++;
      }
    }
    
    // Count total sets from this match
    if (match.sets) {
      setsPlayed += match.sets.length;
    }
  }
  
  setsLost = setsPlayed - setsWon;
  const pointDifferential = pointsFor - pointsAgainst;
  const matchWinPercentage = matchesPlayed > 0 ? matchesWon / matchesPlayed : 0;
  const setWinPercentage = setsPlayed > 0 ? setsWon / setsPlayed : 0;
  
  return {
    matches_played: matchesPlayed,
    matches_won: matchesWon,
    matches_lost: matchesLost,
    sets_played: setsPlayed,
    sets_won: setsWon,
    sets_lost: setsLost,
    points_for: pointsFor,
    points_against: pointsAgainst,
    point_differential: pointDifferential,
    match_win_percentage: matchWinPercentage,
    set_win_percentage: setWinPercentage,
    calculated_at: new Date().toISOString()
  };
}

async function calculateTierRankings(leagueId: number, weekNumber: number): Promise<void> {
  // Get all standings for this week, grouped by tier
  const { data: standings, error } = await supabase
    .from('league_standings')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .order('current_tier')
    .order('match_win_percentage', { ascending: false })
    .order('point_differential', { ascending: false });
  
  if (error) throw error;
  if (!standings) return;
  
  // Group by tier and assign rankings
  const tierGroups = groupStandingsByTier(standings);
  
  for (const [_tier, tierStandings] of Object.entries(tierGroups)) {
    // Sort by performance criteria
    tierStandings.sort((a, b) => {
      // Primary: Win percentage
      if (a.match_win_percentage !== b.match_win_percentage) {
        return b.match_win_percentage - a.match_win_percentage;
      }
      // Secondary: Point differential
      if (a.point_differential !== b.point_differential) {
        return b.point_differential - a.point_differential;
      }
      // Tertiary: Points for
      return b.points_for - a.points_for;
    });
    
    // Update tier rankings
    for (let i = 0; i < tierStandings.length; i++) {
      const standing = tierStandings[i];
      await supabase
        .from('league_standings')
        .update({ tier_rank: i + 1 })
        .eq('id', standing.id);
    }
  }
}