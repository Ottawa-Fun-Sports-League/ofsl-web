import { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { TeamsSection } from './TeamsSection';
import { TeammateManagementModal } from './TeammateManagementModal';
import { useTeamsData } from './useTeamsData';
import { useTeamOperations } from './useTeamOperations';

export function TeamsTab() {
  const { user, userProfile } = useAuth();
  const { leaguePayments, teams, loading, setLeaguePayments, setTeams, refetchTeams, updateTeamRoster, updateTeamCaptain } = useTeamsData(userProfile?.id);
  const { unregisteringPayment, handleUnregister } = useTeamOperations();
  const [selectedTeam, setSelectedTeam] = useState<{id: number, name: string, roster: string[], captainId: string, leagueName: string} | null>(null);
  const [leavingTeam, setLeavingTeam] = useState<number | null>(null);

  const onUnregisterSuccess = async (paymentId: number) => {
    // Remove the payment from the local state
    setLeaguePayments(prev => prev.filter(p => p.id !== paymentId));
    
    // Refetch teams data since the team was deleted
    await refetchTeams();
    
    // Close any open teammate management modal since the team no longer exists
    setSelectedTeam(null);
  };

  const onUnregister = (paymentId: number, leagueName: string) => {
    handleUnregister(paymentId, leagueName, onUnregisterSuccess);
  };

  const handleLeaveTeam = async (teamId: number, teamName: string) => {
    if (!userProfile?.id || !user) return;
    
    if (window.confirm(`Are you sure you want to leave the team "${teamName}"? This action cannot be undone.`)) {
      setLeavingTeam(teamId);
      
      try {
        const team = teams.find(t => t.id === teamId);
        if (!team) throw new Error('Team not found');

        // Get the user's access token for the API call
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        // Call the manage-teammates edge function to remove the user from the team
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/manage-teammates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            action: 'remove',
            teamId: teamId.toString(),
            userId: userProfile.id,
            captainId: team.captain_id
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to leave team');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to leave team');
        }

        // Refetch teams data to get updated information from database
        await refetchTeams();
        
        // Close any open teammate management modal since the user left
        setSelectedTeam(null);
        
        alert(`Successfully left team: ${teamName}`);
        
      } catch (error) {
        console.error('Error leaving team:', error);
        alert(`Failed to leave team: ${error.message}`);
      } finally {
        setLeavingTeam(null);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleManageTeammates = (teamId: number, teamName: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam({ 
        id: teamId, 
        name: teamName, 
        roster: [...team.roster], // Create a copy to prevent reference issues
        captainId: team.captain_id,
        leagueName: team.league?.name || 'OFSL League'
      });
    }
  };

  const handleRosterUpdate = async (newRoster: string[]) => {
    if (selectedTeam) {
      // Update the selectedTeam state immediately for modal consistency
      setSelectedTeam({ ...selectedTeam, roster: newRoster });
      
      // Update the main teams state immediately for instant UI update
      updateTeamRoster(selectedTeam.id, newRoster);
      
      // Refetch teams data to ensure everything is in sync with database
      const updatedTeams = await refetchTeams();
      
      // Update selectedTeam with the fresh data from database to ensure consistency
      if (updatedTeams) {
        const updatedTeam = updatedTeams.find(t => t.id === selectedTeam.id);
        if (updatedTeam) {
          setSelectedTeam({
            id: updatedTeam.id,
            name: updatedTeam.name,
            roster: [...updatedTeam.roster], // Ensure we have the latest roster from database
            captainId: updatedTeam.captain_id, // Update captain ID in case it changed
            leagueName: updatedTeam.league?.name || 'OFSL League'
          });
        }
      }
    }
  };

  const handleCaptainUpdate = async (newCaptainId: string) => {
    if (selectedTeam) {
      // Update the selectedTeam state immediately for modal consistency
      setSelectedTeam({ ...selectedTeam, captainId: newCaptainId });
      
      // Update the main teams state immediately for instant UI update
      updateTeamCaptain(selectedTeam.id, newCaptainId);
      
      // Refetch teams data to ensure everything is in sync with database
      const updatedTeams = await refetchTeams();
      
      // Update selectedTeam with the fresh data from database to ensure consistency
      if (updatedTeams) {
        const updatedTeam = updatedTeams.find(t => t.id === selectedTeam.id);
        if (updatedTeam) {
          setSelectedTeam({
            id: updatedTeam.id,
            name: updatedTeam.name,
            roster: [...updatedTeam.roster],
            captainId: updatedTeam.captain_id, // Ensure we have the latest captain from database
            leagueName: updatedTeam.league?.name || 'OFSL League'
          });
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <TeamsSection
        teams={teams}
        currentUserId={userProfile?.id}
        leaguePayments={leaguePayments}
        unregisteringPayment={unregisteringPayment}
        leavingTeam={leavingTeam}
        onUnregister={onUnregister}
        onLeaveTeam={handleLeaveTeam}
        onManageTeammates={handleManageTeammates}
      />
      
      {selectedTeam && (
        <TeammateManagementModal
          key={`team-${selectedTeam.id}-${Date.now()}`}
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          currentRoster={selectedTeam.roster}
          captainId={selectedTeam.captainId}
          onRosterUpdate={handleRosterUpdate}
          onCaptainUpdate={handleCaptainUpdate}
          leagueName={selectedTeam.leagueName}
          readOnly={selectedTeam.captainId !== userProfile?.id}
        />
      )}
    </div>
  );
}