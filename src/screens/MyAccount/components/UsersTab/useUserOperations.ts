import { useState } from 'react';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { User, EditUserForm, UserRegistration } from './types';

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
    
    // Load registrations via admin function (bypasses RLS)
    await loadUserRegistrations(user.id);
  };

  const loadUserRegistrations = async (userId: string) => {
    try {
      // Fetch the user to get league_ids (for individual registrations)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, league_ids')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Failed to load user for registrations', userError);
        setUserRegistrations([]);
        return;
      }

      // Load active teams the user is involved with (captain, co-captain, or roster)
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          co_captains,
          roster,
          league_id,
          leagues!inner (
            id,
            name,
            end_date,
            sports!inner ( name )
          )
        `);

      if (teamsError) {
        console.error('Error loading teams for registrations', teamsError);
      }

      const today = new Date().toISOString().split('T')[0];
      const regsMap = new Map<number, UserRegistration>();

      (allTeams || [])
        .filter((team: any) => {
          const league = team.leagues as any;
          if (league?.end_date && league.end_date < today) return false;
          return (
            team.captain_id === user.id ||
            (Array.isArray(team.co_captains) && team.co_captains.includes(user.id)) ||
            (Array.isArray(team.roster) && team.roster.includes(user.id))
          );
        })
        .forEach((team: any) => {
          const league = team.leagues as any;
          const role = team.captain_id === user.id ? 'captain' : 'player';
          const leagueId = league?.id as number;
          if (!leagueId) return;
          const existing = regsMap.get(leagueId);
          if (!existing || role === 'captain') {
            regsMap.set(leagueId, {
              id: leagueId,
              name: league?.name || 'Unknown League',
              sport_name: (league?.sports as any)?.name || null,
              role,
              registration_type: 'team',
              team_id: team.id,
              league_id: leagueId,
            });
          }
        });

      // Also include individual league registrations (league_ids) as player
      const individualIds: number[] = (user.league_ids as number[] | null) || [];
      if (individualIds.length > 0) {
        const { data: leagues, error: leaguesError } = await supabase
          .from('leagues')
          .select('id, name, sports:sport_id(name), end_date, team_registration')
          .in('id', individualIds);

        if (leaguesError) {
          console.error('Error loading individual leagues for registrations', leaguesError);
        } else {
          (leagues || [])
            .filter((l: any) => l.team_registration === false && (!l.end_date || l.end_date >= today))
            .forEach((l: any) => {
              if (!regsMap.has(l.id)) {
                regsMap.set(l.id, {
                  id: l.id,
                  name: l.name || 'Unknown League',
                  sport_name: (l.sports as any)?.name || null,
                  role: 'player',
                  registration_type: 'individual',
                  league_id: l.id,
                });
              }
            });
        }
      }

      setUserRegistrations(Array.from(regsMap.values()));
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

      // Call admin Edge Function with service role to generate and send reset link
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error('No active session. Please log out and log back in.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email: userEmail, sendEmail: true }),
      });

      if (!res.ok) {
        const txt = await res.text();
        try {
          const j = JSON.parse(txt);
          throw new Error(j.error || 'Failed to reset password');
        } catch {
          throw new Error(txt || 'Failed to reset password');
        }
      }

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
