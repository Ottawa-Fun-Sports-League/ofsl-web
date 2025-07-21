import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getUserLeaguePayments } from '../../../../lib/payments';
import { LeaguePayment, Team } from './types';

export function useTeamsData(userId?: string) {
  const [leaguePayments, setLeaguePayments] = useState<LeaguePayment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchLeaguePayments = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('league_payments')
        .select(`
          id,
          user_id,
          team_id,
          league_id,
          amount_due,
          amount_paid,
          status,
          due_date,
          payment_method,
          notes,
          created_at,
          updated_at,
          league:leagues!inner(name, location, cost),
          team:teams(name)
        `)
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = data?.map(payment => {
        // Calculate amount paid from payment history if available
        let calculatedAmountPaid = payment.amount_paid;
        
        if (payment.notes) {
          try {
            const paymentHistory = JSON.parse(payment.notes);
            if (Array.isArray(paymentHistory)) {
              calculatedAmountPaid = paymentHistory.reduce((total, entry) => {
                const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount.toString()) || 0;
                return total + amount;
              }, 0);
            }
          } catch (error) {
            // If JSON parsing fails, use the database amount_paid value
            calculatedAmountPaid = payment.amount_paid;
          }
        }
        
        
        return {
          user_id: payment.user_id,
          league_name: payment.league?.name || '',
          team_name: payment.team?.name || `Unknown Team (ID: ${payment.team_id})`,
          amount_due: payment.amount_due,
          amount_paid: calculatedAmountPaid,
          league_cost: payment.league?.cost || null,
          amount_outstanding: payment.amount_due - calculatedAmountPaid,
          status: payment.status,
          due_date: payment.due_date,
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          id: payment.id
        };
      }) || [];
      
      setLeaguePayments(transformedData);
    } catch (error) {
      console.error('Error fetching league payments:', error);
    }
  };

  const fetchTeams = async () => {
    if (!userId) return [];

    try {
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          league:leagues(id, name, location, cost)
        `)
        .contains('roster', [userId])
        .order('created_at', { ascending: true });

      if (error) throw error;
      const teamsData = (data || []).map(team => ({
        ...team,
        roster: team.roster || [] // Ensure roster is always an array
      }));
      
      // Debug: show the roster for each team to verify user is not in it
      teamsData.forEach(team => {
      });
      setTeams(teamsData);
      return teamsData;
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchLeaguePaymentsSimple(), fetchTeams()]);
  };

  const fetchLeaguePaymentsSimple = async () => {
    if (!userId) return;

    try {
      const payments = await getUserLeaguePayments();
      
      // Transform to match our local interface
      const transformedData = payments.map(payment => ({
        id: payment.id,
        league_name: payment.league_name,
        team_name: payment.team_name || '',
        amount_due: payment.amount_due,
        amount_paid: payment.amount_paid,
        league_cost: payment.amount_due, // Use amount_due as league cost for now
        status: payment.status,
        due_date: payment.due_date || '',
        payment_method: payment.payment_method
      }));
      
      setLeaguePayments(transformedData);
    } catch (error) {
      console.error('Error fetching league payments:', error);
    }
  };

  const refetchLeaguePayments = () => {
    fetchLeaguePaymentsSimple();
  };

  const updateTeamRoster = (teamId: number, newRoster: string[]) => {
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === teamId 
          ? { ...team, roster: newRoster }
          : team
      )
    );
  };

  const updateTeamCaptain = (teamId: number, newCaptainId: string) => {
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === teamId 
          ? { ...team, captain_id: newCaptainId }
          : team
      )
    );
  };

  return {
    leaguePayments,
    teams,
    loading,
    setLeaguePayments,
    setTeams,
    refetchLeaguePayments,
    refetchTeams: fetchTeams,
    updateTeamRoster,
    updateTeamCaptain
  };
}