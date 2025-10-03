/**
 * Schedule Business Logic Utilities
 * 
 * This file contains all the core business logic for schedule management,
 * extracted from components to improve maintainability and testability.
 */

import type {
  WeeklyScheduleTier,
  NormalizedTier,
  GameFormatId,
  TeamPositionId,
  FormatValidationResult,
  WeekNavigationInfo
} from '../types';
import { getPositionsForFormat } from './formatUtils';

// Legacy type compatibility imports
interface LegacyTeam {
  name: string;
  ranking: number;
}

interface LegacyTier {
  tierNumber: number;
  location: string;
  time: string;
  court: string;
  format?: string;
  teams: Record<string, LegacyTeam | null>;
  courts: Record<string, string>;
}

// =============================================================================
// DATA TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Converts WeeklyScheduleTier (flat database structure) to NormalizedTier (object structure)
 */
export function normalizeWeeklyTier(tier: WeeklyScheduleTier): NormalizedTier {
  return {
    id: tier.id,
    league_id: tier.league_id,
    week_number: tier.week_number,
    tier_number: tier.tier_number,
    location: tier.location,
    time_slot: tier.time_slot,
    court: tier.court,
    format: tier.format,
    teams: {
      A: tier.team_a_name ? { name: tier.team_a_name, ranking: tier.team_a_ranking || 0 } : null,
      B: tier.team_b_name ? { name: tier.team_b_name, ranking: tier.team_b_ranking || 0 } : null,
      C: tier.team_c_name ? { name: tier.team_c_name, ranking: tier.team_c_ranking || 0 } : null,
      D: tier.team_d_name ? { name: tier.team_d_name, ranking: tier.team_d_ranking || 0 } : null,
      E: tier.team_e_name ? { name: tier.team_e_name, ranking: tier.team_e_ranking || 0 } : null,
      F: tier.team_f_name ? { name: tier.team_f_name, ranking: tier.team_f_ranking || 0 } : null,
    },
    is_completed: tier.is_completed,
    no_games: tier.no_games,
    is_playoff: tier.is_playoff,
    created_at: tier.created_at,
    updated_at: tier.updated_at
  };
}

/**
 * Converts NormalizedTier back to WeeklyScheduleTier format for database operations
 */
export function denormalizeWeeklyTier(tier: NormalizedTier): Partial<WeeklyScheduleTier> {
  return {
    id: tier.id,
    league_id: tier.league_id,
    week_number: tier.week_number,
    tier_number: tier.tier_number,
    location: tier.location,
    time_slot: tier.time_slot,
    court: tier.court,
    format: tier.format,
    team_a_name: tier.teams.A?.name || null,
    team_a_ranking: tier.teams.A?.ranking || null,
    team_b_name: tier.teams.B?.name || null,
    team_b_ranking: tier.teams.B?.ranking || null,
    team_c_name: tier.teams.C?.name || null,
    team_c_ranking: tier.teams.C?.ranking || null,
    team_d_name: tier.teams.D?.name || null,
    team_d_ranking: tier.teams.D?.ranking || null,
    team_e_name: tier.teams.E?.name || null,
    team_e_ranking: tier.teams.E?.ranking || null,
    team_f_name: tier.teams.F?.name || null,
    team_f_ranking: tier.teams.F?.ranking || null,
    is_completed: tier.is_completed,
    no_games: tier.no_games,
    is_playoff: tier.is_playoff,
    created_at: tier.created_at,
    updated_at: tier.updated_at
  };
}

/**
 * Gets team data for a specific position from a WeeklyScheduleTier
 */
