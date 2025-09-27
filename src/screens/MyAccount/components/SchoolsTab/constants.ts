import { DayOfWeek } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' }
];

export const GYM_LOCATIONS = [
  'Central',
  'East', 
  'West',
  'South',
  'Gatineau'
] as const;

export const INITIAL_NEW_GYM_FORM = {
  gym: '',
  address: '',
  instructions: '',
  active: true,
  availableDays: [] as number[],
  availableSports: [] as number[],
  locations: [] as string[],
  facilitatorIds: [] as string[]
};

export const INITIAL_EDIT_GYM_FORM = {
  gym: '',
  address: '',
  instructions: '',
  active: true,
  availableDays: [] as number[],
  availableSports: [] as number[],
  locations: [] as string[],
  facilitatorIds: [] as string[]
};

export const INITIAL_FILTERS = {
  status: 'all' as const,
  days: [],
  sports: []
};
