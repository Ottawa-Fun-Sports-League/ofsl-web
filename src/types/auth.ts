// User sports skill definition
export interface UserSportsSkill {
  id: number;
  user_id: string;
  sport_id: number;
  skill_id: number;
  created_at?: string;
  updated_at?: string;
}

// User Profile type definition
export interface UserProfile {
  id: string;
  auth_id?: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  skill_id: number | null;
  is_admin: boolean;
  is_facilitator?: boolean | null;
  team_ids: number[] | null;
  created_at?: string;
  updated_at?: string;
  preferred_position?: string | null;
  user_sports_skills?: UserSportsSkill[];
  profile_completed?: boolean;
}

// Profile completion check type
export interface ProfileCompletionFields {
  name?: boolean;
  phone?: boolean;
  skill_id?: boolean;
}