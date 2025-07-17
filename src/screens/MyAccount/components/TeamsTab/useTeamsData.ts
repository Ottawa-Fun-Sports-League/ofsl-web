import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
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
          *,
          league:leagues(name, location),
          team:teams(name)
        `)
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = data?.map(payment => ({
        user_id: payment.user_id,
        league_name: payment.league?.name || '',
        team_name: payment.team?.name || '',
        amount_due: payment.amount_due,
        amount_paid: payment.amount_paid,
        amount_outstanding: payment.amount_due - payment.amount_paid,
        status: payment.status,
        due_date: payment.due_date,
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        id: payment.id
      })) || [];
      
      setLeaguePayments(transformedData);
    } catch (error) {
      console.error('Error fetching league payments:', error);
    }
  };

  const fetchTeams = async () => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          league:leagues(name, location)
        `)
        .contains('roster', [userId])
        .order('created_at', { ascending: true });

      if (error) throw error;
      const teamsData = data || [];
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
    await Promise.all([fetchLeaguePayments(), fetchTeams()]);
  };

  const refetchLeaguePayments = () => {
    fetchLeaguePayments();
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

  return {
    leaguePayments,
    teams,
    loading,
    setLeaguePayments,
    refetchLeaguePayments,
    refetchTeams: fetchTeams,
    updateTeamRoster
  };
}