export const INITIAL_FILTERS = {
  administrator: false,
  facilitator: false,
  activePlayer: false,
  pendingUsers: false,
  volleyballPlayersInLeague: false,
  badmintonPlayersInLeague: false,
  playersNotInLeague: false,
  volleyballPlayersAll: false,
  badmintonPlayersAll: false
};

// Sport IDs - these should match the IDs in your sports table
export const SPORT_IDS = {
  VOLLEYBALL: 1,
  BADMINTON: 2
};

export const POSITION_OPTIONS = [
  { value: '', label: 'Select position...' },
  { value: 'Guard', label: 'Guard' },
  { value: 'Forward', label: 'Forward' },
  { value: 'Center', label: 'Center' }
];

export const SORT_FIELDS = {
  NAME: 'name' as const,
  EMAIL: 'email' as const,
  PHONE: 'phone' as const,
  DATE_CREATED: 'date_created' as const,
  IS_ADMIN: 'is_admin' as const,
  IS_FACILITATOR: 'is_facilitator' as const,
  TEAM_COUNT: 'team_count' as const
};