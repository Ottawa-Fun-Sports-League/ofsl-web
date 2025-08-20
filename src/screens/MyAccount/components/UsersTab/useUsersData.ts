import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { User, UserFilters, SortField, SortDirection, UserSportSkill } from './types';
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
      
      // Get today's date for filtering active leagues
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data: adminCheck, error: adminError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userProfile?.id)
        .single();

      if (adminError || !adminCheck?.is_admin) {
        showToast('You must be an admin to view users', 'error');
        setLoading(false);
        return;
      }

      // Run all data fetches in parallel for better performance
      
      // Fetch all users including auth-only users using the admin function
      interface UserData {
        profile_id?: string;  // This is the profile ID from users table (returned by RPC)
        auth_id?: string;  // This is the auth UUID
        name?: string | null;
        email: string;
        phone?: string | null;
        is_admin?: boolean;
        is_facilitator?: boolean;
        date_created: string;
        date_modified?: string;
        auth_created_at?: string;
        team_ids?: string[] | null;
        league_ids?: number[] | string[] | null;  // Individual league registrations (could be bigint[] from DB)
        user_sports_skills?: UserSportSkill[] | null;
        status: 'active' | 'pending' | 'unconfirmed' | 'confirmed_no_profile' | 'profile_incomplete';
        confirmed_at?: string | null;
        last_sign_in_at?: string | null;
        preferred_position?: null;
      }
      
      // Transformed user data (no need to extend since UserData already has profile_id)
      type TransformedUserData = UserData;
      
      let usersData: TransformedUserData[] = [];
      
      // Fetch users and teams data in parallel for better performance
      const [usersResult, teamsResult] = await Promise.all([
        supabase.rpc('get_all_users_admin'),
        supabase
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
              end_date,
              sports!inner (
                id,
                name
              )
            )
          `)
      ]);

      const { data: allUsersData, error: allUsersError } = usersResult;
      const { data: teamsData, error: teamsError } = teamsResult;


      if (allUsersError || !allUsersData || allUsersData.length === 0) {
        // Fallback to regular users table if RPC fails
        // This will get all users with profiles
        const { data: fallbackData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('date_created', { ascending: false });

        if (usersError) throw usersError;
        
        // Map regular users to the expected format
        usersData = (fallbackData || []).map((user) => {
          // The users table has the profile data
          return {
            ...user,
            id: user.id,  // This is the profile ID
            profile_id: user.id,  // Same as id for users from the users table
            auth_id: user.auth_id || null,
            status: user.profile_completed ? 'active' : 'profile_incomplete',
            confirmed_at: null,  // Not available in users table
            last_sign_in_at: null,  // Not available in users table
            auth_created_at: user.date_created
          };
        }).filter(user => user.id); // Only include users with valid IDs
      } else {
        // Map the RPC response to our User type - Include ALL users, even those missing IDs
        usersData = (allUsersData || []).map((user: UserData) => {
          // RPC returns profile_id directly, use it or fall back to auth_id
          const userId = user.profile_id || user.auth_id || '';
          if (!userId) {
            return null;
          }
          return {
          id: userId,
          profile_id: user.profile_id || null,  // RPC returns profile_id directly
          auth_id: user.auth_id || null,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          preferred_position: null,
          is_admin: user.is_admin || false,
          is_facilitator: user.is_facilitator || false,
          date_created: user.date_created || user.auth_created_at,
          date_modified: user.date_created || user.auth_created_at,
          team_ids: user.team_ids,
          league_ids: user.league_ids,
          user_sports_skills: user.user_sports_skills,
          status: user.status === 'confirmed_no_profile' ? 'pending' : 
                  user.status === 'profile_incomplete' ? 'pending' : 
                  user.status,
          confirmed_at: user.confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        };
        }).filter((user: TransformedUserData | null): user is TransformedUserData => user !== null); // Filter out null users (only those with NO IDs at all)
      }
      
      // Teams data already fetched in parallel above
      // Check for errors from the parallel fetch
      if (teamsError) {
        // Continue processing with empty teams data
        showToast('Warning: Could not load team data', 'warning');
      }
      

      // Create a map for O(1) team lookups by user ID
      type TeamData = NonNullable<typeof teamsData>[number];
      const userTeamsMap = new Map<string, TeamData[]>();
      
      // Pre-process teams data for better performance
      // Only include teams from leagues that haven't ended yet
      const activeTeams = teamsData?.filter(team => {
        const league = team.leagues as any;
        // Consider a league active if it hasn't ended yet (end_date > today)
        // If no end_date is set, consider it active
        if (!league?.end_date) {
          return true;
        }
        const isActive = league.end_date >= today;
        return isActive;
      }) || [];
      
      
      if (activeTeams.length > 0) {
        activeTeams.forEach(team => {
          // Add team to captain's list (captain_id is the profile ID)
          if (team.captain_id) {
            if (!userTeamsMap.has(team.captain_id)) {
              userTeamsMap.set(team.captain_id, []);
            }
            const existingTeams = userTeamsMap.get(team.captain_id) || [];
            // Avoid duplicates
            if (!existingTeams.some(t => t.id === team.id)) {
              existingTeams.push(team);
            }
          }
          
          // Add team to roster members' lists (roster contains profile IDs)
          if (team.roster && Array.isArray(team.roster)) {
            team.roster.forEach((userId: string) => {
              if (!userTeamsMap.has(userId)) {
                userTeamsMap.set(userId, []);
              }
              const existingTeams = userTeamsMap.get(userId) || [];
              // Avoid duplicates
              if (!existingTeams.some(t => t.id === team.id)) {
                existingTeams.push(team);
              }
            });
          }
          
          // Add team to co-captains' lists (co_captains contains profile IDs)
          if (team.co_captains && Array.isArray(team.co_captains)) {
            team.co_captains.forEach((userId: string) => {
              if (!userTeamsMap.has(userId)) {
                userTeamsMap.set(userId, []);
              }
              const existingTeams = userTeamsMap.get(userId) || [];
              // Avoid duplicates  
              if (!existingTeams.some(t => t.id === team.id)) {
                existingTeams.push(team);
              }
            });
          }
        });
      }
      
      // Load individual leagues and payments data in parallel
      const [leaguesResult, paymentsResult] = await Promise.all([
        supabase
          .from('leagues')
          .select(`
            id,
            name,
            sport_id,
            team_registration,
            end_date,
            sports!inner (
              id,
              name
            )
          `)
          .eq('team_registration', false), // Individual registrations only
        supabase
          .from('league_payments')
          .select('user_id, amount_due, amount_paid, status')
      ]);
      
      const { data: leagues, error: leaguesError } = leaguesResult;
      const { data: paymentsData, error: paymentsError } = paymentsResult;
      
      let individualLeaguesData: any[] = [];
      if (!leaguesError && leagues) {
        individualLeaguesData = leagues;
      }
      
      // Filter individual leagues by end date (only active leagues)
      const activeIndividualLeagues = individualLeaguesData.filter(league => {
        if (!league.end_date) return true; // No end date means active
        return league.end_date >= today;
      });
      
      // Create a map of league_id to league info for quick lookup
      const leagueInfoMap = new Map<number, { sport_id: number; sport_name: string; league_name: string }>();
      activeIndividualLeagues.forEach(league => {
        leagueInfoMap.set(league.id, {
          sport_id: league.sport_id || (league.sports as any)?.id || 0,
          sport_name: (league.sports as any)?.name || '',
          league_name: league.name || ''
        });
      });
      
      // Create a map of user_id to payment totals
      const userPaymentTotals = new Map<string, { total_owed: number; total_paid: number }>();
      const TAX_RATE = 0.13; // 13% HST
      
      if (paymentsData) {
        paymentsData.forEach(payment => {
          const existing = userPaymentTotals.get(payment.user_id) || { total_owed: 0, total_paid: 0 };
          const amountDue = Number(payment.amount_due) || 0;
          // Add 13% tax to the amount owed
          const amountDueWithTax = amountDue * (1 + TAX_RATE);
          existing.total_owed += amountDueWithTax;
          existing.total_paid += Number(payment.amount_paid) || 0;
          userPaymentTotals.set(payment.user_id, existing);
        });
      }
      
      // Process users and add registration data
      const processedUsers = (usersData || []).map((user, index) => {
        // Get teams for this user from the pre-processed map (O(1) lookup)
        // Use profile_id for matching with teams (this is what's stored in rosters)
        // IMPORTANT: Only use profile_id, not auth_id, as team rosters contain profile IDs
        const userIdForTeams = user.profile_id || '';  
        const userTeams = userIdForTeams ? userTeamsMap.get(userIdForTeams) || [] : [];

        // Map teams to registration format
        // Note: userTeams already only contains teams from leagues that haven't ended
        // (filtered in the activeTeams processing above)
        const userRegistrations = userTeams.map(team => {
          // Handle the nested structure from Supabase joins
          interface LeagueWithSport {
            name?: string;
            sport_id?: number;
            end_date?: string;
            sports?: {
              id?: number;
              name?: string;
            };
          }
          
          const league = team.leagues as LeagueWithSport | undefined;
          const sport = league?.sports;
          
          // Debug sport IDs for first few users with teams - especially badminton
          if (sport?.name?.toLowerCase().includes('badminton') || league?.sport_id === 2) {
            console.log(`🏸 Badminton team found for ${user.name}:`, {
              team_name: team.name,
              league_sport_id: league?.sport_id,
              sport_obj_id: sport?.id,
              sport_name: sport?.name,
              full_league: league,
              expected_badminton_id: SPORT_IDS.BADMINTON
            });
          }
          
          return {
            team_id: team.id,
            team_name: team.name || '',
            league_id: team.league_id || 0,
            league_name: league?.name || '',
            sport_id: league?.sport_id || sport?.id || 0, // Try both fields
            sport_name: sport?.name || ''
          };
        });

        // Add individual league registrations (for badminton)
        
        const individualRegistrations = (user.league_ids || [])
          .map(leagueId => {
            // Convert to number - handle both string and number types from DB
            const leagueIdNum = typeof leagueId === 'string' ? parseInt(leagueId, 10) : Number(leagueId);
            
            if (isNaN(leagueIdNum)) {
              return null;
            }
            
            const leagueInfo = leagueInfoMap.get(leagueIdNum);
            
            if (leagueInfo) {
              return {
                team_id: 0, // No team for individual registrations
                team_name: 'Individual Registration',
                league_id: leagueIdNum,
                league_name: leagueInfo.league_name,
                sport_id: leagueInfo.sport_id,
                sport_name: leagueInfo.sport_name
              };
            }
            return null;
          })
          .filter((reg): reg is NonNullable<typeof reg> => reg !== null);
        
        // Combine team and individual registrations
        const allRegistrations = [...userRegistrations, ...individualRegistrations];
        
        
        const finalUserId = user.profile_id || user.auth_id || '';  // Compute the user ID
        if (!finalUserId) {
          return null; // Skip only users without ANY valid IDs
        }
        
        // Get payment totals for this user (using profile_id for lookups)
        const paymentTotals = user.profile_id ? userPaymentTotals.get(user.profile_id) : null;
        
        const processedUser: User = {
          id: finalUserId,
          profile_id: user.profile_id || null,  // Already set from the mapping above
          auth_id: user.auth_id || null,
          name: user.name || null,
          email: user.email,
          phone: user.phone || '',
          preferred_position: null,
          is_admin: user.is_admin || false,
          is_facilitator: user.is_facilitator || false,
          date_created: user.date_created,
          date_modified: user.date_created,
          team_ids: user.team_ids || null,  // Keep as strings, they're text in the DB
          league_ids: user.league_ids || null,  // Keep as strings
          user_sports_skills: user.user_sports_skills || null,
          status: user.status === 'confirmed_no_profile' ? 'pending' : user.status,
          confirmed_at: user.confirmed_at,
          last_sign_in_at: user.last_sign_in_at,
          current_registrations: allRegistrations.length > 0 ? allRegistrations : null,
          total_owed: paymentTotals?.total_owed || 0,
          total_paid: paymentTotals?.total_paid || 0
        };
        return processedUser;
      }).filter((user): user is User => user !== null); // Filter out null users

      // Debug: Final processed users
      const usersWithRegistrations = processedUsers.filter(u => u.current_registrations && u.current_registrations.length > 0);
      const usersWithProfile = processedUsers.filter(u => u.profile_id);
      const usersWithoutProfile = processedUsers.filter(u => !u.profile_id);
      const usersWithLeagueIds = processedUsers.filter(u => u.league_ids && u.league_ids.length > 0);
      const usersWithIndividualRegs = processedUsers.filter(u => 
        u.current_registrations?.some(r => r.team_name === 'Individual Registration')
      );
      
      setUsers(processedUsers);
    } catch (error) {
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
    
    // Debug filtering
    if (filters.activePlayer || filters.playersNotInLeague || filters.badmintonPlayersInLeague || filters.volleyballPlayersInLeague) {
      const usersWithRegs = users.filter(u => u.current_registrations && u.current_registrations.length > 0);
      
      // Check specifically for badminton users
      const badmintonUsers = usersWithRegs.filter(u => 
        u.current_registrations?.some(r => r.sport_id === SPORT_IDS.BADMINTON)
      );
      
      const volleyballUsers = usersWithRegs.filter(u => 
        u.current_registrations?.some(r => r.sport_id === SPORT_IDS.VOLLEYBALL)
      );
      
      // Get all unique sport IDs and names to see what's actually in the data
      const allSportIds = new Set<any>();
      const allSportNames = new Set<string>();
      const sportIdCounts = new Map<any, number>();
      
      usersWithRegs.forEach(u => {
        u.current_registrations?.forEach(r => {
          allSportIds.add(r.sport_id);
          if (r.sport_name) allSportNames.add(r.sport_name);
          
          const key = `${r.sport_id}_${typeof r.sport_id}`;
          sportIdCounts.set(key, (sportIdCounts.get(key) || 0) + 1);
        });
      });
    }
    
    // Apply filters
    if (filters.administrator) {
      filtered = filtered.filter(user => user.is_admin === true);
    }
    if (filters.facilitator) {
      filtered = filtered.filter(user => user.is_facilitator === true);
    }
    if (filters.activePlayer) {
      // Active players are those registered in leagues that haven't ended yet
      // (current_registrations only includes teams from leagues where end_date >= today)
      filtered = filtered.filter(user => {
        const hasRegistrations = user.current_registrations && user.current_registrations.length > 0;
        return hasRegistrations;
      });
    }
    if (filters.pendingUsers) {
      filtered = filtered.filter(user => 
        user.status === 'pending' || 
        user.status === 'unconfirmed' || 
        user.status === 'confirmed_no_profile' ||
        user.status === 'profile_incomplete'
      );
    }
    
    // Sport-specific filters - Apply with OR logic within sport filters
    const sportFilters: ((user: User) => boolean)[] = [];
    
    if (filters.volleyballPlayersInLeague) {
      sportFilters.push((user: User) => {
        const hasVolleyball = user.current_registrations?.some(reg => {
          // Check both string and number comparison in case of type mismatch
          const sportIdMatch = reg.sport_id === SPORT_IDS.VOLLEYBALL || 
                              String(reg.sport_id) === String(SPORT_IDS.VOLLEYBALL) ||
                              Number(reg.sport_id) === SPORT_IDS.VOLLEYBALL;
          
          // Also check by sport name as fallback
          const sportNameMatch = reg.sport_name?.toLowerCase().includes('volleyball');
          
          return sportIdMatch || sportNameMatch;
        }) || false;
        
        return hasVolleyball;
      });
    }
    
    if (filters.volleyballPlayersAll) {
      sportFilters.push((user: User) => {
        // Check if user has volleyball in their sports skills
        if (user.user_sports_skills && Array.isArray(user.user_sports_skills)) {
          const hasVolleyballSkill = user.user_sports_skills.some(skill => 
            skill.sport_id === SPORT_IDS.VOLLEYBALL ||
            Number(skill.sport_id) === SPORT_IDS.VOLLEYBALL
          );
          if (hasVolleyballSkill) return true;
        }
        // Also include players currently in volleyball leagues
        return user.current_registrations?.some(reg => {
          const sportIdMatch = reg.sport_id === SPORT_IDS.VOLLEYBALL || 
                              String(reg.sport_id) === String(SPORT_IDS.VOLLEYBALL) ||
                              Number(reg.sport_id) === SPORT_IDS.VOLLEYBALL;
          const sportNameMatch = reg.sport_name?.toLowerCase().includes('volleyball');
          return sportIdMatch || sportNameMatch;
        }) || false;
      });
    }
    
    if (filters.badmintonPlayersInLeague) {
      sportFilters.push((user: User) => {
        const hasBadminton = user.current_registrations?.some(reg => {
          // Check both string and number comparison in case of type mismatch
          const sportIdMatch = reg.sport_id === SPORT_IDS.BADMINTON || 
                              String(reg.sport_id) === String(SPORT_IDS.BADMINTON) ||
                              Number(reg.sport_id) === SPORT_IDS.BADMINTON;
          
          // Also check by sport name as fallback
          const sportNameMatch = reg.sport_name?.toLowerCase().includes('badminton');
          
          return sportIdMatch || sportNameMatch;
        }) || false;
        
        return hasBadminton;
      });
    }
    
    if (filters.badmintonPlayersAll) {
      sportFilters.push((user: User) => {
        // Check if user has badminton in their sports skills
        if (user.user_sports_skills && Array.isArray(user.user_sports_skills)) {
          const hasBadmintonSkill = user.user_sports_skills.some(skill => 
            skill.sport_id === SPORT_IDS.BADMINTON ||
            Number(skill.sport_id) === SPORT_IDS.BADMINTON
          );
          if (hasBadmintonSkill) return true;
        }
        // Also include players currently in badminton leagues
        return user.current_registrations?.some(reg => {
          const sportIdMatch = reg.sport_id === SPORT_IDS.BADMINTON || 
                              String(reg.sport_id) === String(SPORT_IDS.BADMINTON) ||
                              Number(reg.sport_id) === SPORT_IDS.BADMINTON;
          const sportNameMatch = reg.sport_name?.toLowerCase().includes('badminton');
          return sportIdMatch || sportNameMatch;
        }) || false;
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
      // Filter for players that have no current registrations in active leagues
      filtered = filtered.filter(user => 
        !user.current_registrations || user.current_registrations.length === 0
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
          // Sort by actual active registrations, not old team_ids
          aValue = a.current_registrations?.length || 0;
          bValue = b.current_registrations?.length || 0;
          break;
        case 'status':
          // Sort order: active > pending > unconfirmed > confirmed_no_profile > profile_incomplete
          const statusOrder = {
            'active': 1,
            'pending': 2,
            'unconfirmed': 3,
            'confirmed_no_profile': 4,
            'profile_incomplete': 5
          };
          aValue = statusOrder[a.status || 'active'] || 6;
          bValue = statusOrder[b.status || 'active'] || 6;
          break;
        case 'total_owed':
          aValue = a.total_owed || 0;
          bValue = b.total_owed || 0;
          break;
        case 'total_paid':
          aValue = a.total_paid || 0;
          bValue = b.total_paid || 0;
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
           filters.pendingUsers ||
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