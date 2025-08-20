import { useState } from 'react';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { User, EditUserForm, UserRegistration } from './types';

interface TeamWithLeague {
  id: number;
  captain_id: string;
  leagues: {
    id: number;
    name: string;
    sports: {
      name: string;
    } | null;
  } | null;
}

export function useUserOperations(loadUsers: () => Promise<void>) {
  const { showToast } = useToast();
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({});
  const [userRegistrations, setUserRegistrations] = useState<UserRegistration[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleEditUser = async (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name || undefined,
      email: user.email || undefined,
      phone: user.phone || undefined,
      preferred_position: user.preferred_position || undefined,
      is_admin: user.is_admin || undefined,
      is_facilitator: user.is_facilitator || undefined
    });
    
    // Use current_registrations instead of team_ids to show all active team memberships
    const teamIds = user.current_registrations?.map(r => r.team_id.toString()) || [];
    await loadUserRegistrations(teamIds);
  };

  const loadUserRegistrations = async (teamIds: string[]) => {
    if (teamIds.length === 0) {
      setUserRegistrations([]);
      return;
    }

    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          id,
          captain_id,
          leagues:league_id(
            id, 
            name,
            sports:sport_id(name)
          )
        `)
        .in('id', teamIds.map(id => parseInt(id)));

      if (error) throw error;

      const leagueMap = new Map();
      
      (teamsData as unknown as TeamWithLeague[] | null)?.forEach(team => {
        if (team.leagues) {
          const league = team.leagues;
          const isCaptain = editingUser ? team.captain_id === editingUser : false;
          const sportName = league.sports?.name;
          
          if (leagueMap.has(league.id)) {
            const existing = leagueMap.get(league.id);
            if (isCaptain) {
              existing.role = 'captain';
            }
          } else {
            leagueMap.set(league.id, {
              id: league.id,
              name: league.name,
              sport_name: sportName,
              role: isCaptain ? 'captain' : 'player'
            });
          }
        }
      });

      setUserRegistrations(Array.from(leagueMap.values()));
    } catch (error) {
      console.error('Error loading user registrations:', error);
      setUserRegistrations([]);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          preferred_position: editForm.preferred_position,
          is_admin: editForm.is_admin,
          is_facilitator: editForm.is_facilitator,
          date_modified: new Date().toISOString()
        })
        .eq('id', editingUser);

      if (error) throw error;

      showToast('User updated successfully!', 'success');
      handleCancelEdit();
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete user');

      showToast('User deleted successfully!', 'success');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;

    const confirmReset = confirm('Are you sure you want to reset this user\'s password? They will receive an email with instructions to set a new password.');
    if (!confirmReset) return;

    try {
      setResettingPassword(true);
      
      const userEmail = editForm.email;
      if (!userEmail) {
        showToast('User email is required to reset password', 'error');
        return;
      }

      const { error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: {
          redirectTo: `${window.location.origin}/#/reset-password`
        }
      });

      if (error) throw error;

      showToast('Password reset email sent successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      showToast(errorMessage, 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
    setUserRegistrations([]);
    setResettingPassword(false);
  };

  return {
    editingUser,
    editForm,
    userRegistrations,
    deleting,
    resettingPassword,
    setEditForm,
    handleEditUser,
    handleSaveUser,
    handleDeleteUser,
    handleResetPassword,
    handleCancelEdit
  };
}