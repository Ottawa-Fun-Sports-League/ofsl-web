export const INITIAL_FILTERS = {
  administrator: false,
  facilitator: false,
  activePlayer: false,
  pendingUsers: false,
  playersNotInLeague: false,
  sportsInLeague: [] as number[],
  sportsWithSkill: [] as number[],
  leagueIds: [] as number[],
  teamIds: [] as number[],
  leagueTierFilters: [] as string[],
};

export const USER_SEARCH_DEBOUNCE_MS = 600;

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

export const DEFAULT_BULK_EMAIL_SUBJECT = 'Update from Ottawa Fun Sports League';

export const DEFAULT_BULK_EMAIL_BODY = `
<p>Hi {{first_name}},</p>
<p>We wanted to send you an update from the Ottawa Fun Sports League.</p>
<p><strong>Replace this section with the details you would like to share.</strong></p>
<p>If you have any questions, feel free to reply to this email or reach us at <a href="mailto:info@ofsl.ca">info@ofsl.ca</a>.</p>
<p>Thanks,<br/>The OFSL Team</p>
`;
