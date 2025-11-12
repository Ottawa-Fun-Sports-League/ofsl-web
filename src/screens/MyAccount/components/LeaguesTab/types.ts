import { League } from "../../../../lib/leagues";

export interface Sport {
  id: number;
  name: string;
}

export interface Skill {
  id: number;
  name: string;
}

export interface Gym {
  id: number;
  gym: string | null;
  address: string | null;
  instructions: string | null;
  locations: string[] | null;
}

export interface LeagueWithTeamCount extends League {
  team_count: number;
  spots_remaining: number;
  skill_names: string[] | null;
  has_schedule?: boolean;
  has_standings?: boolean;
}

export interface NewLeague {
  name: string;
  description: string;
  league_type: "regular_season" | "tournament" | "skills_drills" | "single_session" | null;
  gender: "Mixed" | "Female" | "Male" | null;
  sport_id: number | null;
  skill_ids: number[];
  day_of_week: number | null;
  year: string;
  start_date: string;
  end_date: string;
  cost: number | null;
  early_bird_cost?: number | null;
  early_bird_due_date?: string | null;
  max_teams: number;
  gym_ids: number[];
  hide_day?: boolean;
  payment_due_date: string;
  payment_window_hours?: number | null;
  team_registration?: boolean;
  playoff_weeks?: number;
  is_draft: boolean;
  publish_date: string | null;
}
