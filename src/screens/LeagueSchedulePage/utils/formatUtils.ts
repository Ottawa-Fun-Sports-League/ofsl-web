/**
 * Game Format Utilities
 * 
 * Comprehensive utilities for managing game formats, team positions,
 * and format-related calculations. This replaces all hardcoded format logic.
 */

import type { GameFormat, GameFormatId, TeamPositionId } from '../types';

// =============================================================================
// GAME FORMAT DEFINITIONS
// =============================================================================

/**
 * Comprehensive game format definitions with metadata
 * IMPORTANT: This order is the standardized format ordering used throughout the application
 * - Generate Schedule Modal uses this exact order
 * - Tier Edit Modal uses this exact order  
 * - All other format references should use this order
 */
export const GAME_FORMATS: readonly GameFormat[] = [
  {
    value: '3-teams-6-sets',
    label: '3 teams (6 sets)',
    teamCount: 3,
    positions: ['A', 'B', 'C'],
    description: 'Standard 3-team format with 6 sets played'
  },
  {
    value: '2-teams-4-sets',
    label: '2 teams (4 sets)',
    teamCount: 2,
    positions: ['A', 'B'],
    description: 'Standard 2-team format with 4 sets played'
  },
  {
    value: '2-teams-best-of-5',
    label: '2 teams (Best of 5)',
    teamCount: 2,
    positions: ['A', 'B'],
    description: 'Best of 5 sets format for 2 teams'
  },
  {
    value: '2-teams-best-of-3',
    label: '2 teams (Best of 3)',
    teamCount: 2,
    positions: ['A', 'B'],
    description: 'Best of 3 sets format for 2 teams'
  },
  {
    value: '4-teams-head-to-head',
    label: '4 teams (Head-to-head)',
    teamCount: 4,
    positions: ['A', 'B', 'C', 'D'],
    description: 'Head-to-head format for 4 teams'
  },
  {
    value: '6-teams-head-to-head',
    label: '6 teams (head-to-head)',
    teamCount: 6,
    positions: ['A', 'B', 'C', 'D', 'E', 'F'],
    description: 'Head-to-head format for 6 teams'
  },
  {
    value: '2-teams-elite',
    label: '2 teams (Elite)',
    teamCount: 2,
    positions: ['A', 'B'],
    description: 'Elite level 2-team format'
  },
  {
    value: '3-teams-elite-6-sets',
    label: '3 teams (Elite 6 sets)',
    teamCount: 3,
    positions: ['A', 'B', 'C'],
    description: 'Elite division 3-team format with 6 sets played'
  },
  {
    value: '3-teams-elite-9-sets',
    label: '3 teams (Elite 9 sets)',
    teamCount: 3,
    positions: ['A', 'B', 'C'],
    description: 'Elite division 3-team format with 9 sets played'
  }
] as const;

// =============================================================================
// FORMAT LOOKUP UTILITIES
// =============================================================================

// Formats temporarily disabled from selection across the app
export const DISABLED_FORMATS: readonly GameFormatId[] = [
  '2-teams-best-of-3',
] as const;

export function isFormatDisabled(formatId: string): boolean {
  return (DISABLED_FORMATS as readonly string[]).includes(formatId);
}

/**
 * Get format options in the same format used by dropdowns/selects
 * This ensures consistent ordering across all UI components
 */
export const getFormatOptions = () => {
  return GAME_FORMATS
    // Hide globally disabled formats from generic option lists
    .filter(format => !isFormatDisabled(format.value))
    .map(format => ({
      value: format.value,
      label: format.label
  }));
};

// =============================================================================
// EXISTING UTILITIES (maintained for compatibility)
// =============================================================================

/**
 * Gets format definition by ID
 */
export function getGameFormat(formatId: GameFormatId): GameFormat | undefined {
  return GAME_FORMATS.find(format => format.value === formatId);
}

/**
 * Gets team count for a format
 */
export function getTeamCountForFormat(formatId: string): number {
  const format = getGameFormat(formatId as GameFormatId);
  return format?.teamCount || 3; // Default fallback
}

/**
 * Gets required positions for a format
 */
export function getPositionsForFormat(formatId: string): TeamPositionId[] {
  const format = getGameFormat(formatId as GameFormatId);
  return format?.positions || ['A', 'B', 'C']; // Default fallback
}

/**
 * Gets format label for display
 */
