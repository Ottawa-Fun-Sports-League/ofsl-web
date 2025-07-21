import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireCompleteProfile?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireCompleteProfile = true }: ProtectedRouteProps) {
  const { user, userProfile, loading, profileComplete, refreshUserProfile } = useAuth();
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
  }, [user, loading, location]);
  
  // Attempt to fix missing user profile if user is authenticated but profile is missing
  useEffect(() => {
    const attemptProfileFix = async () => {
      if (user && !userProfile && !loading && !fixingProfile && !profileFixed) {
        try {
          setFixingProfile(true);
          
          // Call the RPC function to fix the user profile
          const { data, error } = await supabase.rpc('check_and_fix_user_profile_v4', {
            p_auth_id: user.id.toString(),
            p_email: user.email || null,
            p_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
            p_phone: user.user_metadata?.phone || null
          });
          
          if (error) {
          } else {
            // Refresh the user profile in AuthContext instead of forcing a page reload
            await refreshUserProfile();
          }
        } catch (err) {
        } finally {
          setFixingProfile(false);
          setProfileFixed(true);
        }
      }
    };
    
    attemptProfileFix();
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

  // Allow access even if profile is incomplete - removed profile completion requirement
  // This allows users to access their account without being forced to complete profile

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