export function getTeamForPosition(
  tier: WeeklyScheduleTier,
  position: TeamPositionId
): { name: string; ranking: number } | null {
  const nameKey = `team_${position.toLowerCase()}_name` as keyof WeeklyScheduleTier;
  const rankingKey = `team_${position.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
  
  const teamName = tier[nameKey] as string | null;
  const teamRanking = tier[rankingKey] as number | null;
  
  return teamName ? { name: teamName, ranking: teamRanking || 0 } : null;
}

// =============================================================================
// FORMAT VALIDATION & MANAGEMENT
// =============================================================================

/**
 * Validates if a tier can be changed to a new format without losing teams
 */
export function validateFormatChange(
  tier: WeeklyScheduleTier,
  newFormat: GameFormatId
): FormatValidationResult {
  // Non-elite formats may change among themselves
  // Allowed set: 3 teams (6 sets), 2 teams (4 sets), 2 teams (Best of 5), 4 teams (Head-to-head), 6 teams (Head-to-head)
  const SIMPLE_GROUP: readonly GameFormatId[] = [
    '3-teams-6-sets',
    '2-teams-4-sets',
    '2-teams-best-of-5',
    '4-teams-head-to-head',
    '6-teams-head-to-head',
  ] as const;

  // New restriction set: elite formats can only change among themselves
  // Allowed trio: 2 teams (Elite), 3 teams (Elite 6 sets), 3 teams (Elite 9 sets)
  const ELITE_GROUP: readonly GameFormatId[] = [
    '2-teams-elite',
    '3-teams-elite-6-sets',
    '3-teams-elite-9-sets',
  ] as const;

  const currentFormat = String(tier.format || '').toLowerCase();
  const normalizedNew = String(newFormat).toLowerCase();

  // If current format is in the simple group, only allow switching within that group
  if ((SIMPLE_GROUP as readonly string[]).includes(currentFormat)) {
    const allowed = (SIMPLE_GROUP as readonly string[]).includes(normalizedNew);
    if (!allowed) {
      return {
        isValid: false,
        reason:
          'Non-elite tiers may change only among: 3 teams (6 sets), 2 teams (4 sets), 2 teams (Best of 5), 4 teams (Head-to-head), and 6 teams (Head-to-head). Changes to elite formats are not allowed.'
      };
    }
  }

  // If current format is in the elite group, only allow switching within that group
  if ((ELITE_GROUP as readonly string[]).includes(currentFormat)) {
    const allowed = (ELITE_GROUP as readonly string[]).includes(normalizedNew);
    if (!allowed) {
      return {
        isValid: false,
        reason:
          'Tiers in 2 teams (Elite), 3 teams (Elite 6 sets), or 3 teams (Elite 9 sets) may only change between those three. Changes to 3 teams (6 sets), 2 teams (4 sets), 2 teams (Best of 5), 4 teams (head-to-head), or 6 teams (head-to-head) are not allowed.'
      };
    }
  }
  // Note: Head-to-head formats (4- and 6-team) are included in SIMPLE_GROUP above.
  // Capacity validation below will prevent data loss when reducing team counts.

  const newPositions = getPositionsForFormat(newFormat);
  const allPositions: TeamPositionId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Count existing teams
  const existingTeams: Array<{ position: TeamPositionId; name: string }> = [];
  allPositions.forEach(position => {
    const team = getTeamForPosition(tier, position);
    if (team?.name) {
      existingTeams.push({ position, name: team.name });
    }
  });
  
  // Check if new format can accommodate existing teams
  if (existingTeams.length > newPositions.length) {
    const teamsToRemove = existingTeams.slice(newPositions.length);
    
    return {
      isValid: false,
      reason: `Cannot change to this format. Current tier has ${existingTeams.length} teams (${existingTeams.map(t => t.name).join(', ')}), but ${newFormat} only supports ${newPositions.length} teams. Remove teams first.`,
      teamsAffected: teamsToRemove.map(t => t.name),
      positionsAffected: teamsToRemove.map(t => t.position)
    };
  }
  
  return { isValid: true };
}

/**
 * Repacks teams into sequential positions when format changes (only when validation passes)
 */
export function repackTeamsForFormat(
  tier: WeeklyScheduleTier,
  newFormat: GameFormatId
): Partial<WeeklyScheduleTier> {
  const newPositions = getPositionsForFormat(newFormat);
  const allPositions: TeamPositionId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Collect all existing teams with their current positions
  const existingTeams: Array<{ position: TeamPositionId; team: { name: string; ranking: number } }> = [];
  allPositions.forEach(position => {
    const team = getTeamForPosition(tier, position);
    if (team?.name) {
      existingTeams.push({ position, team });
    }
  });
  
  // Create new tier structure with sequential positioning
  const repackedTier: Partial<WeeklyScheduleTier> = {
    ...tier,
    format: newFormat,
    // Clear all team positions first
    team_a_name: null, team_a_ranking: null,
    team_b_name: null, team_b_ranking: null,
    team_c_name: null, team_c_ranking: null,
    team_d_name: null, team_d_ranking: null,
    team_e_name: null, team_e_ranking: null,
    team_f_name: null, team_f_ranking: null,
  };
  
  // Assign existing teams to sequential positions
  existingTeams.forEach((teamData, index) => {
    if (index < newPositions.length) {
      const newPosition = newPositions[index];
      const nameKey = `team_${newPosition.toLowerCase()}_name` as keyof WeeklyScheduleTier;
      const rankingKey = `team_${newPosition.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
      
      (repackedTier as Record<string, string | number | null>)[nameKey] = teamData.team.name;
      (repackedTier as Record<string, string | number | null>)[rankingKey] = teamData.team.ranking;
    }
  });
  
  return repackedTier;
}

