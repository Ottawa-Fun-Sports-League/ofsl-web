import { useEffect, useMemo, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { UserFilters } from '../types';
 
import { supabase } from '../../../../../lib/supabase';

interface ImprovedMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UserFilters;
  handleFilterChange: (filterKey: keyof UserFilters) => void;
  onToggleSportInLeague: (sportId: number) => void;
  onToggleSportWithSkill: (sportId: number) => void;
  onToggleLeague: (leagueId: number) => void;
  onToggleTeam: (teamId: number) => void;
  onToggleLeagueTier: (value: string) => void;
  clearFilters: () => void;
  isAnyFilterActive: () => boolean;
}

type FilterCategory = 'role' | 'sport' | 'status' | 'league' | 'team' | 'tier';

interface FilterOption {
  key: keyof UserFilters;
  label: string;
  category: FilterCategory;
  description?: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  // Role filters
  { key: 'administrator', label: 'Administrator', category: 'role' },
  { key: 'facilitator', label: 'Facilitator', category: 'role' },
  
  // Status filters
  { key: 'activePlayer', label: 'Active Player', category: 'status', description: 'Currently on a team in an active league' },
  { key: 'playersNotInLeague', label: 'Not in League', category: 'status', description: 'Previously on teams but not in active leagues' },
  { key: 'pendingUsers', label: 'Pending Users', category: 'status', description: 'Users who have not completed their profile' },
];

const CATEGORY_CONFIG = {
  role: { 
    label: 'User Role', 
    icon: '👤',
    description: 'Filter by user permissions'
  },
  sport: { 
    label: 'Sport', 
    icon: '🏐',
    description: 'Filter by sport participation'
  },
  status: { 
    label: 'Status', 
    icon: '📊',
    description: 'Filter by player status'
  },
  league: {
    label: 'League',
    icon: '🏆',
    description: 'Filter by league registrations'
  },
  team: {
    label: 'Team',
    icon: '👥',
    description: 'Filter by team roster'
  },
  tier: {
    label: 'Tier',
    icon: '🎯',
    description: 'Filter by schedule tier'
  }
};

