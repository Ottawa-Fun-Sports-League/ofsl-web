export const INITIAL_FILTERS = {
  administrator: false,
  facilitator: false,
  activePlayer: false,
  pendingUsers: false,
  playersNotInLeague: false,
  sportsInLeague: [] as number[],
  sportsWithSkill: [] as number[]
};

// Sports are loaded dynamically from DB for filters

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
