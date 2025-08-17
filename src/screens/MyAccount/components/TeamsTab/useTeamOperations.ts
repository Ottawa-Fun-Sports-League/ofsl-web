import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';

export function useTeamOperations() {
  const [unregisteringPayment, setUnregisteringPayment] = useState<number | null>(null);

  const handleUnregister = async (
    paymentId: number, 
    leagueName: string,
    onSuccess: (paymentId: number) => void
  ) => {
    setUnregisteringPayment(paymentId);
    try {
      // First, get the payment details to determine if this is a team or individual registration
      const { data: payment, error: paymentError } = await supabase
        .from('league_payments')
        .select('*, teams(*), leagues(*)')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment record not found');
      }

      const isIndividualRegistration = !payment.team_id;
      
      // Customize confirmation message based on registration type
      const confirmMessage = isIndividualRegistration 
        ? `Are you sure you want to cancel your individual registration for ${leagueName}?\n\nThis will:\n- Remove you from the league\n- Delete your payment record\n\nThis action cannot be undone.`
        : `Are you sure you want to delete your team registration for ${leagueName}?\n\nThis will:\n- Delete your team\n- Remove all teammates from the team\n- Delete all payment records\n\nThis action cannot be undone.`;

      if (!confirm(confirmMessage)) {
        setUnregisteringPayment(null);
        return;
      }

      if (isIndividualRegistration) {
        // Handle individual registration cancellation
        // 1. Delete the payment record
        const { error: deletePaymentError } = await supabase
          .from('league_payments')
          .delete()
          .eq('id', paymentId);

        if (deletePaymentError) throw deletePaymentError;

        // 2. Remove league from user's league_ids
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('league_ids')
          .eq('id', payment.user_id)
          .single();

        if (!userError && user && user.league_ids) {
          const updatedLeagueIds = user.league_ids.filter((id: number) => id !== payment.league_id);
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ league_ids: updatedLeagueIds })
            .eq('id', payment.user_id);

          if (updateError) {
            console.error('Error updating user league_ids:', updateError);
          }
        }

        alert(`Your individual registration for ${leagueName} has been cancelled successfully.`);
      } else {
        // Handle team registration - use existing edge function
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No authentication session found');
        }

        // Call the Edge Function for team deletion
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
          throw new Error(result.error || 'Failed to delete team registration');
        }

        // Show success message with details
        if (result.warnings && result.warnings.length > 0) {
          alert(`Team registration deleted successfully with warnings:\n${result.warnings.join('\n')}`);
        } else {
          alert(`Team registration for ${leagueName} deleted successfully.\nTeam and ${result.membersProcessed} team members were processed.`);
        }
      }

      onSuccess(paymentId);
    } catch (error) {
      console.error('Error unregistering:', error);
      alert(`Failed to cancel registration: ${(error as Error).message || 'Please try again.'}`);
    } finally {
      setUnregisteringPayment(null);
    }
  };

  return {
    unregisteringPayment,
    handleUnregister
  };
}