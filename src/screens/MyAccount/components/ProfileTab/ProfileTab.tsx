import { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { ProfileInformation } from './ProfileInformation';
import { PasswordSecurity } from './PasswordSecurity';
import { NotificationPreferences } from './NotificationPreferences';
import { WaiverStatus } from './WaiverStatus';
import { SportsSkillsSelector } from '../../../../components/SportsSkillsSelector';
import { useProfileData } from './useProfileData';
import { useProfileOperations } from './useProfileOperations';
import { usePasswordOperations } from './usePasswordOperations';

export function ProfileTab() {
  const { userProfile, refreshUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const {
    profile,
    notifications,
    sports,
    skills,
    loadingSportsSkills,
    setProfile,
    handleNotificationToggle,
    markProfileAsSaved
  } = useProfileData(userProfile);

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
    // Skip refresh for sports saves to prevent race condition - use optimistic updates instead
    const success = await handleProfileSave(profile, true);
    if (success) {
      markProfileAsSaved(profile);
    }
    return success;
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
      <ProfileInformation
        profile={profile}
        isEditing={isEditing}
        saving={saving}
        userProfile={userProfile}
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