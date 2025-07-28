import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { PaymentStatusBadge } from '../../components/ui/payment-status-badge';
import { useViewPreference } from '../../hooks/useViewPreference';
import { 
  Users, 
  Trash2, 
  ArrowLeft,
  Crown,
  Calendar,
  DollarSign,
  GripVertical,
  Search,
  Grid3X3,
  List,
  Edit,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TeamData {
  id: number;
  name: string;
  captain_id: string;
  roster: string[];
  created_at: string;
  skill_level_id: number | null;
  display_order: number;
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

interface ExtendedTeam {
  id: number;
  name: string;
  captain_id: string;
  roster: string[] | null;
  created_at: string;
  skill_level_id: number | null;
  display_order?: number;
  users?: { name: string } | null;
  skills?: { name: string } | null;
  leagues?: {
    id: number;
    name: string;
    cost: number | null;
    location: string | null;
    sports?: {
      name: string;
    } | null;
  } | null;
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
  const [activeTeams, setActiveTeams] = useState<TeamData[]>([]);
  const [waitlistedTeams, setWaitlistedTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [movingTeam, setMovingTeam] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredActiveTeams, setFilteredActiveTeams] = useState<TeamData[]>([]);
  const [filteredWaitlistedTeams, setFilteredWaitlistedTeams] = useState<TeamData[]>([]);
  const [viewMode, setViewMode] = useViewPreference({ 
    key: `league-teams-${leagueId}`, 
    defaultView: 'card' 
  }) as ['card' | 'table', (view: 'card' | 'table') => void];
  const { showToast } = useToast();
  const { userProfile } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (leagueId) {
      loadLeagueData();
      loadTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Filter teams based on search term
  useEffect(() => {
    const filterTeams = (teams: TeamData[]) => {
      if (!searchTerm.trim()) return teams;
      
      const term = searchTerm.toLowerCase();
      return teams.filter(team => 
        team.name.toLowerCase().includes(term) ||
        (team.captain_name && team.captain_name.toLowerCase().includes(term)) ||
        team.captain_id.toLowerCase().includes(term)
      );
    };

    setFilteredActiveTeams(filterTeams(activeTeams));
    setFilteredWaitlistedTeams(filterTeams(waitlistedTeams));
  }, [activeTeams, waitlistedTeams, searchTerm]);

  const loadLeagueData = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          location,
          cost,
          sports:sport_id(name)
        `)
        .eq('id', parseInt(leagueId!))
        .single();

      if (error) throw error;

      setLeague({
        id: data.id,
        name: data.name,
        sport_name: data.sports && Array.isArray(data.sports) && data.sports.length > 0 
          ? data.sports[0].name 
          : (data.sports && typeof data.sports === 'object' && 'name' in data.sports 
            ? (data.sports as { name: string }).name 
            : ''),
        location: data.location || '',
        cost: data.cost || 0
      });
    } catch (err) {
      console.error('Error loading league:', err);
      setError('Failed to load league data');
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get teams with display_order first, fall back to created_at if column doesn't exist
      let activeTeamsData: ExtendedTeam[] = [];
      let waitlistedTeamsData: ExtendedTeam[] = [];
      let dragSupported = true;

      // First attempt with display_order
      let activeResult = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          created_at,
          skill_level_id,
          display_order,
          users:captain_id(name),
          skills:skill_level_id(name),
          leagues:league_id(id, name, cost, location, sports(name))
        `)
        .eq('league_id', parseInt(leagueId!))
        .eq('active', true)
        .order('display_order', { ascending: true });

      let waitlistResult = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          created_at,
          skill_level_id,
          display_order,
          users:captain_id(name),
          skills:skill_level_id(name),
          leagues:league_id(id, name, cost, location, sports(name))
        `)
        .eq('league_id', parseInt(leagueId!))
        .eq('active', false)
        .order('display_order', { ascending: true });

      // Check if display_order column doesn't exist
      if (activeResult.error && activeResult.error.message?.includes('display_order')) {
        dragSupported = false;
        
        // Fallback to created_at ordering
        activeResult = await supabase
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
          .eq('league_id', parseInt(leagueId!))
          .eq('active', true)
          .order('created_at', { ascending: false }) as unknown as { data: ExtendedTeam[] | null; error: Error | null };

        waitlistResult = await supabase
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
          .eq('league_id', parseInt(leagueId!))
          .eq('active', false)
          .order('created_at', { ascending: false }) as unknown as { data: ExtendedTeam[] | null; error: Error | null };
      }

      if (activeResult.error) throw activeResult.error;
      if (waitlistResult.error) throw waitlistResult.error;

      const activeData = (activeResult as { data: ExtendedTeam[] | null }).data || [];
      activeTeamsData = activeData.map((team: ExtendedTeam) => ({
        ...team,
        display_order: team.display_order || 0
      }));
      const waitlistData = (waitlistResult as { data: ExtendedTeam[] | null }).data || [];
      waitlistedTeamsData = waitlistData.map((team: ExtendedTeam) => ({
        ...team,
        display_order: team.display_order || 0
      }));
      setDragEnabled(dragSupported);

      // Helper function to process teams with payment data
      const processTeamsWithPayments = async (teams: ExtendedTeam[]): Promise<TeamData[]> => {
        if (!teams) return [];
        
        return Promise.all(
          teams.map(async (team) => {
            const { data: paymentData, error: paymentError } = await supabase
              .from('league_payments')
              .select('status, amount_due, amount_paid')
              .eq('team_id', team.id)
              .eq('league_id', parseInt(leagueId!))
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
              display_order: team.display_order || 0,
              captain_name: team.users?.name || null,
              skill_name: team.skills?.name || null,
              payment_status: paymentData?.status || null,
              amount_due: paymentData?.amount_due || null,
              amount_paid: paymentData?.amount_paid || null,
              league: team.leagues,
            };
          })
        );
      };

      const [processedActiveTeams, processedWaitlistedTeams] = await Promise.all([
        processTeamsWithPayments(activeTeamsData),
        processTeamsWithPayments(waitlistedTeamsData)
      ]);

      setActiveTeams(processedActiveTeams);
      setWaitlistedTeams(processedWaitlistedTeams);
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
      
    } catch (error) {
      console.error('Error deleting team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
      showToast(errorMessage, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleMoveTeam = async (teamId: number, teamName: string, currentlyActive: boolean) => {
    const actionText = currentlyActive ? 'move to waitlist' : 'activate from waitlist';
    const confirmMove = confirm(`Are you sure you want to ${actionText} the team "${teamName}"?`);
    
    if (!confirmMove) return;
    
    try {
      setMovingTeam(teamId);
      
      // Update the team's active status
      const { error: updateError } = await supabase
        .from('teams')
        .update({ active: !currentlyActive })
        .eq('id', teamId);
        
      if (updateError) throw updateError;
      
      const successMessage = currentlyActive 
        ? `Team "${teamName}" moved to waitlist` 
        : `Team "${teamName}" activated from waitlist`;
      
      showToast(successMessage, 'success');
      
      // Reload teams to update the UI
      await loadTeams();
      
    } catch (error) {
      console.error('Error moving team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move team';
      showToast(errorMessage, 'error');
    } finally {
      setMovingTeam(null);
    }
  };

  const handleActiveTeamDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeTeams.findIndex((team) => team.id === active.id);
      const newIndex = activeTeams.findIndex((team) => team.id === over.id);

      const newActiveTeams = arrayMove(activeTeams, oldIndex, newIndex);
      setActiveTeams(newActiveTeams);

      // Update display_order in database
      try {
        const updates = newActiveTeams.map((team, index) => ({
          id: team.id,
          display_order: index + 1
        }));

        for (const update of updates) {
          await supabase
            .from('teams')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }

        showToast('Team order updated successfully', 'success');
      } catch (error) {
        console.error('Error updating team order:', error);
        showToast('Failed to update team order', 'error');
        // Revert the optimistic update
        loadTeams();
      }
    }
  };

  const handleWaitlistTeamDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = waitlistedTeams.findIndex((team) => team.id === active.id);
      const newIndex = waitlistedTeams.findIndex((team) => team.id === over.id);

      const newWaitlistedTeams = arrayMove(waitlistedTeams, oldIndex, newIndex);
      setWaitlistedTeams(newWaitlistedTeams);

      // Update display_order in database
      try {
        const updates = newWaitlistedTeams.map((team, index) => ({
          id: team.id,
          display_order: index + 1
        }));

        for (const update of updates) {
          await supabase
            .from('teams')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }

        showToast('Waitlist order updated successfully', 'success');
      } catch (error) {
        console.error('Error updating waitlist order:', error);
        showToast('Failed to update waitlist order', 'error');
        // Revert the optimistic update
        loadTeams();
      }
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

  // Sortable team card component
  const SortableTeamCard = ({ team, isWaitlisted = false }: { team: TeamData; isWaitlisted?: boolean }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: team.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card 
        ref={setNodeRef} 
        style={style}
        className={`bg-white shadow-md overflow-hidden rounded-lg ${isDragging ? 'z-50' : ''}`}
      >
        <CardContent className="p-4">
          {/* Header Section - Team Name and Status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Drag Handle */}
              {dragEnabled && (
                <div 
                  {...attributes} 
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded flex-shrink-0 self-start"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
              )}
              
              {/* Team Name and Badges */}
              <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                <h3 className="text-lg font-bold text-[#6F6F6F] truncate">
                  {team.name}
                </h3>
                {isWaitlisted && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full whitespace-nowrap">
                    Waitlisted
                  </span>
                )}
                {team.skill_name && (
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${isWaitlisted ? 'bg-gray-300 text-gray-700' : 'bg-blue-100 text-blue-800'}`}>
                    {team.skill_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* League Name */}
          <p className={`text-sm mb-3 ${dragEnabled ? 'ml-6' : ''} ${isWaitlisted ? 'text-gray-600' : 'text-gray-600'}`}>
            {team.league?.name}
          </p>
          
          {/* Body Section - Team Info Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm ${dragEnabled ? 'ml-6' : ''}`}>
            {/* Captain Info */}
            <div className="flex items-center gap-1.5" title="Captain">
              <Crown className={`h-4 w-4 flex-shrink-0 ${isWaitlisted ? 'text-gray-600' : 'text-blue-600'}`} />
              <span className={`truncate text-xs ${isWaitlisted ? 'text-gray-700' : 'text-[#6F6F6F]'}`}>
                {team.captain_name || 'Unknown'}
              </span>
            </div>
            
            {/* Player Count */}
            <div className="flex items-center gap-1.5">
              <Users className={`h-4 w-4 flex-shrink-0 ${isWaitlisted ? 'text-blue-600' : 'text-blue-500'}`} />
              <span className={`whitespace-nowrap ${isWaitlisted ? 'text-gray-700' : 'text-[#6F6F6F]'}`}>
                {team.roster.length} players
              </span>
            </div>
            
            {/* Registration Date */}
            <div className="flex items-center gap-1.5 col-span-2 md:col-span-1" title="Registration Date">
              <Calendar className={`h-4 w-4 flex-shrink-0 ${isWaitlisted ? 'text-green-600' : 'text-green-500'}`} />
              <span className={`text-xs ${isWaitlisted ? 'text-gray-700' : 'text-[#6F6F6F]'}`}>
                {formatDate(team.created_at)}
              </span>
            </div>
            
            {/* Payment Info */}
            {!isWaitlisted && (
              <div className="flex items-center gap-1.5 col-span-2 md:col-span-1" title="Payment">
                <DollarSign className="h-4 w-4 flex-shrink-0 text-purple-500" />
                <div className="flex items-center gap-1 min-w-0">
                  {team.amount_due && team.amount_paid !== null ? (
                    <>
                      <span className="text-[#6F6F6F] text-xs whitespace-nowrap">
                        ${team.amount_paid.toFixed(2)} / ${(team.amount_due * 1.13).toFixed(2)}
                      </span>
                      {team.payment_status && (
                        <PaymentStatusBadge 
                          status={team.payment_status} 
                          size="sm"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[#6F6F6F] text-xs whitespace-nowrap">
                        $0.00 / ${team.league?.cost ? (parseFloat(team.league.cost.toString()) * 1.13).toFixed(2) : '0.00'}
                      </span>
                      <PaymentStatusBadge 
                        status="pending" 
                        size="sm"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Section - Action Buttons */}
          <div className={`flex justify-between items-center pt-2 border-t border-gray-100 ${dragEnabled ? 'ml-6' : ''}`}>
            <div className="flex items-center gap-2">
              <Link 
                to={`/my-account/teams/edit/${team.id}`}
                className={`h-7 px-3 text-xs border rounded bg-white hover:bg-gray-50 transition-colors inline-flex items-center ${
                  isWaitlisted 
                    ? 'border-gray-300 text-gray-600 hover:text-gray-800' 
                    : 'border-blue-300 text-blue-700 hover:text-blue-800'
                }`}
              >
                Edit registration
              </Link>
              
              <button
                onClick={() => handleMoveTeam(team.id, team.name, !isWaitlisted)}
                disabled={movingTeam === team.id}
                className={`h-7 px-3 text-xs border rounded bg-white hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isWaitlisted 
                    ? 'border-green-300 text-green-700 hover:text-green-800' 
                    : 'border-yellow-300 text-yellow-700 hover:text-yellow-800'
                }`}
                title={isWaitlisted ? 'Move team to active registration' : 'Move team to waitlist'}
              >
                {movingTeam === team.id ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline-block"></div>
                ) : isWaitlisted ? (
                  'Move to Active'
                ) : (
                  'Move to Waitlist'
                )}
              </button>
            </div>
            
            <Button
              onClick={() => handleDeleteTeam(team.id, team.name)}
              disabled={deleting === team.id}
              size="sm"
              variant="outline"
              className="h-7 px-2 border-red-300 text-red-700 hover:bg-red-50"
              title="Delete team"
            >
              {deleting === team.id ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Table view component
  const TeamTable = ({ teams, isWaitlisted = false }: { teams: TeamData[]; isWaitlisted?: boolean }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto xl:overflow-visible">
          <table className="w-full xl:table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Team Name
                </th>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Captain
                </th>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Skill
                </th>
                <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Players
                </th>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                  Registered
                </th>
                {!isWaitlisted && (
                  <>
                    <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Payment
                    </th>
                  </>
                )}
                <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teams.map((team) => {
                // Calculate payment details
                const totalAmount = team.amount_due 
                  ? team.amount_due * 1.13 
                  : (team.league?.cost ? parseFloat(team.league.cost.toString()) * 1.13 : 0);
                const amountPaid = team.amount_paid || 0;
                const amountOwing = totalAmount - amountPaid;

                return (
                  <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[200px]" title={team.name}>
                          {team.name}
                        </div>
                        {isWaitlisted && (
                          <span className="inline-flex self-start mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Waitlisted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Crown className="h-3 w-3 text-blue-600 flex-shrink-0" data-testid="crown-icon" />
                        <div className="text-sm text-gray-700 truncate max-w-[150px]" title={team.captain_name || 'Unknown'}>
                          {team.captain_name || 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                      {team.skill_name ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {team.skill_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-700">
                        <Users className="h-3 w-3 text-blue-500" data-testid="users-icon" />
                        <span className="font-medium">{team.roster.length}</span>
                      </div>
                    </td>
                    <td className="px-3 lg:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-xs text-gray-600">
                        {new Date(team.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    {!isWaitlisted && (
                      <>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <PaymentStatusBadge 
                            status={team.payment_status || 'pending'} 
                            size="sm"
                          />
                        </td>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">P:</span>
                              <span className="font-medium text-green-700">${amountPaid.toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">O:</span>
                              <span className={`font-medium ${amountOwing > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                                ${amountOwing.toFixed(0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-900 font-semibold border-t pt-0.5">
                              <span className="text-gray-500">T:</span>
                              ${totalAmount.toFixed(0)}
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-0.5">
                        <Link 
                          to={`/my-account/teams/edit/${team.id}`}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Edit team"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleMoveTeam(team.id, team.name, !isWaitlisted)}
                          disabled={movingTeam === team.id}
                          className={`p-1 rounded transition-colors disabled:opacity-50 ${
                            isWaitlisted 
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                              : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                          }`}
                          title={isWaitlisted ? 'Move to active' : 'Move to waitlist'}
                        >
                          {movingTeam === team.id ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                          ) : isWaitlisted ? (
                            <ArrowLeft className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          disabled={deleting === team.id}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete team"
                        >
                          {deleting === team.id ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-[#B20000] hover:underline mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[#6F6F6F] mb-2">
                  {league?.name} - Teams Management
                </h1>
                <p className="text-[#6F6F6F] mb-2">
                  Sport: {league?.sport_name} | Location: {league?.location}
                </p>
                {/* League Cost Display */}
                {league?.cost && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-[#B20000] mr-1.5" />
                    <p className="text-sm font-medium text-[#6F6F6F]">
                      ${league.cost} + HST {league.sport_name === "Volleyball" ? "per team" : "per player"}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Edit League Button */}
              {userProfile?.is_admin && league?.id && (
                <Link
                  to={`/my-account/leagues/edit/${league.id}`}
                  className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                >
                  Edit league
                </Link>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
                <Input
                  placeholder="Search teams by name, captain, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              <div className="text-sm text-[#6F6F6F] whitespace-nowrap">
                {filteredActiveTeams.length + filteredWaitlistedTeams.length} of {activeTeams.length + waitlistedTeams.length} teams
              </div>
            </div>
          </div>
        </div>

        {/* Teams Content */}
        {activeTeams.length === 0 && waitlistedTeams.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Teams Registered</h3>
            <p className="text-[#6F6F6F]">No teams have registered for this league yet.</p>
          </div>
        ) : filteredActiveTeams.length === 0 && filteredWaitlistedTeams.length === 0 && searchTerm ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Teams Found</h3>
            <p className="text-[#6F6F6F]">No teams match your search criteria. Try adjusting your search term.</p>
          </div>
        ) : (
          <div>
            {/* Active Teams Section */}
            {filteredActiveTeams.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#6F6F6F]">Registered Teams</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('card')}
                        className={`p-2 rounded-md transition-all ${
                          viewMode === 'card' 
                            ? 'bg-white text-[#B20000] shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        title="Card view"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-md transition-all ${
                          viewMode === 'table' 
                            ? 'bg-white text-[#B20000] shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        title="Table view"
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm text-[#6F6F6F]">
                      {searchTerm ? `${filteredActiveTeams.length} of ${activeTeams.length}` : `${activeTeams.length}`} Active Teams
                    </div>
                  </div>
                </div>

                {viewMode === 'card' ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleActiveTeamDragEnd}
                  >
                    <SortableContext items={filteredActiveTeams.map(team => team.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {filteredActiveTeams.map((team) => (
                          <SortableTeamCard key={team.id} team={team} isWaitlisted={false} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <TeamTable teams={filteredActiveTeams} isWaitlisted={false} />
                )}
              </div>
            )}

            {/* Waitlisted Teams Section */}
            {filteredWaitlistedTeams.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-500">Waitlist</h2>
                  <div className="flex items-center gap-4">
                    {filteredActiveTeams.length === 0 && (
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('card')}
                          className={`p-2 rounded-md transition-all ${
                            viewMode === 'card' 
                              ? 'bg-white text-[#B20000] shadow-sm' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          title="Card view"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('table')}
                          className={`p-2 rounded-md transition-all ${
                            viewMode === 'table' 
                              ? 'bg-white text-[#B20000] shadow-sm' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          title="Table view"
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {searchTerm ? `${filteredWaitlistedTeams.length} of ${waitlistedTeams.length}` : `${waitlistedTeams.length}`} Waitlisted Teams
                    </div>
                  </div>
                </div>

                {viewMode === 'card' ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleWaitlistTeamDragEnd}
                  >
                    <SortableContext items={filteredWaitlistedTeams.map(team => team.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {filteredWaitlistedTeams.map((team) => (
                          <SortableTeamCard key={team.id} team={team} isWaitlisted={true} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <TeamTable teams={filteredWaitlistedTeams} isWaitlisted={true} />
                )}
              </div>
            )}

            {/* Show total if both sections exist */}
            {(filteredActiveTeams.length > 0 || filteredWaitlistedTeams.length > 0) && (activeTeams.length > 0 || waitlistedTeams.length > 0) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-center text-sm text-[#6F6F6F]">
                  {searchTerm ? (
                    <>
                      Showing: {filteredActiveTeams.length + filteredWaitlistedTeams.length} of {activeTeams.length + waitlistedTeams.length} teams 
                      ({filteredActiveTeams.length} active, {filteredWaitlistedTeams.length} waitlisted)
                    </>
                  ) : (
                    <>
                      Total Teams: {activeTeams.length + waitlistedTeams.length} ({activeTeams.length} active, {waitlistedTeams.length} waitlisted)
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}