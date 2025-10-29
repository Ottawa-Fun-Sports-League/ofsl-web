import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';

interface ConfirmationState {
  isOpen: boolean;
  paymentId: number | null;
  leagueName: string;
  isIndividual: boolean;
  onSuccess: ((paymentId: number) => void) | null;
}

interface ResultState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

interface IndividualPaymentDetails {
  league_id: number;
  user_id: string;
  amount_due: number | null;
  amount_paid: number | null;
  status: string | null;
  is_waitlisted: boolean | null;
  skill_level_id: number | null;
  skills?: { id: number; name: string | null } | Array<{ id: number; name: string | null }> | null;
}

export function useTeamOperations() {
  const [unregisteringPayment, setUnregisteringPayment] = useState<number | null>(null);
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    isOpen: false,
    paymentId: null,
    leagueName: '',
    isIndividual: false,
    onSuccess: null,
  });
  const [resultState, setResultState] = useState<ResultState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleUnregister = async (
    paymentId: number, 
    leagueName: string,
    onSuccess: (paymentId: number) => void
  ) => {
    // First check if this is an individual or team registration
    const { data: payment, error: fetchError } = await supabase
      .from('league_payments')
      .select('team_id, league_id, user_id')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      setResultState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch payment details. Please try again.',
      });
      return;
    }

    const isIndividualRegistration = !payment.team_id;

    let resolvedLeagueName = leagueName;
    if (!resolvedLeagueName || resolvedLeagueName.trim().length === 0) {
      if (payment.league_id) {
        try {
          const { data: leagueRecord } = await supabase
            .from('leagues')
            .select('name')
            .eq('id', payment.league_id)
            .maybeSingle();

          if (leagueRecord?.name) {
            resolvedLeagueName = leagueRecord.name;
          }
        } catch (lookupError) {
          console.warn('Unable to resolve league name for unregister flow:', lookupError);
        }
      }
    }

    if (!resolvedLeagueName || resolvedLeagueName.trim().length === 0) {
      resolvedLeagueName = 'Unknown League';
    }

    // Store the payment info and show confirmation modal
    setConfirmationState({
      isOpen: true,
      paymentId,
      leagueName: resolvedLeagueName,
      isIndividual: isIndividualRegistration,
      onSuccess,
    });
  };

  const handleConfirmCancellation = async () => {
    const { paymentId, leagueName, isIndividual, onSuccess } = confirmationState;
    
    if (!paymentId || !onSuccess) return;

    // Close the modal
    setConfirmationState(prev => ({ ...prev, isOpen: false }));

    if (isIndividual) {
      // Individual registration cancellation

      setUnregisteringPayment(paymentId);
      try {
        // Get payment details for league_id and user info
        const { data: payment } = await supabase
          .from('league_payments')
          .select(`
            league_id,
            user_id,
            amount_due,
            amount_paid,
            status,
            is_waitlisted,
            skill_level_id,
            skills:skill_level_id (id, name)
          `)
          .eq('id', paymentId)
          .single<IndividualPaymentDetails>();
        
        let skillLevelName: string | null = null;
        if (payment?.skills) {
          if (Array.isArray(payment.skills)) {
            skillLevelName = payment.skills[0]?.name ?? null;
          } else {
            skillLevelName = payment.skills.name ?? null;
          }
        }
        
        // Get user details for the notification
        let userDetails = null;
        if (payment) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .eq('id', payment.user_id)
            .single();
          userDetails = userData;
        }

        // Delete the payment record
        const { error: deletePaymentError } = await supabase
          .from('league_payments')
          .delete()
          .eq('id', paymentId);

        if (deletePaymentError) throw deletePaymentError;

        // Remove league from user's league_ids
        if (payment) {
          const { data: userData, error: userFetchError } = await supabase
            .from('users')
            .select('league_ids')
            .eq('id', payment.user_id)
            .single();

          if (!userFetchError && userData && userData.league_ids) {
            const updatedLeagueIds = userData.league_ids.filter((id: number) => id !== payment.league_id);
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ league_ids: updatedLeagueIds })
              .eq('id', payment.user_id);

            if (updateError) {
              console.error('Error updating user league_ids:', updateError);
            }
          }
        }

        // Send cancellation notification
        if (userDetails) {
          try {
            const notificationResponse = await supabase.functions.invoke(
              "send-cancellation-notification",
              {
                body: {
                  userId: userDetails.id,
                  userName: userDetails.name || "Unknown",
                  userEmail: userDetails.email || "Unknown",
                  userPhone: userDetails.phone,
                  leagueName: leagueName,
                  isTeamRegistration: false,
                  isWaitlisted: payment?.is_waitlisted ?? undefined,
                  skillLevelName: skillLevelName ?? undefined,
                  amountDue: payment?.amount_due ?? null,
                  amountPaid: payment?.amount_paid ?? null,
                  paymentStatus: payment?.status ?? null,
                  cancelledAt: new Date().toISOString(),
                },
              },
            );
            
            if (notificationResponse.error) {
              console.error("Failed to send cancellation notification:", notificationResponse.error);
              // Don't throw - notification failure shouldn't block cancellation
            }
          } catch (notificationError) {
            console.error("Error sending cancellation notification:", notificationError);
            // Don't throw - notification failure shouldn't block cancellation
          }
        }

        setResultState({
          isOpen: true,
          type: 'success',
          title: 'Registration Cancelled',
          message: `Your individual registration for ${leagueName} has been cancelled successfully.`,
        });
        onSuccess(paymentId);
      } catch (error) {
        console.error('Error cancelling individual registration:', error);
        setResultState({
          isOpen: true,
          type: 'error',
          title: 'Cancellation Failed',
          message: `Failed to cancel registration: ${(error as Error).message || 'Please try again.'}`,
        });
      } finally {
        setUnregisteringPayment(null);
      }
    } else {
      // Team registration cancellation

      setUnregisteringPayment(paymentId);
      try {
        // Call the Edge Function
        console.debug("[TeamsTab] Invoking delete-registration function", {
          paymentId,
          leagueName,
        });
        const { data: deleteResult, error: deleteError } = await supabase.functions.invoke(
          "delete-registration",
          {
            body: {
              paymentId: Number(paymentId),
              leagueName,
            },
          },
        );

        if (deleteError) {
          console.error("delete-registration function error", deleteError);
          throw new Error(deleteError.message || 'Failed to delete registration');
        }

        const result = deleteResult ?? {};

        // Show success message with details
        if (Array.isArray(result.warnings) && result.warnings.length > 0) {
          setResultState({
            isOpen: true,
            type: 'warning',
            title: 'Registration Deleted',
            message: `Registration deleted successfully with warnings:\n${result.warnings.join('\n')}`,
          });
        } else {
          setResultState({
            isOpen: true,
            type: 'success',
            title: 'Team Registration Deleted',
            message: `Registration for ${leagueName} deleted successfully.\nTeam and ${result.membersProcessed} team members were processed.`,
          });
        }

        onSuccess(paymentId);
      } catch (error) {
        console.error('Error unregistering:', error);
        setResultState({
          isOpen: true,
          type: 'error',
          title: 'Deletion Failed',
          message: `Failed to delete registration: ${(error as Error).message || 'Please try again.'}`,
        });
      } finally {
        setUnregisteringPayment(null);
      }
    }
  };

  const handleCloseModal = () => {
    setConfirmationState({
      isOpen: false,
      paymentId: null,
      leagueName: '',
      isIndividual: false,
      onSuccess: null,
    });
  };

  const handleCloseResultModal = () => {
    setResultState({
      isOpen: false,
      type: 'success',
      title: '',
      message: '',
    });
  };

  return {
    unregisteringPayment,
    handleUnregister,
    confirmationState,
    handleConfirmCancellation,
    handleCloseModal,
    resultState,
    handleCloseResultModal
  };
}
