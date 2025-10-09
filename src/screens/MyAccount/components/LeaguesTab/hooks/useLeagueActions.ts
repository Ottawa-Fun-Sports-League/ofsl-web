import { useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { NewLeague, LeagueWithTeamCount } from '../types';

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
          gender: newLeague.gender,
          sport_id: newLeague.sport_id,
          skill_ids: newLeague.skill_ids,
          skill_id: newLeague.skill_ids.length > 0 ? newLeague.skill_ids[0] : null,
          day_of_week: newLeague.day_of_week,
          year: newLeague.year,
          start_date: newLeague.start_date,
          end_date: newLeague.end_date,
          hide_day: newLeague.hide_day,
          cost: newLeague.cost,
          early_bird_cost: newLeague.early_bird_cost,
          early_bird_due_date: newLeague.early_bird_due_date,
          max_teams: newLeague.max_teams,
          gym_ids: newLeague.gym_ids,
          payment_due_date: newLeague.payment_due_date,
          is_draft: newLeague.is_draft ?? true,
          publish_date: newLeague.publish_date,
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

  const handleCopyLeague = async (originalLeague: LeagueWithTeamCount, newName: string): Promise<{id: number} | null> => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name: newName,
          description: originalLeague.description,
          league_type: originalLeague.league_type,
          gender: originalLeague.gender,
          location: originalLeague.location,
          sport_id: originalLeague.sport_id,
          skill_ids: originalLeague.skill_ids,
          skill_id: originalLeague.skill_id,
          day_of_week: originalLeague.day_of_week,
          year: originalLeague.year,
          start_date: originalLeague.start_date,
          end_date: originalLeague.end_date,
          hide_day: originalLeague.hide_day,
          cost: originalLeague.cost,
          early_bird_cost: (originalLeague as any).early_bird_cost,
          early_bird_due_date: (originalLeague as any).early_bird_due_date,
          max_teams: originalLeague.max_teams,
          gym_ids: originalLeague.gym_ids,
          payment_due_date: originalLeague.payment_due_date,
          is_draft: true,
          publish_date: null,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      showToast('League copied successfully!', 'success');
      await loadData();
      
      return data;
    } catch (error) {
      console.error('Error copying league:', error);
      showToast('Failed to copy league', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleCreateLeague,
    handleDeleteLeague,
    handleCopyLeague,
  };
}
