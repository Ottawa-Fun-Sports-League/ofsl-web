import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { ArrowLeft, Edit2, DollarSign, Users, User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '../../../../components/ui/toast';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  team_ids: number[] | null;
  league_ids: number[] | null;
}

interface TeamRegistration {
  id: number;
  team_id: number;
  team_name: string;
  league_id: number;
  league_name: string;
  sport_name: string;
  role: 'captain' | 'co-captain' | 'player';
  payment_status: 'not_paid' | 'deposit_paid' | 'fully_paid';
  amount_owing: number;
  season?: string;
}

interface IndividualRegistration {
  league_id: number;
  league_name: string;
  sport_name: string;
  payment_status: 'not_paid' | 'deposit_paid' | 'fully_paid';
  amount_owing: number;
  season?: string;
}

export function UserRegistrationsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [teamRegistrations, setTeamRegistrations] = useState<TeamRegistration[]>([]);
  const [individualRegistrations, setIndividualRegistrations] = useState<IndividualRegistration[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (userId && userProfile?.id && !dataLoaded) {
      loadUserData();
    } else if (!authLoading && !userProfile?.id) {
      // If auth is done loading and there's no profile, redirect
      navigate('/my-account/users');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userProfile, authLoading]);

  const loadUserData = async () => {
    if (!userId) return;
    
    // Wait for userProfile to be loaded
    if (!userProfile?.id) {
      return;
    }
    
    // Check admin status from already loaded profile
    if (!userProfile.is_admin) {
      showToast('You must be an admin to view user registrations', 'error');
      navigate('/my-account/users');
      setDataLoaded(true);
      return;
    }
    
    try {
      setLoading(true);

      // Load user data - first try by profile ID, then by auth_id
      let user = null;
      let userError = null;
      
      // First try to find by profile ID (users.id)
      const { data: userById, error: errorById } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();  // Use maybeSingle to avoid error if no rows

      if (userById) {
        user = userById;
      } else {
        // If not found by ID, try by auth_id
        const { data: userByAuthId, error: errorByAuthId } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', userId)
          .maybeSingle();  // Use maybeSingle to avoid error if no rows
        
        if (userByAuthId) {
          user = userByAuthId;
        } else {
          userError = errorById || errorByAuthId;
        }
      }

      if (!user) {
        console.error('Error loading user:', userError);
        showToast('User not found', 'error');
        navigate('/my-account/users');
        setDataLoaded(true);
        return;
      }

      setUserData(user);

      // Load ALL team registrations where user is involved
      // This includes teams where they are captain, co-captain, or roster member
      const { data: allTeams, error: allTeamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          co_captains,
          roster,
          league_id,
          leagues!inner (
            id,
            name,
            sport_id,
            year,
            start_date,
            end_date,
            sports!inner (
              name
            )
          )
        `);
      
      // Filter teams to only include those where the user is involved
      // and the league hasn't ended yet
      const today = new Date().toISOString().split('T')[0];
      const teams = allTeams?.filter(team => {
        const league = team.leagues as any;
        // Check if league is still active (not ended)
        if (league?.end_date && league.end_date < today) {
          return false; // Skip ended leagues
        }
        
        // Check if user is involved in this team
        return team.captain_id === user.id ||
               team.co_captains?.includes(user.id) ||
               team.roster?.includes(user.id);
      }) || [];
      
      if (teams.length > 0) {

        if (allTeamsError) {
          console.error('Error loading teams:', allTeamsError);
        } else {
          // Load payment data for the filtered teams
          const teamIds = teams.map(t => t.id);
          const { data: payments } = await supabase
            .from('league_payments')
            .select('*')
            .in('team_id', teamIds);

          const teamRegs: TeamRegistration[] = teams.map(team => {
            const league = team.leagues as any;
            const sport = league?.sports;
            const payment = payments?.find(p => p.team_id === team.id);
            
            // Determine user's role in the team
            // Use the actual user.id from the database, not the userId param
            let role: 'captain' | 'co-captain' | 'player' = 'player';
            if (team.captain_id === user.id) {
              role = 'captain';
            } else if (team.co_captains?.includes(user.id)) {
              role = 'co-captain';
            }

            // Calculate payment status
            let paymentStatus: 'not_paid' | 'deposit_paid' | 'fully_paid' = 'not_paid';
            let amountOwing = 0;

            if (payment) {
              const totalDue = (payment.amount_due || 0) * 1.13; // Include tax
              const amountPaid = payment.amount_paid || 0;
              amountOwing = Math.max(0, totalDue - amountPaid);
              
              if (amountPaid >= totalDue) {
                paymentStatus = 'fully_paid';
              } else if (amountPaid > 0) {
                paymentStatus = 'deposit_paid';
              }
            }

            // Format season from start_date and year
            let season: string | undefined;
            if (league?.start_date) {
              const date = new Date(league.start_date);
              const month = date.getMonth();
              const year = league.year || date.getFullYear();
              // Determine season based on month
              if (month >= 2 && month <= 4) season = `Spring ${year}`;
              else if (month >= 5 && month <= 7) season = `Summer ${year}`;
              else if (month >= 8 && month <= 10) season = `Fall ${year}`;
              else season = `Winter ${year}`;
            }

            return {
              id: team.id,
              team_id: team.id,
              team_name: team.name || 'Unnamed Team',
              league_id: league?.id || 0,
              league_name: league?.name || 'Unknown League',
              sport_name: sport?.name || 'Unknown Sport',
              role,
              payment_status: paymentStatus,
              amount_owing: amountOwing,
              season
            };
          });

          setTeamRegistrations(teamRegs);
        }
      }

      // Load individual registrations
      if (user.league_ids && user.league_ids.length > 0) {
        const { data: leagues, error: leaguesError } = await supabase
          .from('leagues')
          .select(`
            id,
            name,
            sport_id,
            year,
            start_date,
            team_registration,
            deposit_amount,
            deposit_date,
            sports!inner (
              name
            )
          `)
          .in('id', user.league_ids);
          // Temporarily removed: .eq('team_registration', false)

        if (leaguesError) {
          console.error('Error loading individual leagues:', leaguesError);
        } else if (leagues) {
          // Filter for individual leagues (team_registration = false)
          const individualLeagues = leagues.filter(l => l.team_registration === false);
          
          if (individualLeagues.length > 0) {
          // Load payment data for individual registrations
          // Use the actual user.id from the database, not the userId param which might be auth_id
          const { data: payments } = await supabase
            .from('league_payments')
            .select('*')
            .eq('user_id', user.id)
            .is('team_id', null)
            .in('league_id', individualLeagues.map(l => l.id));

          const individualRegs: IndividualRegistration[] = individualLeagues.map(league => {
            const sport = (league as any).sports;
            const payment = payments?.find(p => p.league_id === league.id);
            
            // Calculate payment status
            let paymentStatus: 'not_paid' | 'deposit_paid' | 'fully_paid' = 'not_paid';
            let amountOwing = 0;

            if (payment) {
              const totalDue = (payment.amount_due || 0) * 1.13; // Include tax
              const amountPaid = payment.amount_paid || 0;
              amountOwing = Math.max(0, totalDue - amountPaid);
              
              if (amountPaid >= totalDue) {
                paymentStatus = 'fully_paid';
              } else if (amountPaid > 0) {
                paymentStatus = 'deposit_paid';
              }
            } else {
              // No payment record, calculate based on league deposit amount
              // For individual leagues, we typically charge the deposit amount as the full price
              amountOwing = (league.deposit_amount || 0) * 1.13;
            }

            // Format season from start_date and year
            let season: string | undefined;
            if (league.start_date) {
              const date = new Date(league.start_date);
              const month = date.getMonth();
              const year = league.year || date.getFullYear();
              // Determine season based on month
              if (month >= 2 && month <= 4) season = `Spring ${year}`;
              else if (month >= 5 && month <= 7) season = `Summer ${year}`;
              else if (month >= 8 && month <= 10) season = `Fall ${year}`;
              else season = `Winter ${year}`;
            }

            return {
              league_id: league.id,
              league_name: league.name || 'Unknown League',
              sport_name: sport?.name || 'Unknown Sport',
              payment_status: paymentStatus,
              amount_owing: amountOwing,
              season
            };
          });

          setIndividualRegistrations(individualRegs);
          }
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      showToast('Failed to load user registrations', 'error');
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  };

  const getPaymentStatusIcon = (status: 'not_paid' | 'deposit_paid' | 'fully_paid') => {
    switch (status) {
      case 'fully_paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'deposit_paid':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'not_paid':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getPaymentStatusLabel = (status: 'not_paid' | 'deposit_paid' | 'fully_paid') => {
    switch (status) {
      case 'fully_paid':
        return 'Fully Paid';
      case 'deposit_paid':
        return 'Deposit Paid';
      case 'not_paid':
        return 'Not Paid';
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]" role="status" aria-label="Loading"></div>
      </div>
    );
  }

  // Check admin access after auth has loaded
  if (!userProfile?.is_admin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-[#6F6F6F] text-lg">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  // Show loading while fetching user data or if data hasn't been loaded yet
  if (loading || !dataLoaded) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]" role="status" aria-label="Loading"></div>
      </div>
    );
  }

  // Only show "User not found" if we've tried to load but didn't find the user
  if (!userData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-[#6F6F6F] text-lg">User not found</p>
        </CardContent>
      </Card>
    );
  }

  const totalRegistrations = teamRegistrations.length + individualRegistrations.length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button
                onClick={() => navigate('/my-account/users')}
                variant="ghost"
                className="p-2 self-start"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-xl sm:text-2xl font-bold text-[#6F6F6F]">
                  {userData.name || 'Unnamed User'}'s Registrations
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {userData.email} • {totalRegistrations} Total Registration{totalRegistrations !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Team Registrations */}
        {teamRegistrations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-[#6F6F6F] flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Registrations ({teamRegistrations.length})
            </h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {teamRegistrations.map((reg) => (
              <Card key={`team-${reg.id}`} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-[#6F6F6F]">{reg.team_name}</h3>
                      <p className="text-sm text-gray-500">{reg.league_name}</p>
                      {reg.season && <p className="text-xs text-gray-400">{reg.season}</p>}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{reg.sport_name}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                        {reg.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(reg.payment_status)}
                        <span className="text-sm">{getPaymentStatusLabel(reg.payment_status)}</span>
                      </div>
                      {reg.amount_owing > 0 && (
                        <span className="text-sm font-semibold text-red-600">
                          ${reg.amount_owing.toFixed(2)} owing
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link
                        to={`/my-account/teams/edit/${reg.team_id}`}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit Team
                        </Button>
                      </Link>
                      {reg.payment_status !== 'fully_paid' && (
                        <Link
                          to={`/my-account/teams/edit/${reg.team_id}`}
                          className="flex-1"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Payment
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

        {/* Individual Registrations */}
        {individualRegistrations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-[#6F6F6F] flex items-center gap-2">
              <User className="h-5 w-5" />
              Individual Registrations ({individualRegistrations.length})
            </h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {individualRegistrations.map((reg) => (
              <Card key={`individual-${reg.league_id}`} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-[#6F6F6F]">{reg.league_name}</h3>
                      <p className="text-sm text-gray-500">{reg.sport_name}</p>
                      {reg.season && <p className="text-xs text-gray-400">{reg.season}</p>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(reg.payment_status)}
                        <span className="text-sm">{getPaymentStatusLabel(reg.payment_status)}</span>
                      </div>
                      {reg.amount_owing > 0 && (
                        <span className="text-sm font-semibold text-red-600">
                          ${reg.amount_owing.toFixed(2)} owing
                        </span>
                      )}
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/my-account/individual/edit/${userData.id}/${reg.league_id}`}
                        className="w-full"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit Registration
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

        {/* No Registrations */}
        {totalRegistrations === 0 && (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-[#6F6F6F] text-lg">No registrations found for this user</p>
              <p className="text-gray-500 text-sm mt-2">
                This user has not registered for any teams or individual leagues
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}