import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getUserLeaguePayments } from '../../../../lib/payments';
import { LeaguePayment, Team } from './types';

interface IndividualLeague {
  id: number;
  name: string;
  location?: string;
  cost?: number;
  sport_id?: number;
  sports?: {
    name: string;
  };
  start_date?: string;
  gym_ids?: number[];
  gyms?: Array<{
    id?: number;
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>;
  created_at?: string;
}

export function useTeamsData(userId?: string) {
  const [leaguePayments, setLeaguePayments] = useState<LeaguePayment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [individualLeagues, setIndividualLeagues] = useState<IndividualLeague[]>([]);
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
          league:leagues(id, name, location, cost, start_date, gym_ids)
        `)
        .contains('roster', [userId])
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Collect all gym IDs from team leagues
      const allGymIds = new Set<number>();
      (data || []).forEach(team => {
        if (team.league?.gym_ids) {
          team.league.gym_ids.forEach((id: number) => allGymIds.add(id));
        }
      });
      
      // Fetch gyms if there are gym_ids
      let gymsMap = new Map();
      if (allGymIds.size > 0) {
        const { data: gymsData } = await supabase
          .from('gyms')
          .select('*')
          .in('id', Array.from(allGymIds));
        
        if (gymsData) {
          gymsMap = new Map(gymsData.map(gym => [gym.id, gym]));
        }
      }
      
      // Add gyms to each team's league
      const teamsData = (data || []).map(team => {
        let leagueWithGyms = team.league;
        if (team.league?.gym_ids) {
          const leagueGyms = team.league.gym_ids
            .map((gymId: number) => gymsMap.get(gymId))
            .filter((gym: unknown) => gym !== undefined);
          leagueWithGyms = { ...team.league, gyms: leagueGyms };
        }
        
        return {
          ...team,
          roster: team.roster || [], // Ensure roster is always an array
          league: leagueWithGyms
        };
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

  const fetchIndividualLeagues = async () => {
    if (!userId) {
      setIndividualLeagues([]);
      return [];
    }

    try {
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First, fetch the latest user profile to get current league_ids
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('league_ids')
        .eq('id', userId)
        .single();
      
      if (profileError || !profileData?.league_ids || profileData.league_ids.length === 0) {
        setIndividualLeagues([]);
        return [];
      }
      
      // Fetch the leagues the user is individually registered for
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          location,
          cost,
          sport_id,
          start_date,
          gym_ids
        `)
        .in('id', profileData.league_ids)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const leaguesData = data || [];
      
      // Fetch gyms if there are gym_ids
      const allGymIds = new Set<number>();
      leaguesData.forEach(league => {
        if (league.gym_ids) {
          league.gym_ids.forEach((id: number) => allGymIds.add(id));
        }
      });
      
      let gymsMap = new Map();
      if (allGymIds.size > 0) {
        const { data: gymsData } = await supabase
          .from('gyms')
          .select('*')
          .in('id', Array.from(allGymIds));
        
        if (gymsData) {
          gymsMap = new Map(gymsData.map(gym => [gym.id, gym]));
        }
      }
      
      // Add gyms to each league
      const leaguesWithGyms: IndividualLeague[] = leaguesData.map(league => {
        const leagueGyms = (league.gym_ids || [])
          .map((gymId: number) => gymsMap.get(gymId))
          .filter((gym: unknown) => gym !== undefined);
        
        return {
          ...league,
          gyms: leagueGyms
        };
      });
      
      setIndividualLeagues(leaguesWithGyms);
      return leaguesWithGyms;
    } catch (error) {
      console.error('Error fetching individual leagues:', error);
      return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchLeaguePaymentsSimple(), fetchTeams(), fetchIndividualLeagues()]);
  };

  const fetchLeaguePaymentsSimple = async () => {
    if (!userId) return;

    try {
      const payments = await getUserLeaguePayments(userId);
      
      // Transform to match our local interface
      const transformedData = payments.map(payment => ({
        id: payment.id,
        team_id: payment.team_id,
        league_id: payment.league_id,  // Add league_id for matching
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
    individualLeagues,
    loading,
    setLeaguePayments,
    setTeams,
    refetchLeaguePayments,
    refetchTeams: fetchTeams,
    refetchIndividualLeagues: fetchIndividualLeagues,
    updateTeamRoster,
    updateTeamCaptain
  };
}