export function getFormatLabel(formatId: string): string {
  const format = getGameFormat(formatId as GameFormatId);
  return format?.label || formatId; // Fallback to ID if not found
}

/**
 * Gets format description
 */
export function getFormatDescription(formatId: string): string {
  const format = getGameFormat(formatId as GameFormatId);
  return format?.description || '';
}

/**
 * Checks if a format is valid
 */
export function isValidFormat(formatId: string): formatId is GameFormatId {
  return GAME_FORMATS.some(format => format.value === formatId);
}

// =============================================================================
// CSS GRID UTILITIES
// =============================================================================

/**
 * Gets Tailwind CSS grid column class for team count
 */
export function getGridColsClass(teamCount: number): string {
  switch (teamCount) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-2';
    case 3:
      return 'grid-cols-3';
    case 4:
      return 'grid-cols-4';
    case 5:
      return 'grid-cols-5';
    case 6:
      return 'grid-cols-6';
    default:
      return 'grid-cols-3'; // Default fallback
  }
}

/**
 * Gets responsive grid classes for different screen sizes
 */
export function getResponsiveGridClasses(teamCount: number): string {
  const baseClass = getGridColsClass(teamCount);
  
  // Add responsive classes for better mobile experience
  switch (teamCount) {
    case 4:
      return `grid-cols-2 sm:${baseClass}`;
    case 5:
    case 6:
      return `grid-cols-2 sm:grid-cols-3 lg:${baseClass}`;
    default:
      return baseClass;
  }
}

/**
 * Gets grid gap class based on team count
 */
export function getGridGapClass(teamCount: number): string {
  // More teams = smaller gap to fit better
  if (teamCount >= 5) return 'gap-2';
  if (teamCount >= 3) return 'gap-4';
  return 'gap-6';
}

// =============================================================================
// POSITION UTILITIES
// =============================================================================

/**
 * All possible team positions
 */
export const ALL_TEAM_POSITIONS: readonly TeamPositionId[] = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/**
 * Checks if a position is valid for a format
 */
export function isValidPositionForFormat(position: TeamPositionId, formatId: string): boolean {
  const validPositions = getPositionsForFormat(formatId);
  return validPositions.includes(position);
}

/**
 * Gets the next available position for a format
 */
export function getNextAvailablePosition(
  formatId: string, 
  occupiedPositions: TeamPositionId[]
): TeamPositionId | null {
  const validPositions = getPositionsForFormat(formatId);
  const availablePositions = validPositions.filter(pos => !occupiedPositions.includes(pos));
  return availablePositions[0] || null;
}

/**
 * Gets position index (0-based) for ordering
 */
export function getPositionIndex(position: TeamPositionId): number {
  return ALL_TEAM_POSITIONS.indexOf(position);
}

/**
 * Sorts positions in alphabetical order
 */
export function sortPositions(positions: TeamPositionId[]): TeamPositionId[] {
  return [...positions].sort((a, b) => getPositionIndex(a) - getPositionIndex(b));
}

// =============================================================================
// FORMAT COMPATIBILITY UTILITIES
// =============================================================================

/**
 * Checks if two formats are compatible (same team count)
 */
export function areFormatsCompatible(format1: string, format2: string): boolean {
  return getTeamCountForFormat(format1) === getTeamCountForFormat(format2);
}

/**
 * Gets compatible formats for a given format (same team count)
 */
export function getCompatibleFormats(formatId: string): GameFormat[] {
  const teamCount = getTeamCountForFormat(formatId);
  return GAME_FORMATS.filter(format => format.teamCount === teamCount);
}

/**
 * Suggests best format for a given team count
 */
export function suggestFormatForTeamCount(teamCount: number): GameFormatId {
  const matchingFormats = GAME_FORMATS.filter(format => format.teamCount === teamCount);
  
  if (matchingFormats.length === 0) {
    return '3-teams-6-sets'; // Default fallback
  }
  
  // Return the most common/standard format for each team count
  const preferredFormats: Record<number, GameFormatId> = {
    2: '2-teams-4-sets',
    3: '3-teams-6-sets',
    4: '4-teams-head-to-head',
    6: '6-teams-head-to-head'
  };
  
  return preferredFormats[teamCount] || matchingFormats[0].value;
}

// =============================================================================
// FORMAT CONVERSION UTILITIES
// =============================================================================

