// =============================================
// Volleyball Schedule & Standings Types
// =============================================
// TypeScript types for the volleyball league management system

// =============================================
// ENUM TYPES
// =============================================

export type MatchStatus = 
  | 'scheduled'
  | 'in_progress' 
  | 'completed'
  | 'postponed'
  | 'cancelled';

export type MatchFormat = 
  | 'round_robin_3'
  | 'round_robin_4'
  | 'elimination_3'
  | 'king_court'
  | 'pool_play'
  | 'bracket_single'
  | 'bracket_double';

export type ScorePermission = 
  | 'admin'
  | 'facilitator'
  | 'captain'
  | 'none';

export type TierMovementType = 
  | 'promotion'
  | 'relegation'
  | 'manual'
  | 'initial';

// =============================================
// CORE INTERFACES
// =============================================

export interface ScheduleTemplate {
  id: number;
  name: string;
  description?: string;
  match_format: MatchFormat;
  teams_per_match: number;
  sets_per_match: number;
  points_per_set: number;
  min_point_difference: number;
  max_sets?: number;
  tie_break_points?: number;
  active: boolean;
  created_at: string;
}

export interface Match {
  id: number;
  league_id: number;
  week_number: number;
  match_date: string;
  tier: number;
  
  // Team positions
  position_a?: number;
  position_b?: number;
  position_c?: number;
  
  // Team details (populated via joins)
  team_a?: {
    id: number;
    name: string;
    captain_id: string;
  };
  team_b?: {
    id: number;
    name: string;
    captain_id: string;
  };
  team_c?: {
    id: number;
    name: string;
    captain_id: string;
  };
  
  // Venue details
  gym_id?: number;
  gym?: {
    id: number;
    gym: string;
    address?: string;
  };
  court?: string;
  time_slot?: string;
  
  // Match configuration
  match_format: MatchFormat;
  template_id?: number;
  template?: ScheduleTemplate;
  
  // Match state
  status: MatchStatus;
  facilitator_id?: string;
  facilitator?: {
    id: string;
    name: string;
  };
  
  // Scoring summary
  team_a_total_points: number;
  team_b_total_points: number;
  team_c_total_points: number;
  team_a_sets_won: number;
  team_b_sets_won: number;
  team_c_sets_won: number;
  
  // Match sets (populated when needed)
  sets?: MatchSet[];
  
  // Metadata
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface MatchSet {
  id: number;
  match_id: number;
  set_number: number;
  
  // Set scores
  team_a_score: number;
  team_b_score: number;
  team_c_score: number;
  
  // Set metadata
  duration_minutes?: number;
  is_tie_break: boolean;
  notes?: string;
  
  // Timestamps
  started_at?: string;
  completed_at: string;
}

export interface LeagueStanding {
  id: number;
  league_id: number;
  team_id: number;
  team?: {
    id: number;
    name: string;
    captain_id: string;
    captain?: {
      id: string;
      name: string;
    };
  };
  week_number: number;
  
  // Current placement
  current_tier: number;
  tier_rank: number;
  
  // Match statistics
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  
  // Set statistics
  sets_played: number;
  sets_won: number;
  sets_lost: number;
  
  // Point statistics
  points_for: number;
  points_against: number;
  point_differential: number;
  
  // Win percentages
  match_win_percentage: number;
  set_win_percentage: number;
  
  // Tier movement
  previous_tier?: number;
  tier_movement: number; // -1, 0, +1
  
  calculated_at: string;
}

export interface TierHistoryEntry {
  id: number;
  league_id: number;
  team_id: number;
  team?: {
    id: number;
    name: string;
  };
  week_number: number;
  
  // Movement details
  previous_tier?: number;
  new_tier: number;
  movement_type: TierMovementType;
  
  // Performance metrics
  final_rank?: number;
  win_percentage?: number;
  point_differential?: number;
  
  // Movement metadata
  reason?: string;
  moved_by?: string;
  automated: boolean;
  
  effective_date: string;
  created_at: string;
}

// =============================================
// COMPOSITE TYPES FOR UI
// =============================================

export interface WeeklySchedule {
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  matches: Match[];
  tiers: TierSchedule[];
}

export interface TierSchedule {
  tier_number: number;
  matches: Match[];
  teams: {
    position_a?: TierTeam;
    position_b?: TierTeam;
    position_c?: TierTeam;
  };
}

export interface TierTeam {
  id: number;
  name: string;
  captain_name: string;
  current_rank: number;
  win_percentage: number;
  point_differential: number;
}

export interface TierStandings {
  tier_number: number;
  teams: LeagueStanding[];
}

export interface MatchResult {
  match_id: number;
  sets: {
    set_number: number;
    team_a_score: number;
    team_b_score: number;
    team_c_score: number;
  }[];
  notes?: string;
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface ScheduleRequest {
  league_id: number;
  week_number?: number;
  include_past?: boolean;
}

export interface ScheduleResponse {
  current_week: number;
  total_weeks: number;
  schedules: WeeklySchedule[];
}

export interface StandingsRequest {
  league_id: number;
  week_number?: number;
  tier?: number;
}

export interface StandingsResponse {
  current_week: number;
  total_teams: number;
  tiers: TierStandings[];
  last_updated: string;
}

export interface ScoreSubmissionRequest {
  match_id: number;
  sets: {
    set_number: number;
    team_a_score: number;
    team_b_score: number;
    team_c_score?: number;
  }[];
  notes?: string;
}

export interface ScoreSubmissionResponse {
  success: boolean;
  match: Match;
  updated_standings?: LeagueStanding[];
  tier_movements?: TierHistoryEntry[];
}

// =============================================
// UTILITY TYPES
// =============================================

export interface ScoreEntryPermissions {
  can_enter_scores: boolean;
  permission_level: ScorePermission;
  reason?: string;
}

export interface TierMovementPreview {
  team_id: number;
  team_name: string;
  current_tier: number;
  suggested_tier: number;
  movement_reason: string;
  performance_metrics: {
    win_percentage: number;
    point_differential: number;
    tier_rank: number;
  };
}

export interface MatchValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================
// FORM TYPES
// =============================================

export interface ScheduleGenerationForm {
  league_id: number;
  start_week: number;
  num_weeks: number;
  template_id: number;
  preserve_tiers: boolean;
  auto_assign_facilitators: boolean;
}

export interface BulkScoreEntryForm {
  matches: {
    match_id: number;
    sets: {
      set_number: number;
      scores: number[];
    }[];
  }[];
}

export interface TierManagementForm {
  league_id: number;
  week_number: number;
  movements: {
    team_id: number;
    from_tier: number;
    to_tier: number;
    reason: string;
  }[];
}