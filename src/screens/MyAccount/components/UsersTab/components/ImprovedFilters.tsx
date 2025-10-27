import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { UserFilters } from '../types';
import { useDebounce } from '../../../../../hooks/useDebounce';
import { USER_SEARCH_DEBOUNCE_MS } from '../constants';
import { supabase } from '../../../../../lib/supabase';

type FilterOption = {
  key: keyof UserFilters;
  label: string;
  description?: string;
};

type SectionDescriptor = {
  title: string;
  description?: string;
};

const ROLE_OPTIONS: FilterOption[] = [
  { key: 'administrator', label: 'Administrator' },
  { key: 'facilitator', label: 'Facilitator' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { key: 'activePlayer', label: 'Active Player', description: 'Currently rostered on an active team' },
  { key: 'playersNotInLeague', label: 'Not in League', description: 'Previously active but not in a current league' },
  { key: 'pendingUsers', label: 'Pending Users', description: 'Users without a completed profile' },
];

const SECTION_LABELS: Record<'role' | 'status' | 'sport' | 'league' | 'team' | 'tier', SectionDescriptor> = {
  role: { title: 'Role' },
  status: { title: 'Status' },
  sport: { title: 'Sport Participation' },
  league: { title: 'League Membership' },
  team: { title: 'Team Membership' },
  tier: { title: 'Tier (Schedule)' },
};

type ImprovedFiltersProps = {
  searchTerm: string;
  filters: UserFilters;
  isAnyFilterActive: boolean;
  onSearchChange: (term: string) => void;
  onFilterChange: (filterKey: keyof UserFilters) => void;
  onToggleSportInLeague: (sportId: number) => void;
  onToggleSportWithSkill: (sportId: number) => void;
  onToggleLeague: (leagueId: number) => void;
  onToggleTeam: (teamId: number) => void;
  onToggleLeagueTier: (value: string) => void;
  onClearFilters: () => void;
};

export function ImprovedFilters({
  searchTerm,
  filters,
  isAnyFilterActive,
  onSearchChange,
  onFilterChange,
  onToggleSportInLeague,
  onToggleSportWithSkill,
  onToggleLeague,
  onToggleTeam,
  onToggleLeagueTier,
  onClearFilters,
}: ImprovedFiltersProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, USER_SEARCH_DEBOUNCE_MS);
  const lastSentSearchTerm = useRef(searchTerm);

  const [sports, setSports] = useState<Array<{ id: number; name: string }>>([]);
  const [leagues, setLeagues] = useState<Array<{ id: number; name: string | null }>>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string | null; league_id: number | null }>>([]);
  const [tierOptions, setTierOptions] = useState<Array<{ value: string; league_id: number; tier_number: number }>>([]);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [tierSearch, setTierSearch] = useState('');
  const [desktopExpanded, setDesktopExpanded] = useState(true);

  useEffect(() => {
    if (debouncedSearchTerm !== lastSentSearchTerm.current) {
      lastSentSearchTerm.current = debouncedSearchTerm;
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearchChange]);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
    lastSentSearchTerm.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    const loadSports = async () => {
      const { data, error } = await supabase
        .from('sports')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (!error) setSports(data || []);
    };
    loadSports();
  }, []);

  useEffect(() => {
    const loadLeagues = async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name')
        .order('name')
        .limit(500);
      if (!error) setLeagues(data || []);
    };
    loadLeagues();
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, league_id')
        .order('name')
        .limit(5000);
      if (!error) setTeams(data || []);
    };
    loadTeams();
  }, []);

  useEffect(() => {
    const loadTiers = async () => {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('league_id, tier_number')
        .order('league_id, tier_number')
        .limit(5000);
      if (!error) {
        const seen = new Set<string>();
        const rows: Array<{ value: string; league_id: number; tier_number: number }> = [];
        (data || []).forEach((row) => {
          const leagueId = row.league_id;
          const tierNumber = row.tier_number;
          if (leagueId == null || tierNumber == null) return;
          const key = `${leagueId}:${tierNumber}`;
          if (seen.has(key)) return;
          seen.add(key);
          rows.push({ value: key, league_id: leagueId, tier_number: tierNumber });
        });
        setTierOptions(rows);
      }
    };
    loadTiers();
  }, []);

  const filterCount =
    ROLE_OPTIONS.filter((option) => !!filters[option.key]).length +
    STATUS_OPTIONS.filter((option) => !!filters[option.key]).length +
    filters.sportsInLeague.length +
    filters.sportsWithSkill.length +
    filters.leagueIds.length +
    filters.teamIds.length +
    filters.leagueTierFilters.length;

  const leagueNameMap = useMemo(() => {
    const map = new Map<number, string>();
    leagues.forEach((league) => {
      if (league.id != null) {
        map.set(league.id, league.name || `League ${league.id}`);
      }
    });
    return map;
  }, [leagues]);

  const filteredLeagues = useMemo(() => {
    if (!leagueSearch.trim()) return leagues;
    const term = leagueSearch.toLowerCase();
    return leagues.filter((league) => (league.name || `League ${league.id}`).toLowerCase().includes(term));
  }, [leagues, leagueSearch]);

  const visibleTeams = useMemo(() => {
    const base = filters.leagueIds.length === 0
      ? teams
      : teams.filter((team) => team.league_id != null && filters.leagueIds.includes(team.league_id));
    if (!teamSearch.trim()) return base;
    const term = teamSearch.toLowerCase();
    return base.filter((team) => (team.name || `Team ${team.id}`).toLowerCase().includes(term));
  }, [teams, filters.leagueIds, teamSearch]);

  const tierLabel = useCallback((value: string, fallbackLeagueId?: number, fallbackTier?: number) => {
    const [leagueIdPart, tierNumberPart] = value.split(':');
    const leagueId = fallbackLeagueId ?? Number(leagueIdPart);
    const tierNumber = fallbackTier ?? Number(tierNumberPart);
    const leagueName = leagueNameMap.get(leagueId) ?? `League ${leagueId}`;
    return `${leagueName} • Tier ${tierNumber}`;
  }, [leagueNameMap]);

  const visibleTiers = useMemo(() => {
    const base = filters.leagueIds.length === 0
      ? tierOptions
      : tierOptions.filter((option) => filters.leagueIds.includes(option.league_id));
    if (!tierSearch.trim()) return base;
    const term = tierSearch.toLowerCase();
    return base.filter((option) => tierLabel(option.value, option.league_id, option.tier_number).toLowerCase().includes(term));
  }, [tierLabel, tierOptions, filters.leagueIds, tierSearch]);

  const handleClearFilters = () => {
    setLeagueSearch('');
    setTeamSearch('');
    setTierSearch('');
    onClearFilters();
  };

  const renderBooleanOptions = (options: FilterOption[]) => (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.key}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={!!filters[option.key]}
            onChange={() => onFilterChange(option.key)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-[#6F6F6F]">{option.label}</div>
            {option.description && (
              <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
            )}
          </div>
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
          <Input
            placeholder="Search users by name, email, or phone..."
            value={localSearchTerm}
            onChange={(event) => setLocalSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Desktop filter panel */}
      <div className="hidden md:block">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#6F6F6F] uppercase tracking-wide">Filters</h3>
              <p className="text-xs text-gray-500 mt-1">Combine filters to drill down to exactly the users you need.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setDesktopExpanded((prev) => !prev)}
                className="h-8 px-3 border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                {desktopExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="text-xs font-medium">{desktopExpanded ? 'Hide' : 'Show'} Filters</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!isAnyFilterActive}
                className="h-8 px-3 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Clear All
              </Button>
            </div>
          </div>

          {desktopExpanded && (
            <div className="px-5 py-5 space-y-6">
              <div className="grid gap-6 xl:grid-cols-3 md:grid-cols-2">
                {/* Role */}
                <section className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#6F6F6F]">{SECTION_LABELS.role.title}</h4>
                  </div>
                  {renderBooleanOptions(ROLE_OPTIONS)}
                </section>

                {/* Status */}
                <section className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#6F6F6F]">{SECTION_LABELS.status.title}</h4>
                  </div>
                  {renderBooleanOptions(STATUS_OPTIONS)}
                </section>

                {/* Sports */}
                <section className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#6F6F6F]">{SECTION_LABELS.sport.title}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase">In League (Active)</div>
                    <div className="grid grid-cols-2 gap-2">
                      {sports.map((sport) => (
                        <label key={`in_${sport.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                          <input
                            type="checkbox"
                            checked={filters.sportsInLeague.includes(sport.id)}
                            onChange={() => onToggleSportInLeague(sport.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                          />
                          <span>{sport.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Has Skill</div>
                    <div className="grid grid-cols-2 gap-2">
                      {sports.map((sport) => (
                        <label key={`skill_${sport.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                          <input
                            type="checkbox"
                            checked={filters.sportsWithSkill.includes(sport.id)}
                            onChange={() => onToggleSportWithSkill(sport.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                          />
                          <span>{sport.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid gap-6 xl:grid-cols-3 md:grid-cols-2">
                {/* League */}
                <section className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#6F6F6F]">{SECTION_LABELS.league.title}</h4>
                  </div>
                <Input
                  value={leagueSearch}
                  onChange={(event) => setLeagueSearch(event.target.value)}
                  placeholder="Search leagues..."
                  className="h-9"
                />
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-gray-200 rounded-lg p-2">
                  {filteredLeagues.map((league) => (
                    <label key={`league_${league.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                      <input
                        type="checkbox"
                        checked={filters.leagueIds.includes(league.id)}
                        onChange={() => onToggleLeague(league.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                      />
                      <span>{league.name || `League ${league.id}`}</span>
                    </label>
                  ))}
                  {filteredLeagues.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-2">No leagues match that search.</div>
                  )}
                </div>
              </section>

              {/* Teams */}
              <section className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#6F6F6F]">{SECTION_LABELS.team.title}</h4>
                </div>
                <Input
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Search teams..."
                  className="h-9"
                />
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-gray-200 rounded-lg p-2">
                  {visibleTeams.map((team) => (
                    <label key={`team_${team.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                      <input
                        type="checkbox"
                        checked={filters.teamIds.includes(team.id)}
                        onChange={() => onToggleTeam(team.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                      />
                      <span>
                        {team.name || `Team ${team.id}`}
                        {team.league_id != null && (
                          <span className="ml-1 text-xs text-gray-400">({leagueNameMap.get(team.league_id) || `League ${team.league_id}`})</span>
                        )}
                      </span>
                    </label>
                  ))}
                  {visibleTeams.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      {filters.leagueIds.length > 0 ? 'No teams found for selected leagues.' : 'No teams available.'}
                    </div>
                  )}
                </div>
              </section>

              {/* Tiers */}
              <section className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#6F6F6F]">{SECTION_LABELS.tier.title}</h4>
                </div>
                <Input
                  value={tierSearch}
                  onChange={(event) => setTierSearch(event.target.value)}
                  placeholder="Search tiers..."
                  className="h-9"
                />
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-gray-200 rounded-lg p-2">
                  {visibleTiers.map((option) => (
                    <label key={`tier_${option.value}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                      <input
                        type="checkbox"
                        checked={filters.leagueTierFilters.includes(option.value)}
                        onChange={() => onToggleLeagueTier(option.value)}
                        className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                      />
                      <span>{tierLabel(option.value, option.league_id, option.tier_number)}</span>
                    </label>
                  ))}
                  {visibleTiers.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      {filters.leagueIds.length > 0 ? 'No tiers found for selected leagues.' : 'No tiers available.'}
                    </div>
                  )}
                </div>
              </section>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {filterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.filter((option) => !!filters[option.key]).map((option) => (
            <div key={option.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">{SECTION_LABELS.role.title}:</span>
              <span>{option.label}</span>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onFilterChange(option.key);
                }}
                className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {STATUS_OPTIONS.filter((option) => !!filters[option.key]).map((option) => (
            <div key={option.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">{SECTION_LABELS.status.title}:</span>
              <span>{option.label}</span>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onFilterChange(option.key);
                }}
                className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {filters.sportsInLeague.map((sportId) => {
            const sport = sports.find((s) => s.id === sportId);
            return (
              <div key={`sport-in-${sportId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">Sport (In League):</span>
                <span>{sport?.name || `Sport ${sportId}`}</span>
                <button
                  onClick={() => onToggleSportInLeague(sportId)}
                  className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {filters.sportsWithSkill.map((sportId) => {
            const sport = sports.find((s) => s.id === sportId);
            return (
              <div key={`sport-skill-${sportId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">Sport (Skill):</span>
                <span>{sport?.name || `Sport ${sportId}`}</span>
                <button
                  onClick={() => onToggleSportWithSkill(sportId)}
                  className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {filters.leagueIds.map((leagueId) => (
            <div key={`league-badge-${leagueId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">League:</span>
              <span>{leagueNameMap.get(leagueId) || `League ${leagueId}`}</span>
              <button
                onClick={() => onToggleLeague(leagueId)}
                className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {filters.teamIds.map((teamId) => {
            const team = teams.find((teamItem) => teamItem.id === teamId);
            const label = team?.name || `Team ${teamId}`;
            const leagueLabel = team?.league_id != null ? leagueNameMap.get(team.league_id) : undefined;
            return (
              <div key={`team-badge-${teamId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
                <span className="text-xs font-medium uppercase tracking-wider opacity-70">Team:</span>
                <span>
                  {label}
                  {leagueLabel ? <span className="ml-1 text-xs text-[#B20000]/70">({leagueLabel})</span> : null}
                </span>
                <button
                  onClick={() => onToggleTeam(teamId)}
                  className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {filters.leagueTierFilters.map((value) => (
            <div key={`tier-badge-${value}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm">
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">Tier:</span>
              <span>{tierLabel(value)}</span>
              <button
                onClick={() => onToggleLeagueTier(value)}
                className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <button
            onClick={handleClearFilters}
            className="text-sm text-[#B20000] hover:text-[#8A0000] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