export function ImprovedMobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  handleFilterChange,
  onToggleSportInLeague,
  onToggleSportWithSkill,
  onToggleLeague,
  onToggleTeam,
  onToggleLeagueTier,
  clearFilters,
  isAnyFilterActive
}: ImprovedMobileFilterDrawerProps) {
  const [expandedCategory, setExpandedCategory] = useState<FilterCategory | null>(null);
  const [sports, setSports] = useState<{ id: number; name: string }[]>([]);
  const [leagues, setLeagues] = useState<Array<{ id: number; name: string | null }>>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string | null; league_id: number | null }>>([]);
  const [tierOptions, setTierOptions] = useState<Array<{ value: string; league_id: number; tier_number: number }>>([]);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [tierSearch, setTierSearch] = useState('');

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

  const getCategoryOptions = (category: FilterCategory) => {
    return FILTER_OPTIONS.filter(option => option.category === category);
  };

  const getCategoryActiveCount = (category: FilterCategory) => {
    switch (category) {
      case 'sport':
        return filters.sportsInLeague.length + filters.sportsWithSkill.length;
      case 'league':
        return filters.leagueIds.length;
      case 'team':
        return filters.teamIds.length;
      case 'tier':
        return filters.leagueTierFilters.length;
      default:
        return getCategoryOptions(category).filter((option) => !!filters[option.key]).length;
    }
  };

  const totalActiveFilters =
    FILTER_OPTIONS.filter(option => filters[option.key]).length +
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

  const visibleTiers = useMemo(() => {
    const base = filters.leagueIds.length === 0
      ? tierOptions
      : tierOptions.filter((option) => filters.leagueIds.includes(option.league_id));
    if (!tierSearch.trim()) return base;
    const term = tierSearch.toLowerCase();
    return base.filter((option) => tierLabel(option.value, option.league_id, option.tier_number).toLowerCase().includes(term));
  }, [tierOptions, filters.leagueIds, tierSearch]);

  const tierLabel = (value: string, fallbackLeagueId?: number, fallbackTier?: number) => {
    const [leagueIdPart, tierNumberPart] = value.split(':');
    const leagueId = fallbackLeagueId ?? Number(leagueIdPart);
    const tierNumber = fallbackTier ?? Number(tierNumberPart);
    const leagueName = leagueNameMap.get(leagueId) ?? `League ${leagueId}`;
    return `${leagueName} • Tier ${tierNumber}`;
  };

  const renderCategoryOptions = (category: FilterCategory) => {
    if (category === 'sport') {
      return (
        <div className="mt-2 space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">In League (Active)</div>
            <div className="grid grid-cols-2 gap-2">
              {sports.map((sport) => (
                <label key={`mobile_in_${sport.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
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
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Has Skill</div>
            <div className="grid grid-cols-2 gap-2">
              {sports.map((sport) => (
                <label key={`mobile_skill_${sport.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
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
        </div>
      );
    }

    if (category === 'league') {
      return (
        <div className="space-y-3">
          <Input
            value={leagueSearch}
            onChange={(event) => setLeagueSearch(event.target.value)}
            placeholder="Search leagues..."
            className="h-9"
          />
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredLeagues.map((league) => (
              <label key={`mobile_league_${league.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
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
              <div className="text-xs text-gray-500 text-center py-3">No leagues match that search.</div>
            )}
          </div>
        </div>
      );
    }

    if (category === 'team') {
      return (
        <div className="space-y-3">
          <Input
            value={teamSearch}
            onChange={(event) => setTeamSearch(event.target.value)}
            placeholder="Search teams..."
            className="h-9"
          />
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {visibleTeams.map((team) => (
              <label key={`mobile_team_${team.id}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
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
              <div className="text-xs text-gray-500 text-center py-3">
                {filters.leagueIds.length > 0 ? 'No teams found for selected leagues.' : 'No teams available.'}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (category === 'tier') {
      return (
        <div className="space-y-3">
          <Input
            value={tierSearch}
            onChange={(event) => setTierSearch(event.target.value)}
            placeholder="Search tiers..."
            className="h-9"
          />
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {visibleTiers.map((option) => (
              <label key={`mobile_tier_${option.value}`} className="flex items-center gap-2 text-sm text-[#6F6F6F]">
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
              <div className="text-xs text-gray-500 text-center py-3">
                {filters.leagueIds.length > 0 ? 'No tiers found for selected leagues.' : 'No tiers available.'}
              </div>
            )}
          </div>
        </div>
      );
    }

    const options = getCategoryOptions(category);
    if (options.length === 0) {
      return <div className="text-sm text-gray-500 text-center py-4">No filters available.</div>;
    }

    return options.map(option => (
      <label
        key={option.key}
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
      >
        <input
          type="checkbox"
          checked={Boolean(filters[option.key] as any)}
          onChange={() => handleFilterChange(option.key)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
        />
        <div className="flex-1">
          <div className="font-medium text-sm text-[#6F6F6F]">
            {option.label}
          </div>
          {option.description && (
            <div className="text-xs text-gray-500 mt-0.5">
              {option.description}
            </div>
          )}
        </div>
      </label>
    ));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-[#6F6F6F]">Filters</h2>
            {totalActiveFilters > 0 && (
              <p className="text-sm text-[#B20000] mt-0.5">
                {totalActiveFilters} filter{totalActiveFilters > 1 ? 's' : ''} active
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filter Categories */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const categoryKey = category as FilterCategory;
            const activeCount = getCategoryActiveCount(categoryKey);
            const isExpanded = expandedCategory === categoryKey;
            return (
              <div key={category} className="border-b border-gray-200">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="text-left">
                      <div className="font-medium text-[#6F6F6F]">
                        {config.label}
                        {activeCount > 0 && (
                          <span className="ml-2 bg-[#B20000] text-white text-xs rounded-full px-2 py-0.5">
                            {activeCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Category Options */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-1">
                    {renderCategoryOptions(categoryKey)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {isAnyFilterActive() && (
            <Button
              onClick={() => {
                clearFilters();
                setLeagueSearch('');
                setTeamSearch('');
                setTierSearch('');
                setExpandedCategory(null);
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px]"
            >
              Clear All Filters
            </Button>
          )}
          <Button
            onClick={onClose}
            className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px]"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}
