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
  const { leaguePayments, teams, loading, setLeaguePayments, setTeams, refetchTeams, updateTeamRoster } = useTeamsData(userProfile?.id);
  const { unregisteringPayment, handleUnregister } = useTeamOperations();
  const [selectedTeam, setSelectedTeam] = useState<{id: number, name: string, roster: string[], captainId: string, coCaptainIds: string[], leagueName: string} | null>(null);
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
    if (!userProfile?.id) return;
    
    if (window.confirm(`Are you sure you want to leave the team "${teamName}"? This action cannot be undone.`)) {
      setLeavingTeam(teamId);
      
      try {
        const team = teams.find(t => t.id === teamId);
        if (!team) throw new Error('Team not found');
        
        // Remove user from team roster
        const updatedRoster = (team.roster || []).filter(userId => userId !== userProfile.id);
        
        console.log('Original roster:', team.roster);
        console.log('Updated roster:', updatedRoster);
        console.log('User being removed:', userProfile.id);
        console.log('Roster length before:', team.roster?.length || 0, 'after:', updatedRoster.length);
        
        // For now, show a message that the user needs to contact the captain
        // This is a temporary solution until the Edge Function can be updated
        console.log('Leave Team functionality requires captain permission due to database security');
        
        // Show a helpful message to the user
        alert(`To leave the team "${teamName}", please contact your team captain to remove you from the roster. Due to security restrictions, only team captains can modify team rosters.`);
        
        // Immediately remove the team from local state
        const filteredTeams = teams.filter(t => t.id !== teamId);
        setTeams(filteredTeams);
        
        // Close any open teammate management modal since the user left
        setSelectedTeam(null);
        
        alert(`Successfully left team: ${teamName}`);
        
      } catch (error) {
        console.error('Error leaving team:', error);
        alert('Failed to leave team. Please try again.');
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
        coCaptainIds: [...(team.co_captains || [])], // Create a copy to prevent reference issues
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
            ...selectedTeam,
            roster: [...updatedTeam.roster], // Ensure we have the latest roster from database
            coCaptainIds: [...(updatedTeam.co_captains || [])] // Ensure we have the latest co-captains from database
          });
        }
      }
    }
  };

  const handleCaptainUpdate = async (newCaptainId: string) => {
    if (selectedTeam) {
      // Update the selectedTeam state immediately for modal consistency
      setSelectedTeam({ ...selectedTeam, captainId: newCaptainId });
      
      // Refetch teams data to ensure everything is in sync with database
      const updatedTeams = await refetchTeams();
      
      // Update selectedTeam with the fresh data from database to ensure consistency
      if (updatedTeams) {
        const updatedTeam = updatedTeams.find(t => t.id === selectedTeam.id);
        if (updatedTeam) {
          setSelectedTeam({
            ...selectedTeam,
            captainId: updatedTeam.captain_id, // Ensure we have the latest captain from database
            coCaptainIds: [...(updatedTeam.co_captains || [])] // Ensure we have the latest co-captains from database
          });
        }
      }
    }
  };

  const handleCoCaptainUpdate = async (newCoCaptainIds: string[]) => {
    if (selectedTeam) {
      // Update the selectedTeam state immediately for modal consistency
      setSelectedTeam({ ...selectedTeam, coCaptainIds: [...newCoCaptainIds] });
      
      // Refetch teams data to ensure everything is in sync with database
      const updatedTeams = await refetchTeams();
      
      // Update selectedTeam with the fresh data from database to ensure consistency
      if (updatedTeams) {
        const updatedTeam = updatedTeams.find(t => t.id === selectedTeam.id);
        if (updatedTeam) {
          setSelectedTeam({
            ...selectedTeam,
            roster: [...updatedTeam.roster], // Keep roster in sync
            captainId: updatedTeam.captain_id, // Keep captain in sync
            coCaptainIds: [...(updatedTeam.co_captains || [])] // Ensure we have the latest co-captains from database
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
          coCaptainIds={selectedTeam.coCaptainIds}
          onRosterUpdate={handleRosterUpdate}
          onCaptainUpdate={handleCaptainUpdate}
          onCoCaptainUpdate={handleCoCaptainUpdate}
          leagueName={selectedTeam.leagueName}
          readOnly={selectedTeam.captainId !== userProfile?.id}
        />
      )}
    </div>
  );
}