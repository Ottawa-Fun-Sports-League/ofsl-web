import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../components/ui/toast';
import { Profile } from './types';

export function useProfileOperations(userProfile: { id: string } | null, refreshUserProfile: () => Promise<void>) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async (profile: Profile, skipRefresh = false) => {
    if (!userProfile) return;

    // Validate phone number format
    const phoneDigits = profile.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      showToast("Please enter a valid 10-digit phone number", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          user_sports_skills: profile.user_sports_skills,
          date_modified: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) {
        throw error;
      }

      if (!skipRefresh) {
        await refreshUserProfile();
      }
      
      // If this was a profile completion, redirect appropriately
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('complete') === 'true') {
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath && redirectPath !== '/my-account/profile') {
          localStorage.removeItem('redirectAfterLogin');
          window.location.replace(redirectPath);
        } else {
          window.location.replace('/my-account/teams');
        }
      }
      
      showToast('Profile updated successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleProfileSave
  };
}