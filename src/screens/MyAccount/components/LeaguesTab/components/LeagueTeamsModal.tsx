import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Users, X, Trash2, Search, UserPlus, CreditCard, Crown } from 'lucide-react';
import { LeagueWithTeamCount } from '../types';
import { supabase } from '../../../../../lib/supabase';
import { useToast } from '../../../../../components/ui/toast';
import { ConfirmationDialog } from '../../../../../components/ui/confirmation-dialog';
import { useAuth } from '../../../../../contexts/AuthContext';
import { PaymentManagementSection } from '../../shared/PaymentManagementSection';

interface Team {
  id: number;
  name: string;
  captain_id: string;
  captain_name: string;
  captain_email: string;
  captain_phone: string | null;
  roster: string[];
  team_size: number;
  created_at: string;
  league_id: number;
  league_name: string;
  sport_name: string;
  payment_status: 'pending' | 'paid' | 'failed' | null;
  payment_amount: number | null;
  payment_due_date: string | null;
}

interface TeamQueryResult {
  id: number;
  name: string;
  captain_id: string;
  roster: string[] | null;
  created_at: string;
  league_id: number;
  leagues: {
    id: number;
    name: string;
    sports: {
      name: string;
    } | null;
  } | null;
  captain: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
  league_payments: Array<{
    status: 'pending' | 'paid' | 'failed';
    amount_due: number;
    amount_paid: number;
    due_date: string;
  }> | null;
}

interface LeagueTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  league: LeagueWithTeamCount | null;
}

export function LeagueTeamsModal({ isOpen, onClose, league }: LeagueTeamsModalProps) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: '',
    onConfirm: () => {},
  });
  const { showToast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    if (isOpen && league) {
      loadTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, league]);

  const loadTeams = async () => {
    if (!league) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          created_at,
          league_id,
          leagues!inner(
            id,
            name,
            sports(name)
          ),
          captain:users!captain_id(
            name,
            email,
            phone
          ),
          league_payments(
            status,
            amount_due,
            amount_paid,
            due_date
          )
        `)
        .eq('league_id', league.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamsWithPayments = (data as unknown as TeamQueryResult[] | null)?.map((team) => ({
        id: team.id,
        name: team.name,
        captain_id: team.captain_id,
        captain_name: team.captain?.name || 'Unknown',
        captain_email: team.captain?.email || '',
        captain_phone: team.captain?.phone || null,
        roster: team.roster || [],
        team_size: team.roster?.length || 0,
        created_at: team.created_at,
        league_id: team.league_id,
        league_name: team.leagues?.name || '',
        sport_name: team.leagues?.sports?.name || '',
        payment_status: team.league_payments?.[0]?.status || null,
        payment_amount: team.league_payments?.[0]?.amount_due || null,
        payment_due_date: team.league_payments?.[0]?.due_date || null,
      })) || [];

      setTeams(teamsWithPayments);
      setFilteredTeams(teamsWithPayments);
    } catch (error) {
      console.error('Error loading teams:', error);
      showToast('Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTeams(teams);
    } else {
      const filtered = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.captain_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, teams]);

  const handleManageTeam = (teamId: number) => {
    navigate(`/teams/${teamId}/manage`);
  };

  const handleDeleteTeam = async (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const isUserCaptain = team.captain_id === userProfile?.id;
    if (!isUserCaptain && !userProfile?.is_admin) {
      showToast('Only team captains or admins can delete teams', 'error');
      return;
    }

    const confirmMessage = isUserCaptain 
      ? `Are you sure you want to delete your team "${team.name}"? This will remove all team members, delete payment records, and cancel your league registration. This action cannot be undone.`
      : `Are you sure you want to delete team "${team.name}"? This action cannot be undone.`;
    
    // Show confirmation dialog before deleting team
    setConfirmDialog({
      open: true,
      title: 'Delete Team',
      description: confirmMessage,
      confirmText: 'Delete Team',
      variant: 'destructive',
      onConfirm: () => performDeleteTeam(teamId),
    });
  };

  const performDeleteTeam = async (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      setDeletingTeamId(teamId);

      // Delete the team - this should trigger cascading deletes for payments and roster
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (deleteError) throw deleteError;

      // Update local state
      const updatedTeams = teams.filter(t => t.id !== teamId);
      setTeams(updatedTeams);
      setFilteredTeams(updatedTeams.filter(team =>
        searchTerm.trim() === '' ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.captain_name.toLowerCase().includes(searchTerm.toLowerCase())
      ));

      showToast('Team deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting team:', error);
      showToast('Failed to delete team', 'error');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const getPaymentStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'partial':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'failed':
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getPaymentStatusText = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'No Payment';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const togglePaymentExpansion = (teamId: number) => {
    setExpandedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  if (!isOpen || !league) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Teams in {league.name}</h3>
                <div className="mt-1">
                  <p className="text-sm text-gray-500">
                    {filteredTeams.length} of {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                    {searchTerm && ` matching "${searchTerm}"`}
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Filter */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search teams or captains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTeams.length === 0 && teams.length > 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
              <p className="text-gray-500">No teams match your search criteria.</p>
              <Button
                onClick={() => setSearchTerm('')}
                variant="ghost"
                className="mt-3"
              >
                Clear search
              </Button>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams registered</h3>
              <p className="text-gray-500">This league doesn&apos;t have any teams registered yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTeams.map((team) => (
                <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">{team.name}</h4>
                        <span className={`text-xs font-medium py-1 px-2 rounded-full border ${getPaymentStatusBadge(team.payment_status)}`}>
                          {getPaymentStatusText(team.payment_status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-600">{team.captain_name}</span>
                          </div>
                          <p className="text-gray-500 text-xs ml-6">{team.captain_email}</p>
                          {team.captain_phone && (
                            <p className="text-gray-500 text-xs ml-6">{team.captain_phone}</p>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Team Size:</span>
                          <p className="text-gray-600">{team.team_size} players</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Registered:</span>
                          <p className="text-gray-600">{formatDate(team.created_at)}</p>
                        </div>
                        
                        {team.payment_amount && (
                          <div>
                            <span className="font-medium text-gray-700">Amount:</span>
                            <p className="text-gray-600">${team.payment_amount}</p>
                            {team.payment_due_date && (
                              <p className="text-gray-500 text-xs">Due: {formatDate(team.payment_due_date)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManageTeam(team.id)}
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                        title="Manage Teammates"
                      >
                        <UserPlus className="h-4 w-4 text-blue-600" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePaymentExpansion(team.id)}
                        className="h-8 w-8 p-0 hover:bg-purple-100"
                        title="View Payment Details"
                      >
                        <CreditCard className="h-4 w-4 text-purple-600" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id)}
                        disabled={deletingTeamId === team.id || (!userProfile?.is_admin && team.captain_id !== userProfile?.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 disabled:opacity-50"
                        title={deletingTeamId === team.id ? 'Deleting...' : 
                               (!userProfile?.is_admin && team.captain_id !== userProfile?.id) ? 'Only captain or admin can delete' : 'Delete Team'}
                      >
                        {deletingTeamId === team.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Expandable Payment Management Section */}
                  {expandedPayments.has(team.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <PaymentManagementSection
                        teamId={team.id}
                        title={`Payment Records for ${team.name}`}
                        allowDelete={userProfile?.is_admin}
                        allowCreate={userProfile?.is_admin}
                        onPaymentDeleted={() => {
                          // Optionally refresh team data after payment deletion
                          loadTeams();
                        }}
                        onPaymentCreated={() => {
                          // Refresh team data after payment creation
                          loadTeams();
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />
    </div>
  );
}