import { useCallback, useState } from 'react';
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error('No active session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-user-registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('admin-user-registrations error:', txt);
        setUserRegistrations([]);
        return;
      }

      const json = await res.json();
      const regs: UserRegistration[] = [];
      const teams = (json?.team_registrations || []) as Array<any>;
      const indiv = (json?.individual_registrations || []) as Array<any>;

      teams.forEach((t) => {
        regs.push({
          id: t.league_id,
          name: t.league_name,
          sport_name: t.sport_name || null,
          role: t.role === 'captain' ? 'captain' : 'player',
          registration_type: 'team',
          team_id: t.team_id,
          league_id: t.league_id,
        });
      });
      indiv.forEach((i) => {
        regs.push({
          id: i.league_id,
          name: i.league_name,
          sport_name: i.sport_name || null,
          role: 'player',
          registration_type: 'individual',
          league_id: i.league_id,
        });
      });

      setUserRegistrations(regs);
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

      const options: { redirectTo: string; captchaToken?: string } = {
        redirectTo: `${window.location.origin}/#/reset-password?type=recovery`,
      };

      // If Turnstile is enabled, require a captcha token
      if (import.meta.env.VITE_TURNSTILE_SITE_KEY) {
        if (!captchaToken) {
          showToast('Please complete the security verification', 'error');
          return;
        }
        options.captchaToken = captchaToken;
      }

      // Use Supabase's standard reset email to keep templates identical
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, options);

      if (error) throw error;

      showToast('Password reset email sent successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      showToast(errorMessage, 'error');
    } finally {
      setResettingPassword(false);
      setCaptchaToken(null);
    }
  };

  // Turnstile handlers for admin reset flow
  const handleCaptchaVerify = useCallback((token: string) => setCaptchaToken(token), []);
  const handleCaptchaError = useCallback(() => setCaptchaToken(null), []);
  const handleCaptchaExpire = useCallback(() => setCaptchaToken(null), []);

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
    handleCaptchaVerify,
    handleCaptchaError,
    handleCaptchaExpire,
    handleCancelEdit
  };
}
