import { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { TeamsSection } from './TeamsSection';
import { TeammateManagementModal } from './TeammateManagementModal';
import { useTeamsData } from './useTeamsData';
import { useTeamOperations } from './useTeamOperations';

export function TeamsTab() {
  const { user, userProfile } = useAuth();
  const { leaguePayments, teams, loading, setLeaguePayments, refetchTeams, updateTeamRoster } = useTeamsData(userProfile?.id);
  const { unregisteringPayment, handleUnregister } = useTeamOperations();
  const [selectedTeam, setSelectedTeam] = useState<{id: number, name: string, roster: string[], captainId: string, leagueName: string} | null>(null);

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
            ...selectedTeam,
            roster: [...updatedTeam.roster] // Ensure we have the latest roster from database
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
        onUnregister={onUnregister}
        onManageTeammates={handleManageTeammates}
      />
      
      {selectedTeam && (
        <TeammateManagementModal
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          currentRoster={selectedTeam.roster}
          captainId={selectedTeam.captainId}
          onRosterUpdate={handleRosterUpdate}
          leagueName={selectedTeam.leagueName}
        />
      )}
    </div>
  );
}