/**
 * Checks if a tier has all positions filled for the current format
 */
export function isTierFullyFilled(tier: WeeklyScheduleTier): boolean {
  const requiredPositions = getPositionsForFormat(tier.format as GameFormatId);
  
  return requiredPositions.every(position => {
    const team = getTeamForPosition(tier, position);
    return team?.name;
  });
}

/**
 * Gets empty positions in a tier based on its format
 */
export function getEmptyPositions(tier: WeeklyScheduleTier): TeamPositionId[] {
  const requiredPositions = getPositionsForFormat(tier.format as GameFormatId);
  
  return requiredPositions.filter(position => {
    const team = getTeamForPosition(tier, position);
    return !team?.name;
  });
}

/**
 * Gets filled positions in a tier based on its format
 */
export function getFilledPositions(tier: WeeklyScheduleTier): Array<{position: TeamPositionId, team: {name: string, ranking: number}}> {
  const requiredPositions = getPositionsForFormat(tier.format as GameFormatId);
  
  return requiredPositions
    .map(position => {
      const team = getTeamForPosition(tier, position);
      return team ? { position, team } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

// =============================================================================
// TEAM MANAGEMENT UTILITIES
// =============================================================================

/**
 * Validates if a team can be assigned to a specific position
 */
export function validateTeamAssignment(
  tier: WeeklyScheduleTier,
  position: TeamPositionId,
  teamName: string
): FormatValidationResult {
  // Check if position is valid for the format
  const validPositions = getPositionsForFormat(tier.format as GameFormatId);
  if (!validPositions.includes(position)) {
    return {
      isValid: false,
      reason: `Position ${position} is not valid for format ${tier.format}`
    };
  }
  
  // Check if position is already occupied
  const existingTeam = getTeamForPosition(tier, position);
  if (existingTeam?.name) {
    return {
      isValid: false,
      reason: `Position ${position} is already occupied by ${existingTeam.name}`
    };
  }
  
  // Check if team is already assigned elsewhere in this tier
  const allPositions: TeamPositionId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  const teamAlreadyAssigned = allPositions.find(pos => {
    const team = getTeamForPosition(tier, pos);
    return team?.name === teamName;
  });
  
  if (teamAlreadyAssigned) {
    return {
      isValid: false,
      reason: `Team ${teamName} is already assigned to position ${teamAlreadyAssigned} in this tier`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates if a team move between positions/tiers is valid
 */
export function validateTeamMove(
  sourceTier: WeeklyScheduleTier,
  sourcePosition: TeamPositionId,
  targetTier: WeeklyScheduleTier,
  targetPosition: TeamPositionId
): FormatValidationResult {
  // Check if source has a team
  const sourceTeam = getTeamForPosition(sourceTier, sourcePosition);
  if (!sourceTeam?.name) {
    return {
      isValid: false,
      reason: `No team found at source position ${sourcePosition}`
    };
  }
  
  // Check if target position is valid for target tier's format
  const targetValidPositions = getPositionsForFormat(targetTier.format as GameFormatId);
  if (!targetValidPositions.includes(targetPosition)) {
    return {
      isValid: false,
      reason: `Position ${targetPosition} is not valid for format ${targetTier.format}`
    };
  }
  
  // Check if target position is empty
  const targetTeam = getTeamForPosition(targetTier, targetPosition);
  if (targetTeam?.name) {
    return {
      isValid: false,
      reason: `Target position ${targetPosition} is already occupied by ${targetTeam.name}`
    };
  }
  
  return { isValid: true };
}

// =============================================================================
// WEEK NAVIGATION UTILITIES
// =============================================================================

/**
 * Creates week navigation info for a league
 */
export function createWeekNavigationInfo(
  leagueStartDate: string,
  leagueEndDate: string,
  playoffWeeks: number,
  currentWeek: number
): WeekNavigationInfo {
  const totalWeeks = calculateWeeksBetweenDates(leagueStartDate, leagueEndDate);
  const regularSeasonWeeks = totalWeeks - playoffWeeks;
  const playoffStartWeek = regularSeasonWeeks + 1;
  
  return {
    currentWeek,
    minWeek: 1,
    maxWeek: totalWeeks,
    totalWeeks,
    playoffStartWeek: playoffWeeks > 0 ? playoffStartWeek : undefined,
    canNavigateTo: (week: number) => week >= 1 && week <= totalWeeks,
    isPlayoffWeek: (week: number) => playoffWeeks > 0 && week >= playoffStartWeek
  };
}

/**
 * Calculates week number from a date relative to league start
 */
export function getWeekNumberFromDate(date: Date, leagueStartDate: string): number {
  const startDate = new Date(leagueStartDate);
  const diffTime = date.getTime() - startDate.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, diffWeeks + 1);
}

/**
 * Calculates date for a specific week number
 */
export function getDateForWeekNumber(weekNumber: number, leagueStartDate: string): Date {
  const startDate = new Date(leagueStartDate);
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  return targetDate;
}

/**
 * Formats a week date for display
 */
export function formatWeekDate(weekNumber: number, leagueStartDate: string): string {
  const weekDate = getDateForWeekNumber(weekNumber, leagueStartDate);
  return weekDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// =============================================================================
// STATISTICS AND ANALYSIS UTILITIES
// =============================================================================

/**
 * Calculates schedule completion statistics for a week
 */
export function calculateWeekCompletionStats(tiers: WeeklyScheduleTier[]): {
  total: number;
  completed: number;
  filled: number;
  noGames: number;
  percentage: number;
} {
  const total = tiers.length;
  const completed = tiers.filter(tier => tier.is_completed).length;
  const filled = tiers.filter(tier => isTierFullyFilled(tier)).length;
  const noGames = tiers.filter(tier => tier.no_games).length;
  
  return {
    total,
    completed,
    filled,
    noGames,
    percentage: total > 0 ? (completed / total) * 100 : 0
  };
}

/**
 * Gets format distribution for a set of tiers
 */
export function getFormatDistribution(tiers: WeeklyScheduleTier[]): Record<GameFormatId, number> {
  const distribution: Record<string, number> = {};
  
  tiers.forEach(tier => {
    const format = tier.format as GameFormatId;
    distribution[format] = (distribution[format] || 0) + 1;
  });
  
  return distribution as Record<GameFormatId, number>;
}

/**
 * Finds tiers that have scheduling conflicts or issues
 */
export function findSchedulingIssues(tiers: WeeklyScheduleTier[]): Array<{
  tier: WeeklyScheduleTier;
  issues: string[];
}> {
  return tiers.map(tier => {
    const issues: string[] = [];
    
    // Check for team/ranking inconsistencies
    const allPositions: TeamPositionId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
    allPositions.forEach(position => {
      const nameKey = `team_${position.toLowerCase()}_name` as keyof WeeklyScheduleTier;
      const rankingKey = `team_${position.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
      
      const hasName = !!tier[nameKey];
      const hasRanking = !!tier[rankingKey];
      
      if (hasName !== hasRanking) {
        issues.push(`Position ${position} has inconsistent team/ranking data`);
      }
    });
    
    // Check for format compatibility with assigned teams
    const requiredPositions = getPositionsForFormat(tier.format as GameFormatId);
    const assignedPositions = getFilledPositions(tier);
    
    assignedPositions.forEach(({ position }) => {
      if (!requiredPositions.includes(position)) {
        issues.push(`Team assigned to position ${position} but format ${tier.format} doesn't support this position`);
      }
    });
    
    // Check for duplicate team assignments within tier
    const teamNames = assignedPositions.map(p => p.team.name);
    const uniqueTeamNames = new Set(teamNames);
    if (teamNames.length !== uniqueTeamNames.size) {
      issues.push('Duplicate team assignments found in tier');
    }
    
    return {
      tier,
      issues
    };
  }).filter(item => item.issues.length > 0);
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Calculates number of weeks between two dates
 */
function calculateWeeksBetweenDates(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
}

/**
 * Generates a unique identifier for sorting/keying operations
 */
export function getTierKey(tier: WeeklyScheduleTier): string {
  return `${tier.league_id || 0}-${tier.week_number || 0}-${tier.tier_number}`;
}

/**
 * Deep equality check for tiers (useful for detecting changes)
 */
export function tiersEqual(tier1: WeeklyScheduleTier, tier2: WeeklyScheduleTier): boolean {
  // Check all relevant fields for changes
  const fieldsToCompare: (keyof WeeklyScheduleTier)[] = [
    'location', 'time_slot', 'court', 'format',
    'team_a_name', 'team_a_ranking',
    'team_b_name', 'team_b_ranking',
    'team_c_name', 'team_c_ranking',
    'team_d_name', 'team_d_ranking',
    'team_e_name', 'team_e_ranking',
    'team_f_name', 'team_f_ranking',
    'is_completed', 'no_games', 'is_playoff'
  ];
  
  return fieldsToCompare.every(field => tier1[field] === tier2[field]);
}

// =============================================================================
// LEGACY TYPE COMPATIBILITY UTILITIES
// =============================================================================

/**
 * Converts legacy Tier to WeeklyScheduleTier for compatibility with new utilities
 */
export function convertLegacyTierToWeeklyScheduleTier(legacyTier: LegacyTier, tierId?: number): WeeklyScheduleTier {
  return {
    id: tierId || 0,
    tier_number: legacyTier.tierNumber,
    location: legacyTier.location,
    time_slot: legacyTier.time,
    court: legacyTier.court,
    format: legacyTier.format || '3-teams-6-sets',
    team_a_name: legacyTier.teams.A?.name || null,
    team_a_ranking: legacyTier.teams.A?.ranking || null,
    team_b_name: legacyTier.teams.B?.name || null,
    team_b_ranking: legacyTier.teams.B?.ranking || null,
    team_c_name: legacyTier.teams.C?.name || null,
    team_c_ranking: legacyTier.teams.C?.ranking || null,
    team_d_name: legacyTier.teams.D?.name || null,
    team_d_ranking: legacyTier.teams.D?.ranking || null,
    team_e_name: legacyTier.teams.E?.name || null,
    team_e_ranking: legacyTier.teams.E?.ranking || null,
    team_f_name: legacyTier.teams.F?.name || null,
    team_f_ranking: legacyTier.teams.F?.ranking || null,
    is_completed: false,
    no_games: false,
    is_playoff: false
  };
}

/**
 * Converts WeeklyScheduleTier to legacy Tier format
 */
export function convertWeeklyScheduleTierToLegacy(weeklyTier: WeeklyScheduleTier): LegacyTier {
  const teams: Record<string, LegacyTeam | null> = {};
  const positions = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  positions.forEach(position => {
    const team = getTeamForPosition(weeklyTier, position as TeamPositionId);
    teams[position] = team;
  });
  
  return {
    tierNumber: weeklyTier.tier_number,
    location: weeklyTier.location,
    time: weeklyTier.time_slot,
    court: weeklyTier.court,
    format: weeklyTier.format,
    teams,
    courts: { [weeklyTier.tier_number.toString()]: weeklyTier.court }
  };
}

/**
 * Validates format change for legacy tier (compatibility wrapper)
 */
export function validateFormatChangeCompat(legacyTier: LegacyTier, newFormat: string): FormatValidationResult {
  const weeklyTier = convertLegacyTierToWeeklyScheduleTier(legacyTier);
  return validateFormatChange(weeklyTier, newFormat as GameFormatId);
}

/**
 * Repacks teams for format change (compatibility wrapper)
 */
export function repackTeamsForFormatCompat(legacyTier: LegacyTier, newFormat: string): Record<string, LegacyTeam | null> {
  const weeklyTier = convertLegacyTierToWeeklyScheduleTier(legacyTier);
  const repackedPartialTier = repackTeamsForFormat(weeklyTier, newFormat as GameFormatId);
  
  // Merge the partial tier back with the original to ensure we have all required fields
  const fullRepackedTier: WeeklyScheduleTier = {
    ...weeklyTier,
    ...repackedPartialTier,
    format: newFormat
  };
  
  const repackedLegacyTier = convertWeeklyScheduleTierToLegacy(fullRepackedTier);
  return repackedLegacyTier.teams;
}
