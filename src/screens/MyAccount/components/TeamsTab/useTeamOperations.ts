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

    // Store the payment info and show confirmation modal
    setConfirmationState({
      isOpen: true,
      paymentId,
      leagueName,
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
        // Get payment details for league_id
        const { data: payment } = await supabase
          .from('league_payments')
          .select('league_id, user_id')
          .eq('id', paymentId)
          .single();

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
        // Get the session to authenticate with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No authentication session found');
        }

        // Call the Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/delete-registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            paymentId: paymentId,
            leagueName: leagueName
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete registration');
        }

        // Show success message with details
        if (result.warnings && result.warnings.length > 0) {
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