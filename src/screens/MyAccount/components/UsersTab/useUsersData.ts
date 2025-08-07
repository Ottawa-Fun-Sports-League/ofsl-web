import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { User, UserFilters, SortField, SortDirection } from './types';
import { INITIAL_FILTERS, SPORT_IDS } from './constants';
import { useSearchParams } from 'react-router-dom';

export function useUsersData() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse filters from URL on initial load
  const getInitialFilters = (): UserFilters => {
    const urlFilters = { ...INITIAL_FILTERS };
    
    // Parse boolean filters from URL
    Object.keys(INITIAL_FILTERS).forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null) {
        urlFilters[key as keyof UserFilters] = value === 'true';
      }
    });
    
    return urlFilters;
  };
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sortField') as SortField) || 'date_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>((searchParams.get('sortDirection') as SortDirection) || 'desc');
  const [filters, setFilters] = useState<UserFilters>(getInitialFilters());

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, filters, sortField, sortDirection]);

  // Update URL params when filters/search/sort change
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Add search term
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    
    // Add sort params
    if (sortField !== 'date_created') {
      params.set('sortField', sortField);
    }
    if (sortDirection !== 'desc') {
      params.set('sortDirection', sortDirection);
    }
    
    // Add filter params (only non-default values)
    Object.keys(filters).forEach((key) => {
      const filterKey = key as keyof UserFilters;
      if (filters[filterKey] !== INITIAL_FILTERS[filterKey]) {
        params.set(key, filters[filterKey].toString());
      }
    });
    
    // Update URL without causing navigation
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters, sortField, sortDirection]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: adminCheck, error: adminError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userProfile?.id)
        .single();

      if (adminError || !adminCheck?.is_admin) {
        console.error('Error checking admin status:', adminError);
        showToast('You must be an admin to view users', 'error');
        setLoading(false);
        return;
      }

      // Fetch users with their sports skills
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          user_sports_skills (
            sport_id,
            skill_id,
            sports (
              id,
              name
            ),
            skills (
              id,
              name
            )
          )
        `)
        .order('date_created', { ascending: false });

      if (usersError) throw usersError;
      
      // Fetch all teams in active leagues with their roster data
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          co_captains,
          league_id,
          leagues!inner (
            id,
            name,
            sport_id,
            active,
            sports!inner (
              id,
              name
            )
          )
        `)
        .eq('leagues.active', true);

      if (teamsError) {
        console.error('Error loading teams:', teamsError);
      }
      

      // Process users and add registration data
      const processedUsers = (usersData || []).map(user => {
        // Find teams where this user is involved (as captain, co-captain, or roster member)
        const userTeams = (teamsData || []).filter(team => {
          // Check if user is captain
          if (team.captain_id === user.id) return true;
          
          // Check if user is in roster array
          if (team.roster && Array.isArray(team.roster) && team.roster.includes(user.id)) return true;
          
          // Check if user is in co_captains array
          if (team.co_captains && Array.isArray(team.co_captains) && team.co_captains.includes(user.id)) return true;
          
          return false;
        });

        // Map teams to registration format
        const userRegistrations = userTeams.map(team => {
          // Handle the nested structure from Supabase joins
          const league = team.leagues as { name?: string; sports?: { name?: string } };
          const sport = league?.sports;
          
          return {
            team_id: team.id,
            team_name: team.name,
            league_id: team.league_id,
            league_name: league?.name || '',
            sport_name: sport?.name || ''
          };
        });

        
        return {
          ...user,
          current_registrations: userRegistrations.length > 0 ? userRegistrations : null
        };
      });

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => 
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.phone?.includes(searchTerm))
    );
    
    // Apply filters
    if (filters.administrator) {
      filtered = filtered.filter(user => user.is_admin === true);
    }
    if (filters.facilitator) {
      filtered = filtered.filter(user => user.is_facilitator === true);
    }
    if (filters.activePlayer) {
      filtered = filtered.filter(user => user.current_registrations && user.current_registrations.length > 0);
    }
    
    // Sport-specific filters - Apply with OR logic within sport filters
    const sportFilters = [];
    
    if (filters.volleyballPlayersInLeague) {
      sportFilters.push((user: User) => 
        user.current_registrations?.some(reg => 
          reg.sport_name.toLowerCase() === 'volleyball'
        ) || false
      );
    }
    
    if (filters.volleyballPlayersAll) {
      sportFilters.push((user: User) => {
        // Check if user has volleyball in their sports skills
        if (user.user_sports_skills && Array.isArray(user.user_sports_skills)) {
          const hasVolleyballSkill = user.user_sports_skills.some(skill => 
            skill.sport_id === SPORT_IDS.VOLLEYBALL
          );
          if (hasVolleyballSkill) return true;
        }
        // Also include players currently in volleyball leagues
        return user.current_registrations?.some(reg => 
          reg.sport_name.toLowerCase() === 'volleyball'
        ) || false;
      });
    }
    
    if (filters.badmintonPlayersInLeague) {
      sportFilters.push((user: User) => 
        user.current_registrations?.some(reg => 
          reg.sport_name.toLowerCase() === 'badminton'
        ) || false
      );
    }
    
    if (filters.badmintonPlayersAll) {
      sportFilters.push((user: User) => {
        // Check if user has badminton in their sports skills
        if (user.user_sports_skills && Array.isArray(user.user_sports_skills)) {
          const hasBadmintonSkill = user.user_sports_skills.some(skill => 
            skill.sport_id === SPORT_IDS.BADMINTON
          );
          if (hasBadmintonSkill) return true;
        }
        // Also include players currently in badminton leagues
        return user.current_registrations?.some(reg => 
          reg.sport_name.toLowerCase() === 'badminton'
        ) || false;
      });
    }
    
    // Apply sport filters with OR logic
    if (sportFilters.length > 0) {
      filtered = filtered.filter(user => 
        sportFilters.some(filterFn => filterFn(user))
      );
    }
    
    // Apply "Not in League" filter separately (this is independent of sport filters)
    if (filters.playersNotInLeague) {
      // Filter for players that are registered (have team_ids) but not in any active league
      filtered = filtered.filter(user => 
        user.team_ids && 
        user.team_ids.length > 0 && 
        (!user.current_registrations || user.current_registrations.length === 0)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'date_created':
          aValue = new Date(a.date_created);
          bValue = new Date(b.date_created);
          break;
        case 'is_admin':
          aValue = a.is_admin ? 1 : 0;
          bValue = b.is_admin ? 1 : 0;
          break;
        case 'is_facilitator':
          aValue = a.is_facilitator ? 1 : 0;
          bValue = b.is_facilitator ? 1 : 0;
          break;
        case 'team_count':
          aValue = a.team_ids?.length || 0;
          bValue = b.team_ids?.length || 0;
          break;
        default:
          aValue = a.date_created;
          bValue = b.date_created;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredUsers(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterKey: keyof UserFilters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const isAnyFilterActive = () => {
    return filters.administrator || 
           filters.facilitator || 
           filters.activePlayer ||
           filters.volleyballPlayersInLeague ||
           filters.badmintonPlayersInLeague ||
           filters.playersNotInLeague ||
           filters.volleyballPlayersAll ||
           filters.badmintonPlayersAll;
  };

  return {
    users,
    filteredUsers,
    searchTerm,
    loading,
    sortField,
    sortDirection,
    filters,
    setSearchTerm,
    loadUsers,
    handleSort,
    handleFilterChange,
    clearFilters,
    isAnyFilterActive
  };
}