import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  profileComplete: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<void>;
  checkProfileCompletion: () => boolean;
  refreshUserProfile: () => Promise<void>;
  emailVerified: boolean;
  isNewUser: boolean;
  setIsNewUser: (isNew: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [lastRedirectPath, setLastRedirectPath] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const redirectingRef = useRef<string | null>(null);

  // Helper function to check if profile is complete
  const checkProfileCompletion = (profile?: any) => {
    const profileToCheck = profile || userProfile;
    if (!profileToCheck) return false;

    // Check if required fields are filled including sports/skills
    const hasBasicInfo =
      profileToCheck.name &&
      profileToCheck.phone &&
      profileToCheck.name.trim() !== "" &&
      profileToCheck.phone.trim() !== "";
    const hasSportsSkills =
      profileToCheck.user_sports_skills &&
      Array.isArray(profileToCheck.user_sports_skills) &&
      profileToCheck.user_sports_skills.length > 0;

    return hasBasicInfo && hasSportsSkills && profileToCheck.profile_completed;
  };

  // Function to fetch user profile
  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUser.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found - this is expected for new users
          return null;
        } else {
          // Unexpected error - log and return null to prevent data leaks
          console.error("Error fetching user profile:", error);
          return null;
        }
      }

      // Verify the profile belongs to the current user to prevent data leaks
      if (profile && profile.auth_id !== authUser.id) {
        console.error("Security violation: Profile auth_id mismatch", {
          profile_auth_id: profile.auth_id,
          user_auth_id: authUser.id,
        });
        return null;
      }

      return profile;
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return null;
    }
  };

  // Function to refresh user profile
  const refreshUserProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user);
      setUserProfile(profile);
    }
  };

  // Helper function to create user profile if it doesn't exist
  const handleUserProfileCreation = async (user: User) => {
    try {
      const provider = user.app_metadata?.provider || "email";

      // Use the v4 function for better Google OAuth support
      let { data: existingProfile, error: fetchError } = await supabase.rpc(
        "check_and_fix_user_profile_v4",
        {
          p_auth_id: user.id.toString(),
          p_email: user.email,
          p_name:
            user.user_metadata?.full_name || user.user_metadata?.name || "",
          p_phone: user.user_metadata?.phone || "",
        },
      );

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking existing user:", fetchError);
        return null;
      }

      // After attempting to fix the profile, fetch the current profile
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (profileError) {
        console.error(
          "Error fetching user profile after fix attempt:",
          profileError,
        );
        return null;
      }

      // Verify the profile belongs to the current user to prevent data leaks
      if (profile && profile.auth_id !== user.id) {
        console.error(
          "Security violation: Profile auth_id mismatch in handleUserProfileCreation",
          {
            profile_auth_id: profile.auth_id,
            user_auth_id: user.id,
          },
        );
        return null;
      }

      return profile;
    } catch (error) {
      console.error("Error in handleUserProfileCreation:", error);
      return null;
    }
  };

  // Handle auth state changes
  const handleAuthStateChange = async (
    event: string,
    session: Session | null,
  ) => {
    // Helper function to get current path dynamically
    const getCurrentPath = () => window.location.hash.replace("#", "") || "/";
    
    // Store the current path for potential redirect after profile completion
    const currentPath = getCurrentPath();


    // If we're already redirecting to complete-profile, skip redirect logic
    if (redirectingRef.current === "/complete-profile" || (isRedirecting && lastRedirectPath === "/complete-profile")) {
      // Set session and user state
      if (session) {
        setSession(session);
        setUser(session.user);
        setEmailVerified(session.user.email_confirmed_at != null);

        // Try to create/fetch user profile
        if (session.user) {
          handleUserProfileCreation(session.user)
            .then((profile) => {
              if (profile) {
                setUserProfile(profile);
                const isComplete = checkProfileCompletion(profile);
                setProfileComplete(isComplete);
                
                // Only clear redirect flags if we're actually on complete-profile page
                if (currentPath === "/complete-profile") {
                  setIsRedirecting(false);
                  setLastRedirectPath(null);
                  redirectingRef.current = null;
                }
              }
            })
            .catch((err) => {
              console.error("Error handling user profile during redirect:", err);
            });
        }
      } else {
        setSession(null);
        setUser(null);
        setEmailVerified(false);
      }

      // Set loading to false
      if (initializing) {
        setInitializing(false);
      }
      setLoading(false);
      return;
    }

    // Set isNewUser flag for SIGNED_UP events
    if (event === "SIGNED_UP") {
      setIsNewUser(true);
    }

    // Set session and user state immediately to ensure UI updates
    if (session) {
      setSession(session);
      setUser(session.user);
      // Set email verification status
      const isEmailVerified = session.user.email_confirmed_at != null;
      setEmailVerified(isEmailVerified);
    } else {
      setSession(null);
      setUser(null);
      setEmailVerified(false);
    }

    // Profile creation will be handled by handleUserProfileCreation below

    if (event === "SIGNED_OUT") {
      // Clear all auth state
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setIsNewUser(false);
      setIsRedirecting(false);
      setLastRedirectPath(null);
      redirectingRef.current = null;
      // Clear any stored redirect paths
      localStorage.removeItem("redirectAfterLogin");
      setLoading(false);
      return;
    }

    // Handle password recovery event
    if (event === "PASSWORD_RECOVERY") {
      // Don't redirect, let the ResetPasswordPage component handle this
      setLoading(false);
      return;
    }

    if (session?.user) {
      // Handle user profile for any signed-in user
      const profile = await handleUserProfileCreation(session.user);

      // Handle user profile for all users (Google and non-Google)
      if (profile) {
        setUserProfile(profile);

        // Check profile completion status
        const isComplete = checkProfileCompletion(profile);
        setProfileComplete(isComplete);

        // Check email verification status
        const isEmailVerified = session.user.email_confirmed_at != null;

        // Redirect logic based on verification and completion status
        if (!isEmailVerified) {
          // Email not verified, redirect to confirmation
          const currentPathNow = getCurrentPath();
          if (currentPathNow !== "/signup-confirmation") {
            localStorage.setItem("redirectAfterLogin", currentPathNow);
            window.location.hash = "#/signup-confirmation";
            return;
          }
        } else if (!isComplete) {
          // Email verified but profile incomplete, redirect to profile completion
          // Check if this user needs profile completion
          const needsProfileCompletion =
            !profile.profile_completed ||
            !profile.name ||
            !profile.phone ||
            !profile.user_sports_skills ||
            profile.user_sports_skills.length === 0;

          const currentPathNow = getCurrentPath();
          if (
            needsProfileCompletion &&
            currentPathNow !== "/complete-profile" &&
            !isRedirecting &&
            lastRedirectPath !== "/complete-profile" &&
            redirectingRef.current !== "/complete-profile"
          ) {
            // Set ref immediately to prevent race condition
            redirectingRef.current = "/complete-profile";
            setIsRedirecting(true);
            setLastRedirectPath("/complete-profile");
            localStorage.setItem("redirectAfterLogin", currentPathNow);
            // Use replace to avoid race condition and ensure immediate URL change
            window.location.hash = "#/complete-profile";
            // Don't return - continue processing as if we're on complete-profile page
          }
        }
      } else {
        // Profile creation failed or doesn't exist
        setUserProfile(null);
        setProfileComplete(false);

        // Check email verification first
        const isEmailVerified = session.user.email_confirmed_at != null;

        if (!isEmailVerified) {
          // Email not verified, redirect to confirmation
          const currentPathNow = getCurrentPath();
          if (currentPathNow !== "/signup-confirmation") {
            localStorage.setItem("redirectAfterLogin", currentPathNow);
            window.location.hash = "#/signup-confirmation";
            return;
          }
        } else {
          // Email verified but no profile exists, redirect to profile completion
          // This handles both new users and cases where profile creation failed

          // For Google users, we can't rely on SIGNED_UP event, so check if user is recent
          const isGoogleUser = session.user.app_metadata?.provider === "google";
          const userCreatedAt = new Date(session.user.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const isRecentUser = userCreatedAt > fiveMinutesAgo;

          // Always redirect to profile completion if no profile exists
          const currentPathNow = getCurrentPath();
          if (currentPathNow !== "/complete-profile" && !isRedirecting && lastRedirectPath !== "/complete-profile" && redirectingRef.current !== "/complete-profile") {
            // Set ref immediately to prevent race condition
            redirectingRef.current = "/complete-profile";
            setIsRedirecting(true);
            setLastRedirectPath("/complete-profile");
            localStorage.setItem("redirectAfterLogin", currentPathNow);
            // Use replace to avoid race condition and ensure immediate URL change
            window.location.hash = "#/complete-profile";
            // Don't return - continue processing as if we're on complete-profile page
          }
        }
      }

      // Handle redirect only for explicit sign-in events (not initial session)
      if (event === "SIGNED_IN") {
        // Only redirect if email is verified and profile is complete
        if (emailVerified && profileComplete) {
          // Check for redirect after login
          const redirectPath =
            localStorage.getItem("redirectAfterLogin") || "/my-account/teams";
          if (
            redirectPath &&
            redirectPath !== "/signup-confirmation" &&
            redirectPath !== "/complete-profile"
          ) {
            localStorage.removeItem("redirectAfterLogin");
            // Use setTimeout to ensure the state is fully updated before redirecting
            setTimeout(() => {
              window.location.hash = "#" + redirectPath;
            }, 100);
            return;
          }

          // Default redirect to teams page
          else {
            setTimeout(() => {
              window.location.hash = "#/my-account/teams";
            }, 100);
            return;
          }
        }
        // If email not verified or profile not complete, redirect already happened above
      }
    }

    // Only set loading to false after initial setup is complete
    if (initializing) {
      setInitializing(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        // Keep loading true until we've processed everything
        setLoading(true);

        const { data, error } = await supabase.auth.getSession();
        const session = data?.session;

        if (error) {
          console.error("Error getting session:", error);
          if (mounted) {
            setLoading(false);
            setInitializing(false);
          }
          return;
        }

        if (mounted) {
          // handleAuthStateChange will handle user profile creation and redirects
          await handleAuthStateChange("INITIAL_SESSION", session);
        }
      } catch (error) {
        console.error("Error in getInitialSession:", error);
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    getInitialSession();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted && !initializing) {
        await handleAuthStateChange(event, session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error.message);
        setLoading(false);
        return { error };
      }

      // Don't set loading to false here - let the auth state change handler do it
      // The redirect will happen in the auth state change handler

      // Force a state update to trigger UI refresh
      setUser(data.user);
      setSession(data.session);

      return { error: null };
    } catch (error) {
      console.error("Error in signIn:", error);
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // Store the current URL for redirect after login
      const currentPath = window.location.hash.replace("#", "") || "/";
      if (
        currentPath !== "/login" &&
        currentPath !== "/signup" &&
        currentPath !== "/google-signup-redirect"
      ) {
        localStorage.setItem("redirectAfterLogin", currentPath);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/#/signup-confirmation`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (data) {
        if (data.url) {
          // Redirect to Google OAuth page
          window.location.href = data.url;
        }
      }

      return { error };
    } catch (error) {
      console.error("Error in signInWithGoogle:", error);
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  // Legacy Google sign-in method (kept for backward compatibility)
  const _signInWithGoogle = async () => {
    try {
      setLoading(true);

      // Store the current URL for redirect after login
      const currentPath = window.location.hash.replace("#", "") || "/";
      if (
        currentPath !== "/login" &&
        currentPath !== "/signup" &&
        currentPath !== "/google-signup-redirect"
      ) {
        localStorage.setItem("redirectAfterLogin", currentPath);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Redirect to the Google signup redirect page to complete profile
          redirectTo: `${window.location.origin}/google-signup-redirect`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (data) {
        if (data.url) {
        }
      }

      return { error };
    } catch (error) {
      console.error("Error in signInWithGoogle:", error);
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Store the current URL for redirect after signup
      const currentPath = window.location.hash.replace("#", "") || "/";
      if (currentPath !== "/login" && currentPath !== "/signup") {
        localStorage.setItem("redirectAfterLogin", currentPath);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/my-account/profile`,
        },
      });

      return { user: data?.user || null, error };
    } catch (error) {
      console.error("Error in signUp:", error);
      return { user: null, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Set loading state
      setLoading(true);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }

      // Clear local storage items
      localStorage.removeItem("redirectAfterLogin");

      // Force page reload to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Error in signOut:", error);
      // Even if there's an error, clear the local state
      setSession(null);
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Don't render children until we've checked for an initial session
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
        <p className="mt-4 text-[#6F6F6F]">Initializing authentication...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userProfile,
        loading,
        profileComplete,
        emailVerified,
        isNewUser,
        setIsNewUser,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        checkProfileCompletion,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  // Log auth state when hook is used (helps with debugging)

  return context;
};
