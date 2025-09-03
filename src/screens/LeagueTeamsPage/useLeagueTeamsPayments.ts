import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/toast';
import { PaymentInfo, PaymentHistoryEntry } from '../../components/payments';

export function useLeagueTeamsPayments(teamId: number | null) {
  const { showToast } = useToast();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      loadPaymentInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadPaymentInfo = async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      
      // Get team data to find league_id
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('league_id')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      if (!teamData) throw new Error('Team not found');

      const { data: paymentData, error: paymentError } = await supabase
        .from('league_payments')
        .select('*')
        .eq('team_id', teamId)
        .eq('league_id', teamData.league_id)
        .maybeSingle();

      if (paymentError && paymentError.code !== 'PGRST116') {
        console.error('Error loading payment information:', paymentError);
        return;
      }
      
      if (paymentData) {
        setPaymentInfo(paymentData);
        parsePaymentHistory(paymentData.notes, paymentData);
      } else {
        // Create payment record if it doesn't exist
        await createPaymentRecord(teamId, teamData.league_id);
      }
    } catch (error) {
      console.error('Error in loadPaymentInfo:', error);
      showToast('Failed to load payment information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createPaymentRecord = async (teamId: number, leagueId: number) => {
    try {
      // Get league cost for default amount_due (consider early-bird if active)
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('cost, early_bird_cost, early_bird_due_date')
        .eq('id', leagueId)
        .single();

      if (leagueError) throw leagueError;

      // Compute effective amount due
      const today = new Date();
      const earlyDeadline = leagueData?.early_bird_due_date ? new Date(leagueData.early_bird_due_date + 'T23:59:59') : null;
      const earlyActive = !!(leagueData?.early_bird_cost && earlyDeadline && today.getTime() <= earlyDeadline.getTime());
      const effectiveAmountDue = earlyActive ? (leagueData?.early_bird_cost || leagueData?.cost || 0) : (leagueData?.cost || 0);

      const { data: newPayment, error: createError } = await supabase
        .from('league_payments')
        .insert({
          team_id: teamId,
          league_id: leagueId,
          amount_due: effectiveAmountDue,
          amount_paid: 0,
          status: 'pending',
          payment_method: null,
          notes: null,
          due_date: null
        })
        .select()
        .single();

      if (createError) throw createError;
      
      if (newPayment) {
        setPaymentInfo(newPayment);
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error creating payment record:', error);
    }
  };

  const parsePaymentHistory = (notes: string | null, paymentData: PaymentInfo) => {
    if (!notes) {
      setPaymentHistory([]); 
      return;
    }
    
    try {
      try {
        const parsedHistory = JSON.parse(notes); 
        if (Array.isArray(parsedHistory)) {
          setPaymentHistory(parsedHistory);
          return;
        }
      } catch (e) {
        // Not JSON, continue with legacy parsing
      }
      
      // Legacy parsing from plain text notes
      const history: PaymentHistoryEntry[] = [];
      const notesLines = notes.split('\n').filter(line => line.trim() !== '');
      
      notesLines.forEach((note, index) => {
        const amountMatch = note.match(/\$(\d+(\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      
        let method: string | null = null;
        if (note.toLowerCase().includes('e-transfer') || note.toLowerCase().includes('etransfer') || note.toLowerCase().includes('e_transfer')) {
          method = 'e_transfer';
        } else if (note.toLowerCase().includes('cash')) {
          method = 'cash';
        } else if (note.toLowerCase().includes('online')) {
          method = 'stripe';
        }
      
        const dateMatch = note.match(/(\d{1,2})[-/](\d{1,2})/);
        let date = new Date().toISOString();
        if (dateMatch) {
          const month = parseInt(dateMatch[1]) - 1;
          const day = parseInt(dateMatch[2]);
          const year = new Date().getFullYear();
          date = new Date(year, month, day).toISOString();
        }
      
        history.push({
          id: index + 1,
          amount,
          payment_id: paymentData.id,
          payment_method: method || 'unknown',
          date,
          notes: note.trim()
        });
      });
    
      setPaymentHistory(history);
      
      if (history.length > 0) {
        updatePaymentHistoryInDatabase(history, paymentData.id);
      }
    } catch (error) {
      console.error('Error parsing payment history:', error);
      setPaymentHistory([]);
    }
  };

  const updatePaymentHistoryInDatabase = async (history: PaymentHistoryEntry[], paymentId: number) => {
    try {
      const totalAmount = history.reduce((sum, entry) => sum + entry.amount, 0);
      
      const { error } = await supabase
        .from('league_payments')
        .update({ 
          notes: JSON.stringify(history),
          amount_paid: totalAmount
        })
        .eq('id', paymentId);

      if (error) {
        console.error('Error updating payment history in database:', error);
      }
    } catch (error) {
      console.error('Error in updatePaymentHistoryInDatabase:', error);
    }
  };

  const refreshPaymentInfo = () => {
    if (teamId) {
      loadPaymentInfo();
    }
  };

  return {
    paymentInfo,
    paymentHistory,
    loading,
    setPaymentInfo,
    setPaymentHistory,
    refreshPaymentInfo
  };
}