/**
 * Gets the minimum format that can accommodate a number of teams
 */
export function getMinimumFormatForTeams(teamCount: number): GameFormatId {
  if (teamCount <= 2) return '2-teams-4-sets';
  if (teamCount <= 3) return '3-teams-6-sets';
  if (teamCount <= 4) return '4-teams-head-to-head';
  return '6-teams-head-to-head';
}

/**
 * Checks if a format can accommodate a specific number of teams
 */
export function canFormatAccommodateTeams(formatId: string, teamCount: number): boolean {
  return getTeamCountForFormat(formatId) >= teamCount;
}

/**
 * Gets format upgrade path (for when more teams are added)
 */
export function getFormatUpgradePath(currentFormat: string, requiredTeamCount: number): GameFormatId[] {
  const currentTeamCount = getTeamCountForFormat(currentFormat);
  
  if (currentTeamCount >= requiredTeamCount) {
    return []; // No upgrade needed
  }
  
  const possibleFormats = GAME_FORMATS
    .filter(format => format.teamCount >= requiredTeamCount)
    .sort((a, b) => a.teamCount - b.teamCount);
  
  return possibleFormats.map(format => format.value);
}

// =============================================================================
// TEAM CAPACITY UTILITIES
// =============================================================================

/**
 * Calculates team capacity utilization for a format
 */
export function calculateTeamCapacityUtilization(
  formatId: string,
  assignedTeamCount: number
): {
  capacity: number;
  assigned: number;
  available: number;
  utilizationPercentage: number;
  isFull: boolean;
  isEmpty: boolean;
} {
  const capacity = getTeamCountForFormat(formatId);
  const assigned = Math.min(assignedTeamCount, capacity); // Cap at capacity
  const available = capacity - assigned;
  const utilizationPercentage = capacity > 0 ? (assigned / capacity) * 100 : 0;
  
  return {
    capacity,
    assigned,
    available,
    utilizationPercentage,
    isFull: assigned >= capacity,
    isEmpty: assigned === 0
  };
}

/**
 * Gets capacity status color class for UI
 */
export function getCapacityStatusColor(utilizationPercentage: number): string {
  if (utilizationPercentage >= 100) return 'text-green-600';
  if (utilizationPercentage >= 75) return 'text-yellow-600';
  if (utilizationPercentage >= 25) return 'text-blue-600';
  return 'text-gray-400';
}

// =============================================================================
// FORMAT STATISTICS UTILITIES
// =============================================================================

/**
 * Calculates statistics for a collection of formats
 */
