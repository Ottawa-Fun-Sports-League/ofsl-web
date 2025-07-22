import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { fetchSkills } from '../../../../lib/leagues';
import { useToast } from '../../../../components/ui/toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { Team, Skill, TeamMember, EditTeamForm } from './types';
import { PaymentInfo, PaymentHistoryEntry } from '../../../../components/payments';

export function useTeamEditData(teamId: string | undefined) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTeam, setEditTeam] = useState<EditTeamForm>({
    name: '',
    skill_level_id: null
  });

  useEffect(() => {
    if (!userProfile?.is_admin || !teamId) {
      return;
    }
    loadData();
  }, [teamId, userProfile]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const skillsData = await fetchSkills();
      setSkills(skillsData);

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          leagues:league_id(id, name),
          skills:skill_level_id(name),
          users:captain_id(name, email)
        `)
        .eq('id', teamId)
        .single();
      
      if (teamError) throw teamError;
      
      if (!teamData) {
        throw new Error('Team not found');
      }
      
      setTeam(teamData);
      setEditTeam({
        name: teamData.name,
        skill_level_id: teamData.skill_level_id
      });

      await loadTeamMembers(teamData.roster);
      await loadPaymentInfo(teamData.id, teamData.league_id);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (roster: string[]) => {
    if (!roster || roster.length === 0) {
      setTeamMembers([]);
      return;
    }
    
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('users')
        .select('id, name, email, phone')
        .in('id', roster);

      if (membersError) {
        console.error('Error loading team members:', membersError);
        return;
      }
      
      setTeamMembers(membersData || []);
    } catch (error) {
      console.error('Error in loadTeamMembers:', error);
    }
  };

  const loadPaymentInfo = async (teamId: number, leagueId: number) => {
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('league_payments')
        .select('*')
        .eq('team_id', teamId)
        .eq('league_id', leagueId)
        .maybeSingle();

      if (paymentError) {
        console.error('Error loading payment information:', paymentError);
        return;
      }
      
      if (paymentData) {
        setPaymentInfo(paymentData);
        parsePaymentHistory(paymentData.notes, paymentData);
      }
    } catch (error) {
      console.error('Error in loadPaymentInfo:', error);
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
      
        const dateMatch = note.match(/(\d{1,2})[-\/](\d{1,2})/);
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
          payment_method: method,
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

  return {
    team,
    skills,
    teamMembers,
    paymentInfo,
    paymentHistory,
    loading,
    editTeam,
    setTeam,
    setEditTeam,
    setPaymentInfo,
    setPaymentHistory,
    setTeamMembers,
    loadData
  };
}