export interface UserSportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

export interface User {
  id: string;
  auth_id: string | null;
  name: string | null;
  email: string | null;
  phone: string;
  preferred_position: string | null;
  is_admin: boolean | null;
  is_facilitator: boolean | null;
  date_created: string;
  date_modified: string;
  team_ids: number[] | null;
  user_sports_skills?: UserSportSkill[] | null;
  current_registrations?: {
    team_id: number;
    team_name: string;
    league_id: number;
    league_name: string;
    sport_name: string;
  }[] | null;
}

export type SortField = 'name' | 'email' | 'phone' | 'date_created' | 'is_admin' | 'is_facilitator' | 'team_count';
export type SortDirection = 'asc' | 'desc';

export interface UserFilters {
  administrator: boolean;
  facilitator: boolean;
  activePlayer: boolean;
  volleyballPlayersInLeague: boolean;
  playersNotInLeague: boolean;
  volleyballPlayersAll: boolean;
  badmintonPlayersAll: boolean;
}

export interface UserRegistration {
  id: number;
  name: string;
  sport_name: string | null;
  role: 'captain' | 'player';
}

export interface EditUserForm {
  name?: string;
  email?: string;
  phone?: string;
  preferred_position?: string;
  is_admin?: boolean;
  is_facilitator?: boolean;
}