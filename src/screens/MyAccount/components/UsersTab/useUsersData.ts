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
        console.error('Error checking admin status:', adminError);
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

      // Debug: RPC response for admin function
      if (process.env.NODE_ENV === 'development') {
        console.log('RPC response:', { 
          allUsersData, 
          allUsersError,
          dataLength: allUsersData?.length,
          isArray: Array.isArray(allUsersData)
        });
      }

      if (allUsersError || !allUsersData || allUsersData.length === 0) {
        console.warn('RPC failed or returned empty, using fallback query:', {
          error: allUsersError,
          dataLength: allUsersData?.length,
          isNull: allUsersData === null
        });
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Using fallback data:', {
            totalUsers: usersData.length,
            sampleUser: usersData[0]
          });
        }
      } else {
        // Map the RPC response to our User type - Include ALL users, even those missing IDs
        usersData = (allUsersData || []).map((user: UserData) => {
          // RPC returns profile_id directly, use it or fall back to auth_id
          const userId = user.profile_id || user.auth_id || '';
          if (!userId) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Skipping user without any valid ID from RPC:', user);
            }
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
      
      // Debug: Processed users data
      console.log('Processed users data:', {
        source: allUsersError || !allUsersData || allUsersData.length === 0 ? 'fallback' : 'RPC',
        totalUsers: usersData.length,
        usersWithProfileId: usersData.filter(u => u.profile_id).length,
        usersWithAuthId: usersData.filter(u => u.auth_id).length,
        first3Users: usersData.slice(0, 3).map(u => ({
          name: u.name,
          email: u.email,
          id: (u as any).id || u.profile_id || u.auth_id,
          profile_id: u.profile_id,
          auth_id: u.auth_id?.substring(0, 8) + '...'
        }))
      });
      
      // Teams data already fetched in parallel above
      // Check for errors from the parallel fetch
      if (teamsError) {
        console.error('Error loading teams:', teamsError);
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
          console.log('Team has no end date, considering active:', team.name);
          return true;
        }
        const isActive = league.end_date >= today;
        if (!isActive) {
          console.log('Team excluded - league ended:', team.name, league.end_date);
        }
        return isActive;
      }) || [];
      
      console.log('Teams filtering:', {
        totalTeams: teamsData?.length || 0,
        activeTeams: activeTeams.length,
        today,
        sampleActiveTeam: activeTeams[0]
      });
      
      // Debug: Check for badminton teams specifically
      const badmintonTeams = activeTeams.filter(team => {
        const league = team.leagues as any;
        return league?.sport_id === SPORT_IDS.BADMINTON || 
               league?.sports?.name?.toLowerCase().includes('badminton');
      });
      
      // Also check if there are any individual badminton leagues
      console.log('🏸 Badminton Debug Summary:', {
        teamLeagues: {
          active: badmintonTeams.length,
          total: teamsData?.filter(t => {
            const l = t.leagues as any;
            return l?.sport_id === 2 || l?.sports?.name?.toLowerCase().includes('badminton');
          }).length || 0
        },
        explanation: badmintonTeams.length === 0 
          ? 'No badminton team leagues exist in the database. Badminton might be individual-only sport or no badminton leagues created yet.'
          : 'Badminton teams found'
      });
      
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
      
      // Debug: Team map details
      console.log('User teams map details:', {
        totalMappedUsers: userTeamsMap.size,
        sampleMappings: Array.from(userTeamsMap.entries()).slice(0, 3).map(([userId, teams]) => ({
          userId,
          teamCount: teams.length,
          teamNames: teams.map(t => t.name)
        }))
      });
      
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
        console.log('🏸 Individual leagues loaded:', {
          total: leagues.length,
          badminton: leagues.filter(l => l.sport_id === 2 || (l.sports as any)?.name?.toLowerCase().includes('badminton')).length,
          samples: leagues.slice(0, 5).map(l => ({
            id: l.id,
            name: l.name,
            sport_id: l.sport_id,
            sport_name: (l.sports as any)?.name,
            end_date: l.end_date,
            team_registration: l.team_registration
          }))
        });
      } else if (leaguesError) {
        console.error('Error loading individual leagues:', leaguesError);
      }
      
      // Filter individual leagues by end date (only active leagues)
      const activeIndividualLeagues = individualLeaguesData.filter(league => {
        if (!league.end_date) return true; // No end date means active
        return league.end_date >= today;
      });
      
      console.log('🏸 Active individual leagues:', {
        total: activeIndividualLeagues.length,
        today,
        badminton: activeIndividualLeagues.filter(l => l.sport_id === 2 || (l.sports as any)?.name?.toLowerCase().includes('badminton')).length,
        allIds: activeIndividualLeagues.map(l => l.id)
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
      
      console.log('🏸 League info map:', {
        size: leagueInfoMap.size,
        entries: Array.from(leagueInfoMap.entries()).slice(0, 5).map(([id, info]) => ({
          league_id: id,
          ...info
        }))
      });
      
      if (paymentsError) {
        console.error('Error loading payments:', paymentsError);
      }
      
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
        
        console.log('Payment totals calculated (with 13% tax):', {
          totalUsers: userPaymentTotals.size,
          sample: Array.from(userPaymentTotals.entries()).slice(0, 3).map(([userId, totals]) => ({
            userId: userId.substring(0, 8) + '...',
            ...totals
          }))
        });
      }
      
      // Process users and add registration data
      const processedUsers = (usersData || []).map((user, index) => {
        // Get teams for this user from the pre-processed map (O(1) lookup)
        // Use profile_id for matching with teams (this is what's stored in rosters)
        // IMPORTANT: Only use profile_id, not auth_id, as team rosters contain profile IDs
        const userIdForTeams = user.profile_id || '';  
        const userTeams = userIdForTeams ? userTeamsMap.get(userIdForTeams) || [] : [];
        
        // Debug: Log samples of users with and without teams
        if (index < 5) {
          if (userTeams.length > 0) {
            console.log(`✓ User ${user.name} (${userIdForTeams}) has ${userTeams.length} teams:`, userTeams.map(t => t.name));
          } else if (user.name) {
            console.log(`✗ User ${user.name} (${userIdForTeams}) has NO teams`);
          }
        }

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
        // Debug: Log users with league_ids
        if (user.league_ids && user.league_ids.length > 0) {
          console.log(`🏸 User ${user.name} has individual leagues:`, {
            league_ids: user.league_ids,
            league_ids_type: typeof user.league_ids,
            first_id_type: typeof user.league_ids[0],
            parsed_ids: user.league_ids.map(id => {
              // Handle both string and number types
              const parsed = typeof id === 'string' ? parseInt(id, 10) : Number(id);
              return { original: id, parsed, inMap: leagueInfoMap.has(parsed) };
            })
          });
        }
        
        const individualRegistrations = (user.league_ids || [])
          .map(leagueId => {
            // Convert to number - handle both string and number types from DB
            const leagueIdNum = typeof leagueId === 'string' ? parseInt(leagueId, 10) : Number(leagueId);
            
            if (isNaN(leagueIdNum)) {
              console.log(`⚠️ Invalid league ID: ${leagueId}`);
              return null;
            }
            
            const leagueInfo = leagueInfoMap.get(leagueIdNum);
            
            if (leagueInfo) {
              console.log(`✅ Found league info for ${leagueIdNum}:`, leagueInfo);
              return {
                team_id: 0, // No team for individual registrations
                team_name: 'Individual Registration',
                league_id: leagueIdNum,
                league_name: leagueInfo.league_name,
                sport_id: leagueInfo.sport_id,
                sport_name: leagueInfo.sport_name
              };
            } else {
              console.log(`❌ No league info found for ${leagueIdNum} (original: ${leagueId})`);
            }
            return null;
          })
          .filter((reg): reg is NonNullable<typeof reg> => reg !== null);
        
        // Combine team and individual registrations
        const allRegistrations = [...userRegistrations, ...individualRegistrations];
        
        // Debug: Log if user has individual registrations
        if (individualRegistrations.length > 0) {
          console.log(`🏸 User ${user.name} has ${individualRegistrations.length} individual registrations:`, individualRegistrations);
        }
        
        const finalUserId = user.profile_id || user.auth_id || '';  // Compute the user ID
        if (!finalUserId) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('User missing valid ID:', user);
          }
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
      
      console.log('🏸 Final processed users summary:', {
        total: processedUsers.length,
        withProfile: usersWithProfile.length,
        withoutProfile: usersWithoutProfile.length,
        withRegistrations: usersWithRegistrations.length,
        withLeagueIds: usersWithLeagueIds.length,
        withIndividualRegistrations: usersWithIndividualRegs.length,
        withSkills: processedUsers.filter(u => u.user_sports_skills && u.user_sports_skills.length > 0).length,
        first3UsersWithLeagueIds: usersWithLeagueIds.slice(0, 3).map(u => ({
          name: u.name,
          email: u.email,
          league_ids: u.league_ids,
          individual_regs: u.current_registrations?.filter(r => r.team_name === 'Individual Registration').length
        })),
        first3UsersWithReg: usersWithRegistrations.slice(0, 3).map(u => ({
          name: u.name,
          email: u.email,
          profile_id: u.profile_id,
          registrations: u.current_registrations?.length,
          types: u.current_registrations?.map(r => r.team_name === 'Individual Registration' ? 'individual' : 'team')
        }))
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
      
      console.log('Sport Filter Debug:', {
        activeFilter: filters.activePlayer,
        badmintonFilter: filters.badmintonPlayersInLeague,
        volleyballFilter: filters.volleyballPlayersInLeague,
        totalUsers: users.length,
        usersWithRegistrations: usersWithRegs.length,
        badmintonUsers: badmintonUsers.length,
        volleyballUsers: volleyballUsers.length,
        uniqueSportIds: Array.from(allSportIds).map(id => ({ value: id, type: typeof id })),
        uniqueSportNames: Array.from(allSportNames),
        sportIdDistribution: Array.from(sportIdCounts.entries()).map(([key, count]) => {
          const [id, type] = key.split('_');
          return { sport_id: id, type, count };
        }),
        EXPECTED_IDS: { VOLLEYBALL: SPORT_IDS.VOLLEYBALL, BADMINTON: SPORT_IDS.BADMINTON },
        sampleRegistrations: usersWithRegs.slice(0, 3).map(u => ({
          name: u.name,
          registrations: u.current_registrations?.slice(0, 2).map(r => ({
            team: r.team_name,
            sport_id: r.sport_id,
            sport_id_type: typeof r.sport_id,
            sport: r.sport_name
          }))
        }))
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
        
        // More detailed logging for debugging
        if (hasRegistrations && Math.random() < 0.02) { // Log 2% sample
          console.log('Sample active user:', {
            name: user.name,
            email: user.email,
            profile_id: user.profile_id,
            team_ids: user.team_ids,
            registrations: user.current_registrations?.map(r => ({
              team: r.team_name,
              league: r.league_name
            }))
          });
        }
        
        // Log users without profile but with registrations (shouldn't happen)
        if (hasRegistrations && !user.profile_id) {
          console.warn('⚠️ User has registrations but no profile_id:', {
            name: user.name,
            email: user.email,
            registrations: user.current_registrations
          });
        }
        
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
        
        // Debug logging for badminton filter
        if (user.current_registrations && user.current_registrations.length > 0 && Math.random() < 0.05) {
          console.log('Badminton filter check for user:', {
            name: user.name,
            hasBadminton,
            registrations: user.current_registrations?.map(r => ({
              team: r.team_name,
              sport_id: r.sport_id,
              sport_id_type: typeof r.sport_id,
              sport: r.sport_name,
              expected_badminton_id: SPORT_IDS.BADMINTON,
              expected_type: typeof SPORT_IDS.BADMINTON
            }))
          });
        }
        
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