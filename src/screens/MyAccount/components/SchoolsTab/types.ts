export interface Gym {
  id: number;
  gym: string | null;
  address: string | null;
  instructions: string | null;
  active: boolean | null;
  available_days: number[] | null;
  available_sports: number[] | null;
  locations: string[] | null;
  facilitator_ids?: string[] | null;
  facilitators?: Facilitator[];
}

export interface Facilitator {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
}

export interface Sport {
  id: number;
  name: string;
}

export interface DayOfWeek {
  id: number;
  name: string;
}

export interface SchoolFilters {
  status: 'all' | 'active' | 'inactive';
  days: number[];
  sports: number[];
}

export interface NewGymForm {
  gym: string;
  address: string;
  instructions: string;
  active: boolean;
  availableDays: number[];
  availableSports: number[];
  locations: string[];
  facilitatorIds: string[];
}

export interface EditGymForm {
  gym: string;
  address: string;
  instructions: string;
  active: boolean;
  availableDays: number[];
  availableSports: number[];
  locations: string[];
  facilitatorIds: string[];
}
