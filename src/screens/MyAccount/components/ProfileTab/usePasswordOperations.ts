import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../components/ui/toast';
import { PasswordForm, PasswordValidationState } from './types';
import { INITIAL_PASSWORD_FORM, INITIAL_PASSWORD_VALIDATION } from './constants';

export function usePasswordOperations() {
  const { showToast } = useToast();
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(INITIAL_PASSWORD_FORM);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationState>(INITIAL_PASSWORD_VALIDATION);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // Validate new password when field is blurred or changed
  const validateNewPassword = (password: string) => {
    if (!password) {
      setPasswordValidation(prev => ({ ...prev, newPasswordError: "New password is required" }));
      return false;
    }
    
    if (password.length < 12) {
      setPasswordValidation(prev => ({ ...prev, newPasswordError: "Password must be at least 12 characters" }));
      return false;
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      setPasswordValidation(prev => ({ ...prev, newPasswordError: "Password must contain at least one uppercase letter" }));
      return false;
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      setPasswordValidation(prev => ({ ...prev, newPasswordError: "Password must contain at least one lowercase letter" }));
      return false;
    }
    
    // Check for at least one number
    if (!/\d/.test(password)) {
      setPasswordValidation(prev => ({ ...prev, newPasswordError: "Password must contain at least one number" }));
      return false;
    }
    
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      setPasswordValidation(prev => ({ ...prev, newPasswordError: "Password must contain at least one special character" }));
      return false;
    }
    
    // Password is valid
    setPasswordValidation(prev => ({ ...prev, newPasswordError: null }));
    return true;
  };

  // Validate confirm password when field is changed
  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setPasswordValidation(prev => ({ 
        ...prev, 
        confirmPasswordError: "Confirm password is required",
        confirmPasswordSuccess: false
      }));
      return false;
    }
    
    if (confirmPassword !== passwordForm.newPassword) {
      setPasswordValidation(prev => ({ 
        ...prev, 
        confirmPasswordError: "Passwords do not match",
        confirmPasswordSuccess: false
      }));
      return false;
    }
    
    // Passwords match
    setPasswordValidation(prev => ({ 
      ...prev, 
      confirmPasswordError: null,
      confirmPasswordSuccess: true
    }));
    return true;
  };

  const handlePasswordChange = async () => {
    // Reset error state
    setPasswordValidation(prev => ({ ...prev, passwordError: null }));
    
    // Validate passwords
    if (!passwordForm.newPassword) {
      setPasswordValidation(prev => ({ ...prev, passwordError: "New password is required" }));
      return;
    }
    
    // Validate the new password
    if (!validateNewPassword(passwordForm.newPassword)) {
      setPasswordValidation(prev => ({ ...prev, passwordError: prev.newPasswordError }));
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordValidation(prev => ({ ...prev, passwordError: "New passwords do not match" }));
      return;
    }
    
    try {
      setPasswordValidation(prev => ({ ...prev, changingPassword: true }));
      
      // Update the password - since user is authenticated, no current password needed
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // Reset form and show success message
      setPasswordForm(INITIAL_PASSWORD_FORM);
      setShowPasswordSection(false);
      showToast('Password updated successfully!', 'success');
      
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordValidation(prev => ({ ...prev, passwordError: (error as Error).message || 'Failed to update password' }));
    } finally {
      setPasswordValidation(prev => ({ ...prev, changingPassword: false }));
    }
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordSection(false);
    setPasswordForm(INITIAL_PASSWORD_FORM);
    setPasswordValidation(INITIAL_PASSWORD_VALIDATION);
  };

  const handleTogglePasswordSection = () => {
    setShowPasswordSection(!showPasswordSection);
    if (showPasswordSection) {
      handleCancelPasswordChange();
    }
  };

  return {
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
  };
}