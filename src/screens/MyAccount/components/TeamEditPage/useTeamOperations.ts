import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../components/ui/toast';
import { Team, EditTeamForm, TeamMember } from './types';

export function useTeamOperations(
  teamId: string | undefined,
  team: Team | null,
  teamMembers: TeamMember[],
  loadData: () => Promise<void>
) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateTeam = async (editTeam: EditTeamForm) => {
    if (!teamId) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('teams')
        .update({
          name: editTeam.name,
          skill_level_id: editTeam.skill_level_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);

      if (error) throw error;

      showToast('Team updated successfully!', 'success');
      
      if (team?.leagues?.id) {
        navigate(`/leagues/${team.leagues.id}?tab=teams`);
      } else {
        navigate('/my-account/leagues');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      showToast('Failed to update team', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId || !team) {
      return;
    }
    
    try {
      setDeleting(true);
      
      if (team.roster && team.roster.length > 0) {
        for (const userId of team.roster) {
          const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('team_ids')
            .eq('id', userId)
            .single();
            
          if (fetchError) {
            console.error(`Error fetching user ${userId}:`, fetchError);
            continue;
          }
          
          if (userData) {
            const updatedTeamIds = (userData.team_ids || []).filter((id: number) => id !== parseInt(teamId));
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ team_ids: updatedTeamIds })
              .eq('id', userId);
              
            if (updateError) {
              console.error(`Error updating user ${userId}:`, updateError);
            }
          }
        }
      }
      
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
        
      if (deleteError) throw deleteError;
      
      showToast('Team deleted successfully', 'success');
      navigate('/my-account/teams');
      
    } catch (error) {
      console.error('Error deleting team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
      showToast(errorMessage, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team || !teamId) {
      return;
    }

    if (memberId === team.captain_id) {
      showToast('Cannot remove the team captain', 'error');
      return;
    }

    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      const updatedRoster = team.roster.filter((id: string) => id !== memberId);
      
      const { error: teamError } = await supabase
        .from('teams')
        .update({ roster: updatedRoster })
        .eq('id', teamId);

      if (teamError) throw teamError;

      const member = teamMembers.find(m => m.id === memberId);
      if (member) {
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('team_ids')
          .eq('id', memberId)
          .single();

        if (!fetchError && userData) {
          const updatedTeamIds = (userData.team_ids || []).filter((id: number) => id !== parseInt(teamId));
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ team_ids: updatedTeamIds })
            .eq('id', memberId);

          if (updateError) {
            console.error('Error updating user team_ids:', updateError);
          }
        }
      }

      showToast('Member removed successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Error removing member:', error);
      showToast('Failed to remove member', 'error');
    }
  };

  return {
    saving,
    deleting,
    handleUpdateTeam,
    handleDeleteTeam,
    handleRemoveMember
  };
}