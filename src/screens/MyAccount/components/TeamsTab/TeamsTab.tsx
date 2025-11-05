import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { TeamsSection } from './TeamsSection';
import { TeammateManagementModal } from './TeammateManagementModal';
import { useTeamsData } from './useTeamsData';
import { useTeamOperations } from './useTeamOperations';
import { PendingInvites } from '../../../../components/PendingInvites';
import { Card, CardContent } from '../../../../components/ui/card';
import { CheckCircle } from 'lucide-react';
import { ConfirmationModal } from '../../../../components/ui/confirmation-modal';
import { ResultModal } from '../../../../components/ui/result-modal';
import { MissingSkillLevelPrompt } from './MissingSkillLevelPrompt';

export function TeamsTab() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { leaguePayments, teams, teamPaymentsByTeamId, individualLeagues, loading, setLeaguePayments, refetchTeams, refetchIndividualLeagues, refetchLeaguePayments, updateTeamRoster, updateTeamCaptain } = useTeamsData(userProfile?.id);
  const { unregisteringPayment, handleUnregister, confirmationState, handleConfirmCancellation, handleCloseModal, resultState, handleCloseResultModal } = useTeamOperations();
  const [selectedTeam, setSelectedTeam] = useState<{id: number, name: string, roster: string[], captainId: string, leagueName: string} | null>(null);
  const [leavingTeam, setLeavingTeam] = useState<number | null>(null);
  const [welcomeTeams, setWelcomeTeams] = useState<string[]>([]);
  const [leaveConfirmation, setLeaveConfirmation] = useState<{isOpen: boolean, type: 'team' | 'individual', id: number, name: string} | null>(null);
  const [leaveResultModal, setLeaveResultModal] = useState<{isOpen: boolean, type: 'success' | 'error', title: string, message: string}>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });
  
  const [missingSkillRegistrations, setMissingSkillRegistrations] = useState<Array<{
    paymentId: number;
    leagueName: string;
    isTeam: boolean;
    teamId?: number;
  }>>([]);

  // Check for teams added during signup
  useEffect(() => {
    const teamsAdded = sessionStorage.getItem('signup_teams_added');
    if (teamsAdded) {
      try {
        const teams = JSON.parse(teamsAdded);
        setWelcomeTeams(teams);
        // Clear the flag after showing
        setTimeout(() => {
          sessionStorage.removeItem('signup_teams_added');
          setWelcomeTeams([]);
        }, 10000); // Show for 10 seconds
      } catch (error) {
        console.error('Error parsing signup teams:', error);
      }
    }
  }, []);
  
  // Check if we need to refresh data after a registration (separate effect to run on every render)
  useEffect(() => {
    const registrationCompleted = sessionStorage.getItem('registration_completed');
    if (registrationCompleted) {
      sessionStorage.removeItem('registration_completed');
      // Refresh all data to show the new registration
      Promise.all([
        refetchTeams(),
        refetchIndividualLeagues(),
        refetchLeaguePayments(),
        refreshUserProfile()
      ]);
    }
  }); // No dependency array - run on every render to catch navigation

  // Check for missing skill levels
  useEffect(() => {
    if (loading) return;
    
    const missing: Array<{
      paymentId: number;
      leagueName: string;
      isTeam: boolean;
      teamId?: number;
    }> = [];
    
    // Check team registrations
    teams.forEach(team => {
      if (!team.skill || !team.skill.id) {
        const payment = leaguePayments.find(p => p.team_id === team.id);
        if (payment) {
          missing.push({
            paymentId: payment.id,
            leagueName: team.name,
            isTeam: true,
            teamId: team.id,
          });
        }
      }
    });
    
    // Check individual registrations
    leaguePayments.forEach(payment => {
      if (!payment.team_id && !payment.skill_level_id) {
        const league = individualLeagues.find(l => l.id === payment.league_id);
        if (league) {
          missing.push({
            paymentId: payment.id,
            leagueName: league.name,
            isTeam: false,
          });
        }
      }
    });
    
    setMissingSkillRegistrations(missing);
  }, [teams, leaguePayments, individualLeagues, loading]);

  const onUnregisterSuccess = async (paymentId: number) => {
    // Remove the payment from the local state immediately for instant UI feedback
    setLeaguePayments(prev => prev.filter(p => p.id !== paymentId));
    
    // Refresh all relevant data
    await Promise.all([
      refetchTeams(),  // For team registrations
      refetchIndividualLeagues(),  // For individual registrations
      refetchLeaguePayments(),  // To ensure payment data is in sync
      refreshUserProfile()  // To update user profile state
    ]);
    
    // Close any open teammate management modal since the team no longer exists
    setSelectedTeam(null);
  };

  const onUnregister = (paymentId: number, leagueName: string) => {
    handleUnregister(paymentId, leagueName, onUnregisterSuccess);
  };

  const handleLeaveIndividualLeague = (leagueId: number, leagueName: string) => {
    if (!userProfile?.id || !user) return;
    setLeaveConfirmation({ isOpen: true, type: 'individual', id: leagueId, name: leagueName });
  };

  const handleConfirmLeaveIndividual = async () => {
    if (!leaveConfirmation || !userProfile?.id || !user) return;
    const { id: leagueId, name: leagueName } = leaveConfirmation;

    setLeaveConfirmation(null);

    try {
      // First, fetch payment details before deletion for notification
      type PaymentWithSkills = {
        amount_due: number | null;
        amount_paid: number | null;
        status: string | null;
        is_waitlisted: boolean | null;
        skills?: Array<{ id: number | null; name: string | null }> | { id: number | null; name: string | null } | null;
      };

      const { data: paymentData, error: paymentFetchError } = await supabase
        .from('league_payments')
        .select(`
          id,
          amount_due,
          amount_paid,
          status,
          is_waitlisted,
          skill_level_id,
          skills:skill_level_id (id, name)
        `)
        .eq('user_id', userProfile.id)
        .eq('league_id', leagueId)
        .is('team_id', null)
        .maybeSingle<PaymentWithSkills>();

      if (paymentFetchError) {
        console.error('Error fetching payment details:', paymentFetchError);
      }

      // Fetch user details for notification
      const { data: userDetails, error: userFetchError } = await supabase
        .from('user_details')
        .select('name, email, phone')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (userFetchError) {
        console.error('Error fetching user details:', userFetchError);
      }

      // Check if user is in league_ids (active) or just in league_payments (waitlisted)
      const currentLeagueIds = userProfile.league_ids || [];
      const isInLeagueIds = currentLeagueIds.includes(leagueId);

      // Only update league_ids if the user is currently in it (active registration)
      if (isInLeagueIds) {
        const updatedLeagueIds = currentLeagueIds.filter(id => id !== leagueId);

        const { error } = await supabase
          .from('users')
          .update({ league_ids: updatedLeagueIds })
          .eq('id', userProfile.id);

        if (error) throw error;
      }

      // Delete any payment records for this individual registration (both active and waitlisted)
      await supabase
        .from('league_payments')
        .delete()
        .eq('user_id', userProfile.id)
        .eq('league_id', leagueId)
        .is('team_id', null);

      // Send cancellation notification
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error('No active session found for cancellation notification');
        } else {
          // Extract skill level name if available
          let skillLevelName: string | null = null;
          const rawSkills = paymentData?.skills;
          if (Array.isArray(rawSkills)) {
            const firstSkill = rawSkills.find((skill): skill is { id: number | null; name: string | null } => Boolean(skill && typeof skill.name === 'string'));
            skillLevelName = firstSkill?.name ?? null;
          } else if (rawSkills && typeof rawSkills === 'object' && 'name' in rawSkills) {
            const maybeSkill = rawSkills as { name: unknown };
            skillLevelName = typeof maybeSkill.name === 'string' ? maybeSkill.name : null;
          }

          const notificationResponse = await supabase.functions.invoke(
            'send-cancellation-notification',
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: {
                userId: userProfile.id,
                userName: userDetails?.name || userProfile.name || 'Unknown',
                userEmail: userDetails?.email || userProfile.email || '',
                userPhone: userDetails?.phone || '',
                leagueName: leagueName,
                isTeamRegistration: false,
                isWaitlisted: paymentData?.is_waitlisted ?? undefined,
                skillLevelName: skillLevelName ?? undefined,
                amountDue: paymentData?.amount_due ?? null,
                amountPaid: paymentData?.amount_paid ?? null,
                paymentStatus: paymentData?.status ?? null,
                cancelledAt: new Date().toISOString(),
              },
            },
          );

          if (notificationResponse.error) {
            console.error('Failed to send cancellation notification:', notificationResponse.error);
            // Don't throw - notification failure shouldn't block cancellation
          }
        }
      } catch (notificationError) {
        console.error('Exception while sending cancellation notification:', notificationError);
        // Don't throw - notification failure shouldn't block cancellation
      }

      // Refresh all relevant data
      await Promise.all([
        refetchIndividualLeagues(),
        refetchLeaguePayments(),
        refreshUserProfile()  // This will update the user profile with new league_ids
      ]);

      setLeaveResultModal({
        isOpen: true,
        type: 'success',
        title: 'Registration Cancelled',
        message: `Successfully cancelled registration for ${leagueName}.`,
      });

    } catch (error) {
      console.error('Error leaving individual league:', error);
      setLeaveResultModal({
        isOpen: true,
        type: 'error',
        title: 'Cancellation Failed',
        message: `Failed to cancel registration: ${(error as Error).message}`,
      });
    }
  };

  const handleLeaveTeam = (teamId: number, teamName: string) => {
    if (!userProfile?.id || !user) return;
    setLeaveConfirmation({ isOpen: true, type: 'team', id: teamId, name: teamName });
  };

  const handleConfirmLeaveTeam = async () => {
    if (!leaveConfirmation || !userProfile?.id || !user) return;
    const { id: teamId, name: teamName } = leaveConfirmation;
    
    setLeaveConfirmation(null);
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
        
        setLeaveResultModal({
          isOpen: true,
          type: 'success',
          title: 'Left Team',
          message: `Successfully left team ${teamName}.`,
        });
        
      } catch (error) {
        console.error('Error leaving team:', error);
        setLeaveResultModal({
          isOpen: true,
          type: 'error',
          title: 'Failed to Leave Team',
          message: `Failed to leave team: ${(error as Error).message}`,
        });
    } finally {
      setLeavingTeam(null);
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
      {/* Show welcome message if user was auto-added to teams */}
      {welcomeTeams.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Welcome to OFSL!</h3>
                <p className="text-gray-700">
                  You&apos;ve been automatically added to the following team{welcomeTeams.length > 1 ? 's' : ''}:
                </p>
                <ul className="mt-2 space-y-1">
                  {welcomeTeams.map((team, index) => (
                    <li key={index} className="text-gray-700 font-medium">• {team}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Show pending invites at the top */}
      <PendingInvites onInviteAccepted={refetchTeams} />
      
        <TeamsSection
          teams={teams}
          individualLeagues={individualLeagues}
          currentUserId={userProfile?.id}
          leaguePayments={leaguePayments}
          teamPaymentsByTeamId={teamPaymentsByTeamId}
          unregisteringPayment={unregisteringPayment}
          leavingTeam={leavingTeam}
          onUnregister={onUnregister}
          onLeaveTeam={handleLeaveTeam}
          onManageTeammates={handleManageTeammates}
        onLeaveIndividualLeague={handleLeaveIndividualLeague}
        onSkillLevelUpdate={() => {
          // Refresh both teams and payments to get updated skill levels
          refetchTeams();
          refetchLeaguePayments();
        }}
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
      
      {/* Confirmation Modal for Cancellation */}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmCancellation}
        title={`Cancel ${confirmationState.isIndividual ? 'Individual' : 'Team'} Registration`}
        message={
          confirmationState.isIndividual ? (
            <>
              Are you sure you want to cancel your individual registration for <strong>{confirmationState.leagueName}</strong>?
              {'\n\n'}
              This will delete your payment record.
              {'\n\n'}
              This action cannot be undone.
            </>
          ) : (
            <>
              Are you sure you want to delete your team registration for <strong>{confirmationState.leagueName}</strong>?
              {'\n\n'}
              This will:
              {'\n'}• Delete your team
              {'\n'}• Remove all teammates from the team
              {'\n'}• Delete all payment records
              {'\n\n'}
              This action cannot be undone.
            </>
          )
        }
        confirmText="Yes, Cancel Registration"
        cancelText="Keep Registration"
        variant="danger"
        isLoading={unregisteringPayment === confirmationState.paymentId}
      />
      
      {/* Confirmation Modal for Leaving Team/Individual League */}
      {leaveConfirmation && (
        <ConfirmationModal
          isOpen={leaveConfirmation.isOpen}
          onClose={() => setLeaveConfirmation(null)}
          onConfirm={leaveConfirmation.type === 'team' ? handleConfirmLeaveTeam : handleConfirmLeaveIndividual}
          title={leaveConfirmation.type === 'team' ? 'Leave Team' : 'Cancel Individual Registration'}
          message={
            leaveConfirmation.type === 'team' ? (
              <>
                Are you sure you want to leave the team <strong>{leaveConfirmation.name}</strong>?
                {'\n\n'}
                You will be removed from the team roster.
                {'\n\n'}
                This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to cancel your registration for <strong>{leaveConfirmation.name}</strong>?
                {'\n\n'}
                This action cannot be undone.
              </>
            )
          }
          confirmText={leaveConfirmation.type === 'team' ? 'Yes, Leave Team' : 'Yes, Cancel Registration'}
          cancelText="Keep Registration"
          variant="warning"
          isLoading={leavingTeam === leaveConfirmation.id}
        />
      )}
      
      {/* Result Modal for Cancel Registration */}
      <ResultModal
        isOpen={resultState.isOpen}
        onClose={handleCloseResultModal}
        type={resultState.type as 'success' | 'error' | 'warning'}
        title={resultState.title}
        message={resultState.message}
      />
      
      {/* Result Modal for Leave Team/Individual */}
      <ResultModal
        isOpen={leaveResultModal.isOpen}
        onClose={() => setLeaveResultModal({ ...leaveResultModal, isOpen: false })}
        type={leaveResultModal.type as 'success' | 'error' | 'warning'}
        title={leaveResultModal.title}
        message={leaveResultModal.message}
      />
      
      {/* Missing Skill Level Prompt */}
      <MissingSkillLevelPrompt
        missingSkillRegistrations={missingSkillRegistrations}
        onComplete={() => {
          // Refresh data to show updated skill levels
          refetchTeams();
          refetchLeaguePayments();
        }}
      />
    </div>
  );
}
