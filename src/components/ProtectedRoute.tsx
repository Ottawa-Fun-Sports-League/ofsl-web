import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireCompleteProfile?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const [fixingProfile, setFixingProfile] = useState(false);
  const [profileFixed, setProfileFixed] = useState(false);
  const location = useLocation();
  

  useEffect(() => {
    // Store the attempted location for redirect after login
    if (!user && !loading) {
      // Only store non-login/signup paths
      if (location.pathname !== '/login' && location.pathname !== '/signup') {
        const redirectPath = location.pathname + location.search;
        localStorage.setItem('redirectAfterLogin', redirectPath);
      }
    }
    
    // If user exists but profile is missing, try to fix it
    if (user && !userProfile && !loading && !fixingProfile) {
      
      // Determine if this is a Google user
      const isGoogleUser = user.app_metadata?.provider === 'google';
      
      const fixUserProfile = async (retryCount = 0) => {
        try {
          
          // Use the enhanced v4 function for better Google OAuth support
          const { data, error } = await supabase.rpc('check_and_fix_user_profile_v4', {
            p_auth_id: user.id,
            p_email: user.email || '',
            p_name: user.user_metadata?.name || user.user_metadata?.full_name || '',
            p_phone: user.user_metadata?.phone || ''
          });
          
          if (error) {
            // Retry up to 3 times with exponential backoff for Google users
            if (isGoogleUser && retryCount < 3) {
              const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
              setTimeout(() => fixUserProfile(retryCount + 1), delay);
            }
          } else if (data) {
            // Refresh the user profile
            await refreshUserProfile();
          }
        } catch (err) {
          // Retry for Google users
          if (isGoogleUser && retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => fixUserProfile(retryCount + 1), delay);
          }
        }
      };
      
      fixUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, location]);
  
  // Attempt to fix missing user profile if user is authenticated but profile is missing
  useEffect(() => {
    const attemptProfileFix = async () => {
      if (user && !userProfile && !loading && !fixingProfile && !profileFixed) {
        try {
          setFixingProfile(true);
          
          // Call the RPC function to fix the user profile
          const { error } = await supabase.rpc('check_and_fix_user_profile_v4', {
            p_auth_id: user.id.toString(),
            p_email: user.email || null,
            p_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
            p_phone: user.user_metadata?.phone || null
          });
          
          if (error) {
            logger.error("Failed to fix user profile via RPC", error);
          } else {
            // Refresh the user profile in AuthContext instead of forcing a page reload
            await refreshUserProfile();
          }
        } catch (err) {
          logger.error("Failed to fix user profile", err);
        } finally {
          setFixingProfile(false);
          setProfileFixed(true);
        }
      }
    };
    
    attemptProfileFix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading, fixingProfile, profileFixed]);

  if (loading || fixingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
          <p className="text-[#6F6F6F] mb-2">{fixingProfile ? 'Fixing user profile...' : 'Loading...'}</p>
          <p className="text-sm text-[#6F6F6F] max-w-md">
            {fixingProfile ? 'This may take a moment while we set up your account.' : 'Please wait while we load your account information.'}
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
    console.log('User email not confirmed. Redirecting to signup confirmation page.');
    return <Navigate to="/signup-confirmation" replace />;
  }

  // Check if user needs to complete their profile
  const needsProfileCompletion = user && (!userProfile || 
    !userProfile.profile_completed || 
    !userProfile.name || 
    !userProfile.phone || 
    !userProfile.user_sports_skills || 
    userProfile.user_sports_skills.length === 0);

  // Allow access to profile completion page even if profile is incomplete
  const isProfileCompletionPage = location.pathname === '/complete-profile';
  const isSignupConfirmationPage = location.pathname === '/signup-confirmation';
  
  // If user needs profile completion and is not on the profile completion page, redirect them
  if (needsProfileCompletion && !isProfileCompletionPage && !isSignupConfirmationPage) {
    console.log('User needs to complete profile. Redirecting to profile completion page.', {
      userProfile,
      profileCompleted: userProfile?.profile_completed,
      hasName: !!userProfile?.name,
      hasPhone: !!userProfile?.phone,
      hasSportsSkills: userProfile?.user_sports_skills?.length > 0
    });
    return <Navigate to="/complete-profile" replace />;
  }

  if (requireAdmin && !userProfile?.is_admin) {
    console.warn('Admin access required. Redirecting to profile page.', {
      userProfile,
      isAdmin: userProfile?.is_admin
    });
    // Redirect to profile page if user is not an admin
    return <Navigate to="/my-account/profile" replace />;
  }

  return <>{children}</>;
}
