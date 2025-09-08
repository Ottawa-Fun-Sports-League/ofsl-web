export interface UserSportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

export interface User {
  id: string;
  auth_id: string | null;
  profile_id?: string | null;
  name: string | null;
  email: string | null;
  phone: string;
  preferred_position: string | null;
  is_admin: boolean | null;
  is_facilitator?: boolean | null;  // Optional until column is added to database
  date_created: string;
  date_modified: string;
  team_ids: string[] | null;  // Stored as text array in DB
  league_ids?: (string | number)[] | null;  // Individual league registrations, stored as bigint array in DB
  user_sports_skills?: UserSportSkill[] | null;
  current_registrations?: {
    team_id?: number;
    team_name?: string;
    league_id?: number;
    league_name: string;
    sport_id?: number;
    sport_name?: string;
    amount_due: number;
    amount_paid: number;
    status: string;
    is_waitlisted: boolean;
  }[] | null;
  // Auth-specific fields for pending users
  status?: 'active' | 'pending' | 'unconfirmed' | 'confirmed_no_profile' | 'profile_incomplete';
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  // Payment fields
  total_owed?: number;
  total_paid?: number;
}

export type SortField = 'name' | 'email' | 'phone' | 'date_created' | 'is_admin' | 'is_facilitator' | 'team_count' | 'status' | 'total_owed' | 'total_paid';
export type SortDirection = 'asc' | 'desc';

export interface UserFilters {
  administrator: boolean;
  facilitator: boolean;
  activePlayer: boolean;
  pendingUsers: boolean;
  playersNotInLeague: boolean;
  sportsInLeague: number[];      // sport IDs where user is active in a league
  sportsWithSkill: number[];     // sport IDs where user has a skill set
}

export interface UserRegistration {
  id: number;
  name: string;
  sport_name: string | null;
  role: 'captain' | 'player';
  registration_type?: 'team' | 'individual';
  team_id?: number;
  league_id?: number;
}

export interface EditUserForm {
  name?: string;
  email?: string;
  phone?: string;
  preferred_position?: string;
  is_admin?: boolean;
  is_facilitator?: boolean;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface UsersDataState {
  users: User[];
  pagination: PaginationState;
  searchTerm: string;
  loading: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  filters: UserFilters;
}
