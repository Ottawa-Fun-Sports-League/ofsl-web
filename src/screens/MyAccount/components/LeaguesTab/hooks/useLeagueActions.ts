import { useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { NewLeague } from '../types';
import { updateStripeProductLeagueId } from '../../../../../lib/stripe';

interface UseLeagueActionsProps {
  loadData: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export function useLeagueActions({ loadData, showToast }: UseLeagueActionsProps) {
  const [saving, setSaving] = useState(false);

  const handleCreateLeague = async (newLeague: NewLeague): Promise<{id: number} | null> => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name: newLeague.name,
          description: newLeague.description,
          league_type: newLeague.league_type,
          sport_id: newLeague.sport_id,
          skill_ids: newLeague.skill_ids,
          skill_id: newLeague.skill_ids.length > 0 ? newLeague.skill_ids[0] : null,
          day_of_week: newLeague.day_of_week,
          year: newLeague.year,
          start_date: newLeague.start_date,
          end_date: newLeague.end_date,
          hide_day: newLeague.hide_day,
          cost: newLeague.cost,
          max_teams: newLeague.max_teams,
          gym_ids: newLeague.gym_ids,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      showToast('League created successfully!', 'success');
      await loadData();
      
      return data;
    } catch (error) {
      console.error('Error creating league:', error);
      showToast('Failed to create league', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeague = async (leagueId: number) => {
    if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);

      if (error) throw error;

      showToast('League deleted successfully!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error deleting league:', error);
      showToast('Failed to delete league', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleCreateLeague,
    handleDeleteLeague,
  };
}