/**
 * Comprehensive Type Definitions for League Scheduling System
 * 
 * This file consolidates all scheduling-related types and serves as the
 * single source of truth for data structures across the application.
 */

// =============================================================================
// CORE DATABASE TYPES
// =============================================================================

/**
 * Team position data - represents a team in a specific tier position
 */
export interface TeamPosition {
  name: string;
  ranking: number;
}

/**
 * Weekly Schedule Tier - matches database schema exactly
 * This is the primary data structure from the weekly_schedules table
 */
export interface WeeklyScheduleTier {
  id: number;
  league_id?: number;
  week_number?: number;
  tier_number: number;
  location: string;
  time_slot: string;
  court: string;
  format: string;
  is_elite?: boolean;
  team_a_name: string | null;
  team_a_ranking: number | null;
  team_b_name: string | null;
  team_b_ranking: number | null;
  team_c_name: string | null;
  team_c_ranking: number | null;
  team_d_name: string | null;
  team_d_ranking: number | null;
  team_e_name: string | null;
  team_e_ranking: number | null;
  team_f_name: string | null;
  team_f_ranking: number | null;
  is_completed: boolean;
  no_games?: boolean;
  is_playoff?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Normalized Tier - for easier programmatic access to teams
 * Converts flat database structure to organized team positions
 */
export interface NormalizedTier {
  id: number;
  league_id?: number;
  week_number?: number;
  tier_number: number;
  location: string;
  time_slot: string;
  court: string;
  format: string;
  is_elite?: boolean;
  teams: {
    A: TeamPosition | null;
    B: TeamPosition | null;
    C: TeamPosition | null;
    D: TeamPosition | null;
    E: TeamPosition | null;
    F: TeamPosition | null;
  };
  is_completed: boolean;
  no_games?: boolean;
  is_playoff?: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// FORMAT & POSITION TYPES
// =============================================================================

/**
 * Team positions - standardized position identifiers
 */
export type TeamPositionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * All supported game formats
 */
export type GameFormatId = 
  | '3-teams-6-sets'
  | '3-teams-elite-6-sets'
  | '3-teams-elite-9-sets'
  | '2-teams-4-sets'
  | '2-teams-best-of-5'
  | '2-teams-best-of-3'
  | '4-teams-head-to-head'
  | '6-teams-head-to-head'
  | '2-teams-elite';

/**
 * Game format definition
 */
export interface GameFormat {
  value: GameFormatId;
  label: string;
  teamCount: 2 | 3 | 4 | 6;
  positions: TeamPositionId[];
  description?: string;
}

// =============================================================================
// UI & INTERACTION TYPES
// =============================================================================

/**
 * Drag and drop state for team management
 */
export interface DragState {
  isDragging: boolean;
  draggedTeam: string | null;
  fromTier: number | null;
  fromPosition: string | null;
  hoverTier: number | null;
  hoverPosition: string | null;
  mouseX: number;
  mouseY: number;
}

/**
 * Modal states and configurations
 */
export interface TierEditFormData {
  location: string;
  time: string;
  court: string;
  format: GameFormatId;
  customTime: string;
}

export interface DefaultSettings {
  location: string;
  time: string;
  court: string;
}

export interface SetAsDefaultOptions {
  location: boolean;
  time: boolean;
  court: boolean;
}

// =============================================================================
// VALIDATION & UTILITY TYPES
// =============================================================================

/**
 * Format validation result
 */
export interface FormatValidationResult {
  isValid: boolean;
  reason?: string;
  teamsAffected?: string[];
  positionsAffected?: TeamPositionId[];
}

/**
 * Team operation result
 */
export interface TeamOperationResult {
  success: boolean;
  message?: string;
  updatedTier?: WeeklyScheduleTier;
  error?: string;
}

/**
 * Week navigation constraints
 */
export interface WeekNavigationInfo {
  currentWeek: number;
  minWeek: number;
  maxWeek: number;
  totalWeeks: number;
  playoffStartWeek?: number;
  canNavigateTo: (week: number) => boolean;
  isPlayoffWeek: (week: number) => boolean;
}

// =============================================================================
// DATABASE OPERATION TYPES
// =============================================================================

/**
 * Database update payload for tier modifications
 */
export interface TierUpdatePayload {
  location?: string;
  time_slot?: string;
  court?: string;
  format?: GameFormatId;
  is_elite?: boolean;
  team_a_name?: string | null;
  team_a_ranking?: number | null;
  team_b_name?: string | null;
  team_b_ranking?: number | null;
  team_c_name?: string | null;
  team_c_ranking?: number | null;
  team_d_name?: string | null;
  team_d_ranking?: number | null;
  team_e_name?: string | null;
  team_e_ranking?: number | null;
  team_f_name?: string | null;
  team_f_ranking?: number | null;
  is_completed?: boolean;
  no_games?: boolean;
  updated_at?: string;
}

/**
 * Batch operation for updating multiple weeks
 */
export interface BatchTierUpdate {
  currentWeekUpdate: TierUpdatePayload & { id: number };
  futureWeeksUpdate?: {
    payload: Pick<TierUpdatePayload, 'location' | 'time_slot' | 'court' | 'format'>;
    where: {
      league_id: number;
      tier_number: number;
      week_number_gt: number;
    };
  };
}

// =============================================================================
// TEAM MANAGEMENT TYPES
// =============================================================================

/**
 * Available team for scheduling
 */
export interface AvailableTeam {
  id: number;
  name: string;
  captain_id: string;
  captain_name: string | null;
  skill_name: string | null;
  isScheduled: boolean;
  league_id?: number;
}

/**
 * Team assignment operation
 */
export interface TeamAssignment {
  teamName: string;
  teamRanking: number;
  targetTier: number;
  targetPosition: TeamPositionId;
  sourceInfo?: {
    tier: number;
    position: TeamPositionId;
  };
}

// =============================================================================
// LEAGUE CONFIGURATION TYPES
// =============================================================================

/**
 * League schedule configuration
 */
export interface LeagueScheduleConfig {
  league_id: number;
  start_date: string;
  end_date: string;
  total_weeks: number;
  playoff_weeks: number;
  default_location: string;
  default_time_slot: string;
  default_court: string;
  default_format: GameFormatId;
}

// =============================================================================
// LEGACY TYPE COMPATIBILITY (TO BE REMOVED)
// =============================================================================

/**
 * @deprecated Use WeeklyScheduleTier instead
 * Legacy Tier interface - kept for backward compatibility only
 */
export interface LegacyTier {
  tierNumber: number;
  location: string;
  time: string;
  court: string;
  format?: string;
  teams: Record<string, { name: string; ranking: number } | null>;
  courts: Record<string, string>;
}

/**
 * @deprecated Use WeeklyScheduleTier[] instead
 * Legacy Schedule interface - kept for backward compatibility only
 */
export interface LegacySchedule {
  week: number;
  date: string;
  tiers: LegacyTier[];
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

/**
 * Type guard to check if a value is a valid TeamPositionId
 */
export function isValidTeamPosition(position: string): position is TeamPositionId {
  return ['A', 'B', 'C', 'D', 'E', 'F'].includes(position);
}

/**
 * Type guard to check if a value is a valid GameFormatId
 */
export function isValidGameFormat(format: string): format is GameFormatId {
  const validFormats: GameFormatId[] = [
    '3-teams-6-sets',
    '3-teams-elite-6-sets',
    '3-teams-elite-9-sets',
    '2-teams-4-sets',
    '2-teams-best-of-5',
    '2-teams-best-of-3',
    '4-teams-head-to-head',
    '6-teams-head-to-head',
    '2-teams-elite'
  ];
  return validFormats.includes(format as GameFormatId);
}

