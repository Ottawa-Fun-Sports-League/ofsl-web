import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';

interface ConfirmationState {
  isOpen: boolean;
  paymentId: number | null;
  leagueName: string;
  isIndividual: boolean;
  onSuccess: ((paymentId: number) => void) | null;
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
      alert('Failed to fetch payment details');
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

        alert(`Individual registration for ${leagueName} cancelled successfully.`);
        onSuccess(paymentId);
      } catch (error) {
        console.error('Error cancelling individual registration:', error);
        alert(`Failed to cancel registration: ${(error as Error).message || 'Please try again.'}`);
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
        const response = await fetch('https://api.ofsl.ca/functions/v1/delete-registration', {
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
          alert(`Registration deleted successfully with warnings:\n${result.warnings.join('\n')}`);
        } else {
          alert(`Registration for ${leagueName} deleted successfully.\nTeam and ${result.membersProcessed} team members were processed.`);
        }

        onSuccess(paymentId);
      } catch (error) {
        console.error('Error unregistering:', error);
        alert(`Failed to delete registration: ${(error as Error).message || 'Please try again.'}`);
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

  return {
    unregisteringPayment,
    handleUnregister,
    confirmationState,
    handleConfirmCancellation,
    handleCloseModal
  };
}