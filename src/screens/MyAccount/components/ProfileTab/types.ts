export interface SportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

export interface Sport {
  id: number;
  name: string;
}

export interface Skill {
  id: number;
  name: string;
  description?: string;
}

export interface Profile {
  name: string;
  phone: string;
  email: string;
  user_sports_skills: SportSkill[];
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  gameReminders: boolean;
  leagueUpdates: boolean;
  paymentReminders: boolean;
}

export interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordValidationState {
  passwordError: string | null;
  newPasswordError: string | null;
  confirmPasswordError: string | null;
  confirmPasswordSuccess: boolean;
  changingPassword: boolean;
}