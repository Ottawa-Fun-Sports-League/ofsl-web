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
      
      const oldName = team?.name || '';
      const newName = editTeam.name;

      const { error } = await supabase
        .from('teams')
        .update({
          name: editTeam.name,
          skill_level_id: editTeam.skill_level_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);

      if (error) throw error;

      // Cascade rename in schedules for this league so existing scheduled slots reflect the new name
      try {
        if (team && oldName && newName && oldName !== newName) {
          const leagueIdNum = (team as any).league_id ?? (team.leagues?.id);
          if (leagueIdNum) {
            const cols = ['team_a_name','team_b_name','team_c_name','team_d_name','team_e_name','team_f_name'] as const;

            // Prefer exact-match updates per column (fast path)
            for (const col of cols) {
              await supabase
                .from('weekly_schedules')
                .update({ [col]: newName, updated_at: new Date().toISOString() } as any)
                .eq('league_id', leagueIdNum as number)
                .eq(col, oldName);
            }

            // Safety net: handle case-insensitive/trim mismatches by patching rows client-side when needed
            const { data: wsRows } = await supabase
              .from('weekly_schedules')
              .select('id, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
              .eq('league_id', leagueIdNum as number);
            const normalize = (s: string | null | undefined) => (s || '').trim().toLowerCase();
            const normOld = normalize(oldName);
            for (const row of (wsRows || []) as Array<Record<string, any>>) {
              const update: Record<string, any> = { updated_at: new Date().toISOString() };
              let needsUpdate = false;
              for (const col of cols) {
                if (normalize(row[col]) === normOld && row[col] !== newName) {
                  update[col] = newName;
                  needsUpdate = true;
                }
              }
              if (needsUpdate) {
                await supabase
                  .from('weekly_schedules')
                  .update(update)
                  .eq('id', row.id);
              }
            }
          }

          // Also update seed names in league_schedules.schedule_data so seeding/standings references stay in sync
          const { data: schedRow } = await supabase
            .from('league_schedules')
            .select('id, schedule_data')
            .eq('league_id', (leagueIdNum as number | undefined) ?? 0)
            .maybeSingle();
          if (schedRow && (schedRow as any).schedule_data) {
            const sd = (schedRow as any).schedule_data;
            let changed = false;
            if (sd?.tiers && Array.isArray(sd.tiers)) {
              for (const tier of sd.tiers) {
                if (tier?.teams) {
                  for (const key of Object.keys(tier.teams)) {
                    const entry = tier.teams[key];
                    if (entry && typeof entry.name === 'string' && entry.name === oldName) {
                      entry.name = newName;
                      changed = true;
                    }
                  }
                }
              }
            }
            if (changed) {
              await supabase
                .from('league_schedules')
                .update({ schedule_data: sd, updated_at: new Date().toISOString() })
                .eq('id', (schedRow as any).id);
            }
          }
        }
      } catch (cascadeErr) {
        // Log but don't block team update flow
        console.warn('Schedule rename cascade encountered an issue:', cascadeErr);
      }

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
      const rosterNames = teamMembers
        .map((member) => member.name?.trim())
        .filter((name): name is string => Boolean(name && name.length > 0));
      const captainMember = teamMembers.find((member) => member.id === team.captain_id);
      const waitlistPrefixMatch = /^waitlist\s*-/i.test(team.name);
      let leagueName = team.leagues?.name;
      if (!leagueName) {
        const { data: leagueRow } = await supabase
          .from('leagues')
          .select('name')
          .eq('id', team.league_id)
          .maybeSingle();
        leagueName = leagueRow?.name || 'Unknown League';
      }
      
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

      try {
        await supabase.functions.invoke("send-cancellation-notification", {
          body: {
            userId: team.captain_id,
            userName: captainMember?.name || team.users?.name || "Team Captain",
            userEmail: captainMember?.email || team.users?.email || "Unknown",
            userPhone: captainMember?.phone,
            leagueName,
            isTeamRegistration: true,
            teamName: team.name,
            originalTeamName: team.name,
            teamMemberNames: rosterNames,
            rosterCount: teamMembers.length,
            teamIsWaitlisted: waitlistPrefixMatch,
            cancelledAt: new Date().toISOString(),
          },
        });
      } catch (notificationError) {
        console.error('Error sending cancellation notification:', notificationError);
      }
      
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
