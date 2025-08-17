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
  due_date: string;
  payment_method: string | null;
}

export interface Team {
  id: number;
  name: string;
  league?: {
    id: number;
    name: string;
    location?: string;
    cost?: number;
    start_date?: string;
    gym_ids?: number[];
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
  payment?: {
    id: number;
    amount_due: number;
    amount_paid: number;
  };
}