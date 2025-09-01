import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { isProfileComplete } from '../lib/profileUtils';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireCompleteProfile?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, userProfile, loading, refreshUserProfile, validateSession } = useAuth();
  const [fixingProfile, setFixingProfile] = useState(false);
  const [profileFixed, setProfileFixed] = useState(false);
  const [validatingSession, setValidatingSession] = useState(false);
  const location = useLocation();
  

  useEffect(() => {
    // Validate session for authenticated users
    const performSessionValidation = async () => {
      if (user && !loading && !validatingSession) {
        setValidatingSession(true);
        try {
          const isValid = await validateSession();
          if (!isValid) {
            // validateSession handles the redirect to login, so we just return
            return;
          }
        } catch (error) {
          logger.error('Error during session validation', error);
        } finally {
          setValidatingSession(false);
        }
      }
    };

    // Store the attempted location for redirect after login
    if (!user && !loading) {
      // Only store non-login/signup paths
      if (location.pathname !== '/login' && location.pathname !== '/signup') {
        const redirectPath = location.pathname + location.search;
        localStorage.setItem('redirectAfterLogin', redirectPath);
      }
    } else if (user && !loading) {
      // If user is authenticated, validate their session
      performSessionValidation();
    }
    
    // Attempt to fix missing user profile if user is authenticated but profile is missing
    const attemptProfileFix = async () => {
      if (user && !userProfile && !loading && !fixingProfile && !profileFixed) {
        try {
          setFixingProfile(true);
          
          // Determine if this is a Google user for retry logic
          const isGoogleUser = user.app_metadata?.provider === 'google';
          
          const fixUserProfile = async (retryCount = 0): Promise<void> => {
            try {
              // Call the RPC function to fix the user profile
              const { error } = await supabase.rpc('check_and_fix_user_profile_v4', {
                p_auth_id: user.id.toString(),
                p_email: user.email || null,
                p_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
                p_phone: user.user_metadata?.phone || null
              });
              
              if (error) {
                logger.error("Failed to fix user profile via RPC", error);
                // Retry up to 3 times with exponential backoff for Google users
                if (isGoogleUser && retryCount < 3) {
                  const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                  setTimeout(() => fixUserProfile(retryCount + 1), delay);
                }
              } else {
                // Refresh the user profile in AuthContext
                await refreshUserProfile();
              }
            } catch (err) {
              logger.error("Failed to fix user profile", err);
              // Retry for Google users
              if (isGoogleUser && retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                setTimeout(() => fixUserProfile(retryCount + 1), delay);
              }
            }
          };
          
          await fixUserProfile();
        } catch (err) {
          logger.error("Error in attemptProfileFix", err);
        } finally {
          setFixingProfile(false);
          setProfileFixed(true);
        }
      }
    };
    
    attemptProfileFix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, location, fixingProfile, profileFixed]);

  if (loading || fixingProfile || validatingSession) {
    const getLoadingMessage = () => {
      if (validatingSession) return 'Validating session...';
      if (fixingProfile) return 'Fixing user profile...';
      return 'Loading...';
    };

    const getSubMessage = () => {
      if (validatingSession) return 'Checking if your session is still valid...';
      if (fixingProfile) return 'This may take a moment while we set up your account.';
      return 'Please wait while we load your account information.';
    };

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
          <p className="text-[#6F6F6F] mb-2">{getLoadingMessage()}</p>
          <p className="text-sm text-[#6F6F6F] max-w-md">
            {getSubMessage()}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check if email is confirmed
  const isEmailConfirmed = user?.email_confirmed_at != null;
  const isGoogleUser = user?.app_metadata?.provider === 'google';
  
  // Check if user needs email confirmation (non-Google users only)
  if (!isEmailConfirmed && !isGoogleUser && location.pathname !== '/signup-confirmation') {
    return <Navigate to="/signup-confirmation" replace />;
  }

  // Check if user needs to complete their profile
  const needsProfileCompletion = user && !isProfileComplete(userProfile);

  // Allow access to profile completion page even if profile is incomplete
  const isProfileCompletionPage = location.pathname === '/complete-profile';
  const isSignupConfirmationPage = location.pathname === '/signup-confirmation';
  
  // If user needs profile completion and is not on the profile completion page, redirect them
  if (needsProfileCompletion && !isProfileCompletionPage && !isSignupConfirmationPage) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (requireAdmin && !userProfile?.is_admin) {
    // Redirect to profile page if user is not an admin
    return <Navigate to="/my-account/profile" replace />;
  }

  return <>{children}</>;
}
