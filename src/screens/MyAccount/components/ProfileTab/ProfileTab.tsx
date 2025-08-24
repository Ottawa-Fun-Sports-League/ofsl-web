import { useState, useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { ProfileInformation } from './ProfileInformation';
import { PasswordSecurity } from './PasswordSecurity';
import { NotificationPreferences } from './NotificationPreferences';
import { WaiverStatus } from './WaiverStatus';
import { SportsSkillsSelector } from '../../../../components/SportsSkillsSelector';
import { PendingInvites } from '../../../../components/PendingInvites';
import { useProfileData } from './useProfileData';
import { useProfileOperations } from './useProfileOperations';
import { usePasswordOperations } from './usePasswordOperations';

export function ProfileTab() {
  const { userProfile, refreshUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Memoize the profile data to prevent infinite loops
  const profileData = useMemo(() => {
    if (!userProfile) return null;
    return {
      id: userProfile.id,
      name: userProfile.name || undefined,
      phone: userProfile.phone || undefined,
      email: userProfile.email || undefined,
      user_sports_skills: userProfile.user_sports_skills
    };
  }, [userProfile]);

  const {
    profile,
    notifications,
    sports: _sports,
    skills: _skills,
    loadingSportsSkills: _loadingSportsSkills,
    setProfile,
    handleNotificationToggle,
    markProfileAsSaved
  } = useProfileData(profileData);

  const { saving, handleProfileSave } = useProfileOperations(userProfile, refreshUserProfile);

  const {
    showPasswordSection,
    passwordForm,
    passwordValidation,
    showNewPassword,
    showConfirmPassword,
    setPasswordForm,
    setShowNewPassword,
    setShowConfirmPassword,
    handleTogglePasswordSection,
    validateNewPassword,
    validateConfirmPassword,
    handlePasswordChange,
    handleCancelPasswordChange
  } = usePasswordOperations();

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    const success = await handleProfileSave(profile);
    if (success) {
      markProfileAsSaved(profile);
      setIsEditing(false);
    }
  };

  const handleSaveSports = async () => {
    // Save the profile and refresh to ensure data consistency
    const success = await handleProfileSave(profile);
    if (success) {
      markProfileAsSaved(profile);
    }
    return success || false;
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfile({
      name: userProfile?.name || '',
      phone: userProfile?.phone || '',
      email: userProfile?.email || '',
      user_sports_skills: userProfile?.user_sports_skills || []
    });
  };

  return (
    <div className="space-y-8">
      <PendingInvites />
      
      <ProfileInformation
        profile={profile}
        isEditing={isEditing}
        saving={saving}
        userProfile={profile}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onProfileChange={setProfile}
      />

      <PasswordSecurity
        showPasswordSection={showPasswordSection}
        passwordForm={passwordForm}
        passwordValidation={passwordValidation}
        showNewPassword={showNewPassword}
        showConfirmPassword={showConfirmPassword}
        onTogglePasswordSection={handleTogglePasswordSection}
        onPasswordFormChange={setPasswordForm}
        onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
        onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
        onValidateNewPassword={validateNewPassword}
        onValidateConfirmPassword={validateConfirmPassword}
        onPasswordChange={handlePasswordChange}
        onCancelPasswordChange={handleCancelPasswordChange}
      />

      <NotificationPreferences
        notifications={notifications}
        onNotificationToggle={handleNotificationToggle}
      />

      <WaiverStatus />

      <SportsSkillsSelector
        value={profile.user_sports_skills}
        onChange={(newSportsSkills) => setProfile({ ...profile, user_sports_skills: newSportsSkills })}
        onSave={handleSaveSports}
        saving={saving}
        showTitle={true}
      />
    </div>
  );
}