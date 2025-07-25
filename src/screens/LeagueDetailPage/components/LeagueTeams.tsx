import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { PaymentStatusBadge } from '../../../components/ui/payment-status-badge';
import { supabase } from '../../../lib/supabase';
import { Crown, Users, Calendar, DollarSign, Trash2, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../components/ui/toast';
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

interface LeagueTeamsProps {
  leagueId: number;
  onTeamsUpdate?: () => void;
}

export function LeagueTeams({ leagueId, onTeamsUpdate }: LeagueTeamsProps) {
  const [activeTeams, setActiveTeams] = useState<TeamData[]>([]);
  const [waitlistedTeams, setWaitlistedTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [movingTeam, setMovingTeam] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragEnabled, setDragEnabled] = useState(false);
  const { showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  useEffect(() => {
    // Notify parent when teams data changes
    if (onTeamsUpdate) {
      onTeamsUpdate();
    }
  }, [activeTeams, waitlistedTeams, onTeamsUpdate]);

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
        .eq('league_id', leagueId)
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
        .eq('league_id', leagueId)
        .eq('active', false)
        .order('display_order', { ascending: true });

      // Check if display_order column doesn't exist
      if (activeResult.error && activeResult.error.message?.includes('display_order')) {
        dragSupported = false;
        
        // Fallback to created_at ordering
        const activeResultFallback = await supabase
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

        const waitlistResultFallback = await supabase
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
          .eq('active', false)
          .order('created_at', { ascending: false });
          
        activeResult = activeResultFallback as any;
        waitlistResult = waitlistResultFallback as any;
      }

      if (activeResult.error) throw activeResult.error;
      if (waitlistResult.error) throw waitlistResult.error;

      activeTeamsData = activeResult.data as unknown as ExtendedTeam[];
      waitlistedTeamsData = waitlistResult.data as unknown as ExtendedTeam[];
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
              display_order: team.display_order || 0, // Default to 0 if not present
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
      
      // Notify parent component about the update
      if (onTeamsUpdate) {
        onTeamsUpdate();
      }
      
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
      
      // Notify parent component about the update
      if (onTeamsUpdate) {
        onTeamsUpdate();
      }
      
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

  if (activeTeams.length === 0 && waitlistedTeams.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Teams Registered</h3>
        <p className="text-[#6F6F6F]">No teams have registered for this league yet.</p>
      </div>
    );
  }

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
        className={`shadow-md overflow-hidden rounded-lg ${isWaitlisted ? 'bg-gray-50' : ''} ${isDragging ? 'z-50' : ''}`}
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
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${isWaitlisted ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-800'} text-xs`}>
                <Crown className="h-3 w-3" />
                <span className="truncate">Captain</span>
              </div>
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
                className={`text-xs hover:underline ${isWaitlisted ? 'text-gray-600 hover:text-gray-800' : 'text-[#B20000] hover:text-[#8A0000]'}`}
              >
                Edit registration
              </Link>
              
              <div className="h-3 w-px bg-gray-300"></div>
              
              <button
                onClick={() => handleMoveTeam(team.id, team.name, !isWaitlisted)}
                disabled={movingTeam === team.id}
                className={`text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${isWaitlisted 
                  ? 'text-green-700 hover:text-green-800' 
                  : 'text-yellow-700 hover:text-yellow-800'
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


  return (
    <div>
      {/* Active Teams Section */}
      {activeTeams.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">Registered Teams</h2>
            <div className="text-sm text-[#6F6F6F]">
              Active Teams: {activeTeams.length}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleActiveTeamDragEnd}
          >
            <SortableContext items={activeTeams.map(team => team.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {activeTeams.map((team) => (
                  <SortableTeamCard key={team.id} team={team} isWaitlisted={false} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Waitlisted Teams Section */}
      {waitlistedTeams.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-500">Waitlist</h2>
            <div className="text-sm text-gray-500">
              Waitlisted Teams: {waitlistedTeams.length}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWaitlistTeamDragEnd}
          >
            <SortableContext items={waitlistedTeams.map(team => team.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {waitlistedTeams.map((team) => (
                  <SortableTeamCard key={team.id} team={team} isWaitlisted={true} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Show total if both sections exist */}
      {activeTeams.length > 0 && waitlistedTeams.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-center text-sm text-[#6F6F6F]">
            Total Teams: {activeTeams.length + waitlistedTeams.length} ({activeTeams.length} active, {waitlistedTeams.length} waitlisted)
          </div>
        </div>
      )}
    </div>
  );
}