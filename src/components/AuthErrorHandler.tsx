import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from './ui/toast';

/**
 * Component to handle authentication errors passed via URL parameters
 * Supabase redirects with error parameters when authentication fails
 */
export function AuthErrorHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // Parse URL parameters from the search string
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');
    const error = params.get('error');

    // Handle authentication errors
    if (errorCode || error) {
      let errorMessage = 'An authentication error occurred';
      let actionMessage = '';

      switch (errorCode) {
        case 'otp_expired':
          errorMessage = 'Your confirmation link has expired';
          actionMessage = 'Please sign up again to receive a new confirmation email';
          // Store message for signup page
          localStorage.setItem('auth_error_message', errorMessage);
          localStorage.setItem('auth_error_action', actionMessage);
          break;
        
        case 'access_denied':
          errorMessage = 'Access was denied';
          actionMessage = errorDescription || 'Please try again or contact support';
          break;
        
        case 'invalid_request':
          errorMessage = 'Invalid authentication request';
          actionMessage = 'Please try signing in again';
          break;
        
        default:
          if (errorDescription) {
            errorMessage = errorDescription.replace(/\+/g, ' ');
          }
      }

      // Show toast notification
      showToast(errorMessage, 'error');
      
      // Clear the error parameters from URL
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      // If it's an OTP expired error, redirect to signup page
      if (errorCode === 'otp_expired') {
        setTimeout(() => {
          navigate('/signup', { 
            state: { 
              errorMessage,
              actionMessage,
              fromError: true 
            } 
          });
        }, 100);
      }
    }
  }, [location, navigate, showToast]);

  return null;
}