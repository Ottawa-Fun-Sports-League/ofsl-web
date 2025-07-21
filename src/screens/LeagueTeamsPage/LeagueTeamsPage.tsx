import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Users, 
  Trash2, 
  Search, 
  UserPlus, 
  CreditCard, 
  ArrowLeft, 
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../contexts/AuthContext';
import { TeammateManagementModal } from '../MyAccount/components/TeamsTab/TeammateManagementModal';
import { ConfirmationModal } from '../MyAccount/components/TeamEditPage/ConfirmationModal';
import { UnifiedPaymentSection, usePaymentOperations } from '../../components/payments';
import { useLeagueTeamsPayments } from './useLeagueTeamsPayments';

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

interface League {
  id: number;
  name: string;
  sport_name: string;
  location: string;
  cost: number;
}

export function LeagueTeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const [activePaymentTeamId, setActivePaymentTeamId] = useState<number | null>(null);
  const [managingTeam, setManagingTeam] = useState<{
    id: number;
    name: string;
    roster: string[];
    captainId: string;
    leagueName: string;
  } | null>(null);
  const { showToast } = useToast();
  const { userProfile } = useAuth();
  
  // Payment management for the currently expanded team
  const {
    paymentInfo,
    paymentHistory,
    loading: paymentLoading,
    setPaymentInfo,
    setPaymentHistory,
    refreshPaymentInfo
  } = useLeagueTeamsPayments(activePaymentTeamId);

  // Payment operations hook
  const {
    depositAmount,
    paymentMethod,
    paymentNotes,
    processingPayment,
    editingNoteId,
    editingPayment,
    showDeleteConfirmation,
    paymentToDelete,
    setDepositAmount,
    setPaymentMethod,
    setPaymentNotes,
    setEditingPayment,
    setShowDeleteConfirmation,
    handleProcessPayment,
    handleDeletePayment,
    confirmDeletePayment,
    handleEditPayment,
    handleSavePaymentEdit,
    handleCancelEdit
  } = usePaymentOperations(paymentInfo, paymentHistory, setPaymentInfo, setPaymentHistory);

  useEffect(() => {
    if (leagueId) {
      loadLeagueAndTeams();
    }
  }, [leagueId]);

  const loadLeagueAndTeams = async () => {
    if (!leagueId) return;
    
    try {
      setLoading(true);
      
      // Load league information
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          location,
          cost,
          sports(name)
        `)
        .eq('id', leagueId)
        .single();

      if (leagueError) throw leagueError;

      if (leagueData) {
        setLeague({
          id: leagueData.id,
          name: leagueData.name,
          sport_name: leagueData.sports?.name || '',
          location: leagueData.location || 'TBD',
          cost: leagueData.cost || 0
        });
      }
      
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          created_at,
          leagues!inner(
            id,
            name,
            sport:sports(name)
          ),
          captain:captain_id(
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
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      const teamsWithPayments = teamsData?.map(team => ({
        id: team.id,
        name: team.name,
        captain_id: team.captain_id,
        captain_name: team.captain?.name || 'Unknown',
        captain_email: team.captain?.email || '',
        captain_phone: team.captain?.phone || null,
        roster: team.roster || [],
        team_size: team.roster?.length || 0,
        created_at: team.created_at,
        league_id: team.leagues.id,
        league_name: team.leagues.name,
        sport_name: team.leagues.sport?.name || '',
        payment_status: team.league_payments?.[0]?.status || null,
        payment_amount: team.league_payments?.[0]?.amount_due || null,
        payment_due_date: team.league_payments?.[0]?.due_date || null,
      })) || [];

      setTeams(teamsWithPayments);
      setFilteredTeams(teamsWithPayments);
    } catch (error) {
      console.error('Error loading league and teams:', error);
      showToast('Failed to load league data', 'error');
      navigate('/my-account/leagues');
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
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    setManagingTeam({
      id: teamId,
      name: team.name,
      roster: [...team.roster], // Create a copy to prevent reference issues
      captainId: team.captain_id,
      leagueName: team.league_name
    });
  };

  const handleCloseTeamManagement = () => {
    setManagingTeam(null);
  };

  const handleRosterUpdate = async (newRoster: string[]) => {
    if (!managingTeam) return;

    try {
      // Ensure newRoster is an array
      const safeRoster = newRoster || [];
      
      // Update the managing team state immediately for modal consistency
      setManagingTeam(prev => prev ? { ...prev, roster: safeRoster } : null);
      
      // Reload the teams data from the database to get fresh information
      await loadLeagueAndTeams();
      
    } catch (error) {
      console.error('Error updating roster:', error);
      showToast('Failed to update team roster', 'error');
    }
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
      ? `Are you sure you want to delete your team "${team.name}"? This will:\n\n• Remove all team members\n• Delete payment records\n• Cancel your league registration\n\nThis action cannot be undone.`
      : `Are you sure you want to delete team "${team.name}"? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingTeamId(teamId);

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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
        setActivePaymentTeamId(null);
      } else {
        newSet.clear(); // Only allow one payment section open at a time
        newSet.add(teamId);
        setActivePaymentTeamId(teamId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading teams...</span>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">League Not Found</h1>
          <p className="text-gray-600 mb-6">The league you're looking for doesn't exist.</p>
          <Link to="/my-account/leagues">
            <Button>Back to Leagues</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => navigate('/my-account/leagues')}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{league.name} Teams</h1>
            <p className="text-gray-600">{league.sport_name} • {league.location}</p>
          </div>
          {userProfile?.is_admin && (
            <Link to={`/my-account/leagues/edit/${leagueId}`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Edit League
              </Button>
            </Link>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {filteredTeams.length} of {teams.length} {teams.length === 1 ? 'team' : 'teams'}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
          <div className="text-lg font-medium text-gray-900">
            League Fee: ${league.cost} + HST
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <div className="relative max-w-md">
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

      {/* Teams List */}
      {filteredTeams.length === 0 && teams.length > 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
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
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teams registered</h3>
          <p className="text-gray-500">This league doesn't have any teams registered yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeams.map((team) => (
            <div key={team.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
              <div className="p-6">
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
                        <span className="font-medium text-gray-700">Captain:</span>
                        <p className="text-gray-600">{team.captain_name}</p>
                        <p className="text-gray-500 text-xs">{team.captain_email}</p>
                        {team.captain_phone && (
                          <p className="text-gray-500 text-xs">{team.captain_phone}</p>
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
                      title="Manage Team"
                    >
                      <UserPlus className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePaymentExpansion(team.id)}
                      className="h-8 w-8 p-0 hover:bg-purple-100"
                      title="View Payments"
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
              </div>
              
              {/* Expandable Payment Management Section */}
              {expandedPayments.has(team.id) && paymentInfo && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  {paymentLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B20000]"></div>
                    </div>
                  ) : (
                    <UnifiedPaymentSection
                      paymentInfo={paymentInfo}
                      paymentHistory={paymentHistory}
                      editingNoteId={editingNoteId}
                      editingPayment={editingPayment}
                      depositAmount={depositAmount}
                      paymentMethod={paymentMethod}
                      paymentNotes={paymentNotes}
                      processingPayment={processingPayment}
                      onEditPayment={handleEditPayment}
                      onUpdateEditingPayment={setEditingPayment}
                      onSavePaymentEdit={handleSavePaymentEdit}
                      onCancelEdit={handleCancelEdit}
                      onDeletePayment={confirmDeletePayment}
                      onDepositAmountChange={setDepositAmount}
                      onPaymentMethodChange={setPaymentMethod}
                      onPaymentNotesChange={setPaymentNotes}
                      onProcessPayment={handleProcessPayment}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Teammate Management Modal */}
      {managingTeam && (
        <TeammateManagementModal
          isOpen={!!managingTeam}
          onClose={handleCloseTeamManagement}
          teamId={managingTeam.id}
          teamName={managingTeam.name}
          currentRoster={managingTeam.roster}
          captainId={managingTeam.captainId}
          onRosterUpdate={handleRosterUpdate}
          leagueName={managingTeam.leagueName}
          readOnly={!userProfile?.is_admin && managingTeam.captainId !== userProfile?.id}
        />
      )}
      
      {/* Payment Deletion Confirmation Modal */}
      {paymentToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          title="Delete Payment Entry"
          message={`Are you sure you want to delete this payment entry of $${paymentToDelete.amount.toFixed(2)}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            handleDeletePayment(paymentToDelete);
          }}
          onCancel={() => {
            setShowDeleteConfirmation(false);
          }}
        />
      )}
    </div>
  );
}