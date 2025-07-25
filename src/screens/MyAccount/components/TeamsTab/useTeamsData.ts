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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Removed unused fetchLeaguePayments function - using fetchLeaguePaymentsSimple instead

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
      teamsData.forEach(_team => {
        // Debug logging removed
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
      const payments = await getUserLeaguePayments(userId);
      
      // Transform to match our local interface
      const transformedData = payments.map(payment => ({
        id: payment.id,
        team_id: payment.team_id,
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