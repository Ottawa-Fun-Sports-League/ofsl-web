import { UserProfile } from '../types/auth';

/**
 * Check if a user profile is complete with all required fields
 * @param profile - The user profile to check
 * @returns true if the profile is complete, false otherwise
 */
export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;

  // Check if required fields are filled
  const hasName = profile.name && profile.name.trim() !== '';
  const hasPhone = profile.phone && profile.phone.trim() !== '';
  const hasSportsSkills = 
    profile.user_sports_skills && 
    Array.isArray(profile.user_sports_skills) && 
    profile.user_sports_skills.length > 0;
  const isMarkedComplete = profile.profile_completed === true;

  return !!(hasName && hasPhone && hasSportsSkills && isMarkedComplete);
}

/**
 * Get a list of missing required fields for a profile
 * @param profile - The user profile to check
 * @returns Array of missing field names
 */
export function getMissingProfileFields(profile: UserProfile | null): string[] {
  const missing: string[] = [];
  
  if (!profile) {
    return ['profile'];
  }

  if (!profile.name || profile.name.trim() === '') {
    missing.push('name');
  }
  
  if (!profile.phone || profile.phone.trim() === '') {
    missing.push('phone');
  }
  
  if (!profile.user_sports_skills || 
      !Array.isArray(profile.user_sports_skills) || 
      profile.user_sports_skills.length === 0) {
    missing.push('sports skills');
  }
  
  if (!profile.profile_completed) {
    missing.push('profile completion status');
  }

  return missing;
}

/**
 * Format a phone number to a consistent format
 * @param phone - The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(value: string): string {
  const phoneNumber = value.replace(/\D/g, '');

  if (phoneNumber.length <= 3) {
    return phoneNumber;
  } else if (phoneNumber.length <= 6) {
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
  } else {
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }
}

/**
 * Validate a phone number format
 * @param phone - The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneDigits = phone.replace(/\D/g, '');
  return phoneDigits.length === 10;
}