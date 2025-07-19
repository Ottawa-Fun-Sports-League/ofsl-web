import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { supabase } from '../../../lib/supabase';
import { Crown, Users, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../components/ui/toast';

interface TeamData {
  id: number;
  name: string;
  captain_id: string;
  roster: string[];
  created_at: string;
  skill_level_id: number | null;
  captain_name: string | null;
  skill_name: string | null;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | null;
  amount_due: number | null;
  amount_paid: number | null;
  league?: {
    id: number;
    name: string;
    cost: number | null;
    location: string | null;
    sports?: {
      name: string;
    } | null;
  } | null;
}

interface LeagueTeamsProps {
  leagueId: number;
  onTeamsUpdate?: () => void;
}

export function LeagueTeams({ leagueId, onTeamsUpdate }: LeagueTeamsProps) {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadTeams();
  }, [leagueId]);

  useEffect(() => {
    // Notify parent when teams data changes
    if (onTeamsUpdate) {
      onTeamsUpdate();
    }
  }, [teams, onTeamsUpdate]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get teams with captain info and skill level
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          created_at,
          skill_level_id,
          users:captain_id(name),
          skills:skill_level_id(name),
          leagues:league_id(id, name, cost, location, sports(name))
        `)
        .eq('league_id', leagueId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      if (!teamsData) {
        setTeams([]);
        return;
      }

      // Get payment information for each team
      const teamsWithPayments = await Promise.all(
        teamsData.map(async (team) => {
          const { data: paymentData, error: paymentError } = await supabase
            .from('league_payments')
            .select('status, amount_due, amount_paid')
            .eq('team_id', team.id)
            .eq('league_id', leagueId)
            .maybeSingle();

          if (paymentError) {
            console.error('Error fetching payment for team:', team.id, paymentError);
          }

          return {
            id: team.id,
            name: team.name,
            captain_id: team.captain_id,
            roster: team.roster || [],
            created_at: team.created_at,
            skill_level_id: team.skill_level_id,
            captain_name: team.users?.name || null,
            skill_name: team.skills?.name || null,
            payment_status: paymentData?.status || null,
            amount_due: paymentData?.amount_due || null,
            amount_paid: paymentData?.amount_paid || null,
            league: team.leagues, // Add the league data
          };
        })
      );

      setTeams(teamsWithPayments);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    const confirmDelete = confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone and will remove all team data including registrations and payment records.`);
    
    if (!confirmDelete) return;
    
    try {
      setDeleting(teamId);
      
      // 1. Update team_ids for all users in the roster
      const { data: teamData, error: teamFetchError } = await supabase
        .from('teams')
        .select('roster')
        .eq('id', teamId)
        .single();
        
      if (teamFetchError) {
        console.error(`Error fetching team ${teamId}:`, teamFetchError);
      } else if (teamData.roster && teamData.roster.length > 0) {
        for (const userId of teamData.roster) {
          const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('team_ids')
            .eq('id', userId)
            .single();
            
          if (fetchError) {
            console.error(`Error fetching user ${userId}:`, fetchError);
            continue;
          }
          
          if (userData) {
            const updatedTeamIds = (userData.team_ids || []).filter((id: number) => id !== teamId);
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ team_ids: updatedTeamIds })
              .eq('id', userId);
              
            if (updateError) {
              console.error(`Error updating user ${userId}:`, updateError);
            }
          }
        }
      }
      
      // 2. Delete the team (league_payments will be deleted via ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
        
      if (deleteError) throw deleteError;
      
      showToast('Team deleted successfully', 'success');
      
      // Reload teams to update the UI
      await loadTeams();
      
      // Notify parent component about the update
      if (onTeamsUpdate) {
        onTeamsUpdate();
      }
      
    } catch (error: any) {
      console.error('Error deleting team:', error);
      showToast(error.message || 'Failed to delete team', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const getPaymentStatusColor = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Teams Registered</h3>
        <p className="text-[#6F6F6F]">No teams have registered for this league yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#6F6F6F]">Registered Teams</h2>
        <div className="text-sm text-[#6F6F6F]">
          Total Teams: {teams.length}
        </div>
      </div>

      <div className="space-y-4">
        {teams.map((team) => (
          <Card key={team.id} className="shadow-md overflow-hidden rounded-lg">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-[#6F6F6F]">{team.name}</h3>
                    {team.skill_name && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {team.skill_name}
                      </span>
                    )}
                    <Link 
                      to={`/my-account/teams/edit/${team.id}`}
                      className="text-[#B20000] hover:text-[#8A0000] text-sm hover:underline ml-auto"
                    >
                      Edit registration
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600">{team.league?.name}</p>
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2" title="Captain">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span className="text-[#6F6F6F]">{team.captain_name || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="text-[#6F6F6F]">{team.roster.length} players</span>
                  </div>
                  
                  <div className="flex items-center gap-2" title="Registration Date">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <span className="text-[#6F6F6F]">{formatDate(team.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2" title="Payment">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                  {team.amount_due && team.amount_paid !== null ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[#6F6F6F] whitespace-nowrap">
                        ${team.amount_paid.toFixed(2)} / ${(team.amount_due * 1.13).toFixed(2)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(team.payment_status)}`}>
                        {team.payment_status && team.payment_status.charAt(0).toUpperCase() + team.payment_status.slice(1)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[#6F6F6F] whitespace-nowrap">
                        $0.00 / ${team.league?.cost ? (parseFloat(team.league.cost.toString()) * 1.13).toFixed(2) : '0.00'}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}