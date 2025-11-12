export interface LeaguePayment {
  id: number;
  team_id: number | null;
  league_id?: number;
  league_name: string;
  team_name: string;
  amount_due: number;
  amount_paid: number;
  league_cost?: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string | null;
  payment_method: string | null;
  skill_level_id?: number | null;
  skill_name?: string | null;
  created_at?: string | null;
}

export interface TeamMatchup {
  status: 'scheduled' | 'bye' | 'no_schedule';
  weekNumber: number;
  tierNumber?: number;
  tierLabel?: string | null;
  tierPosition?: string | null;
  opponents: string[];
  location?: string | null;
  timeSlot?: string | null;
  court?: string | null;
  isPlayoff?: boolean;
  format?: string | null;
}

export interface Team {
  id: number;
  name: string;
  created_at?: string;
  league?: {
    id: number;
    name: string;
    location?: string;
    cost?: number;
    start_date?: string;
    end_date?: string;
    day_of_week?: number | null;
    playoff_weeks?: number | null;
    schedule_visible?: boolean | null;
    gym_ids?: number[];
    league_type?: string | null;
    payment_window_hours?: number | null;
    payment_due_date?: string | null;
    gyms?: Array<{
      id?: number;
      gym: string | null;
      address: string | null;
      locations: string[] | null;
    }>;
  };
  captain_id: string;
  roster: string[];
  active: boolean;
  skill_level_id?: number | null;
  skill?: {
    id: number;
    name: string;
  } | null;
  payment?: {
    id: number;
    amount_due: number;
    amount_paid: number;
    due_date?: string | null;
    created_at?: string | null;
  };
  currentMatchup?: TeamMatchup;
}