export function calculateFormatStatistics(formats: string[]): {
  distribution: Record<GameFormatId, { count: number; percentage: number }>;
  mostCommon: GameFormatId | null;
  teamCountDistribution: Record<number, number>;
  averageTeamCount: number;
} {
  const distribution: Record<string, { count: number; percentage: number }> = {};
  const teamCountDistribution: Record<number, number> = {};
  let totalTeamCount = 0;
  
  // Count format occurrences and team counts
  formats.forEach(format => {
    // Format distribution
    if (!distribution[format]) {
      distribution[format] = { count: 0, percentage: 0 };
    }
    distribution[format].count++;
    
    // Team count distribution
    const teamCount = getTeamCountForFormat(format);
    teamCountDistribution[teamCount] = (teamCountDistribution[teamCount] || 0) + 1;
    totalTeamCount += teamCount;
  });
  
  // Calculate percentages
  const total = formats.length;
  Object.keys(distribution).forEach(format => {
    distribution[format].percentage = total > 0 ? (distribution[format].count / total) * 100 : 0;
  });
  
  // Find most common format
  const mostCommon = Object.keys(distribution).reduce<string | null>((most, format) => {
    if (!most) return format;
    return distribution[format].count > (distribution[most]?.count || 0) ? format : most;
  }, null);
  
  return {
    distribution: distribution as Record<GameFormatId, { count: number; percentage: number }>,
    mostCommon: mostCommon as GameFormatId | null,
    teamCountDistribution,
    averageTeamCount: total > 0 ? totalTeamCount / total : 0
  };
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates a format configuration
 */
export function validateFormatConfiguration(formatId: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!formatId) {
    errors.push('Format ID is required');
    return { isValid: false, errors, warnings };
  }
  
  if (!isValidFormat(formatId)) {
    errors.push(`Invalid format ID: ${formatId}`);
    return { isValid: false, errors, warnings };
  }
  
  const format = getGameFormat(formatId)!;
  
  // Validation rules
  if (format.teamCount < 2) {
    warnings.push('Format supports fewer than 2 teams');
  }
  
  if (format.teamCount > 6) {
    warnings.push('Format supports more than 6 teams (may cause UI layout issues)');
  }
  
  if (format.positions.length !== format.teamCount) {
    errors.push('Position count does not match team count');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// =============================================================================
// CONSTANTS FOR EXTERNAL USE
// =============================================================================

/**
 * Default format for new tiers
 */
export const DEFAULT_FORMAT: GameFormatId = '3-teams-6-sets';

/**
 * Most commonly used formats (for quick selection)
 */
export const COMMON_FORMATS: readonly GameFormatId[] = [
  '3-teams-6-sets',
  '2-teams-4-sets',
  '4-teams-head-to-head',
  '6-teams-head-to-head'
] as const;

/**
 * Format categories for organized display
 */
export function getFormatCategories() {
  return {
    twoTeam: GAME_FORMATS.filter(f => f.teamCount === 2),
    threeTeam: GAME_FORMATS.filter(f => f.teamCount === 3),
    fourTeam: GAME_FORMATS.filter(f => f.teamCount === 4),
    sixTeam: GAME_FORMATS.filter(f => f.teamCount === 6)
  } as const;
}

/**
 * Builds display labels for all tiers in a week, producing sequential labels:
 * - For 2-teams-elite: pairs become N A then N B
 * - For all other formats: single label N
 * This is context-aware so mixed formats remain in numeric order without gaps.
 */
export function buildWeekTierLabels(
  weeklyTiers: Array<{ id?: number; tier_number: number; format: string }>
): Map<number, string> {
  const map = new Map<number, string>();
  if (!weeklyTiers || weeklyTiers.length === 0) return map;

  const sorted = [...weeklyTiers].sort((a, b) => (a.tier_number || 0) - (b.tier_number || 0));

  // New logic: ensure 2-team elite A/B are paired for numbering even if
  // a non-elite tier appears between them. Example desired labels:
  // 1A, 1B, 2A, 2B, 3 ...
  let index = 1;
  const pendingElite: Array<{ key: number }> = [];
  const queuedNonElite: number[] = [];

  const assignPair = () => {
    if (pendingElite.length === 2) {
      const a = pendingElite[0];
      const b = pendingElite[1];
      map.set(a.key, `${index}A`);
      map.set(b.key, `${index}B`);
      index += 1;
      pendingElite.length = 0;
    }
  };

  const flushQueuedSingles = () => {
    while (queuedNonElite.length > 0) {
      const k = queuedNonElite.shift()!;
      map.set(k, `${index}`);
      index += 1;
    }
  };

  for (const t of sorted) {
    const idKey = (t.id ?? t.tier_number) as number;
    if (t.format === '2-teams-elite') {
      pendingElite.push({ key: idKey });
      if (pendingElite.length === 2) {
        assignPair();
        flushQueuedSingles();
      }
    } else {
      // If a pair is in progress, postpone singles until the pair closes
      if (pendingElite.length === 1) {
        queuedNonElite.push(idKey);
      } else {
        map.set(idKey, `${index}`);
        index += 1;
      }
    }
  }

  // Finalize any leftovers
  if (pendingElite.length === 1) {
    const a = pendingElite[0];
    map.set(a.key, `${index}A`);
    index += 1;
    pendingElite.length = 0;
  }
  flushQueuedSingles();

  return map;
}

/**
 * Builds a human-readable tier label for a given format.
 * Elite 2-team tiers are grouped into A/B sub-tiers (e.g. 1A, 1B).
 */
export function getTierDisplayLabel(formatId: string | undefined, tierNumber: number | null | undefined): string {
  if (tierNumber === null || tierNumber === undefined) {
    return '';
  }

  const numericTier = Number(tierNumber);
  if (!Number.isFinite(numericTier) || numericTier <= 0) {
    return String(tierNumber);
  }

  if (formatId === '2-teams-elite') {
    const baseTier = Math.floor((numericTier - 1) / 2) + 1;
    const suffix = numericTier % 2 === 1 ? 'A' : 'B';
    return baseTier.toString() + suffix;
  }

  return numericTier.toString();
}

