import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { LeaguePayment } from './types';

export function useTeamOperations() {
  const [unregisteringPayment, setUnregisteringPayment] = useState<number | null>(null);

  const handleUnregister = async (
    paymentId: number, 
    leagueName: string,
    onSuccess: (paymentId: number) => void
  ) => {
    if (!confirm(`Are you sure you want to delete your registration for ${leagueName}?\n\nThis will:\n- Delete your team\n- Remove all teammates from the team\n- Delete all payment records\n\nThis action cannot be undone.`)) {
      return;
    }

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
      alert(`Failed to delete registration: ${error.message || 'Please try again.'}`);
    } finally {
      setUnregisteringPayment(null);
    }
  };

  return {
    unregisteringPayment,
    handleUnregister
  };
}