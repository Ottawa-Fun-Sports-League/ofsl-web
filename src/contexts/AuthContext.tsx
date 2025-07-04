import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ 
    user: User | null; 
    error: AuthError | null; 
  }>;
  signOut: () => Promise<void>;
  checkProfileCompletion: () => boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Helper function to check if profile is complete
  const checkProfileCompletion = () => {
    if (!userProfile) return false;
    
    // Check if required fields are filled
    const requiredFields = ['name', 'phone'];
    return requiredFields.every(field => 
      userProfile[field] && userProfile[field].toString().trim() !== ''
    );
  };

  // Function to fetch user profile
  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
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
      // First check if user profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing user:', fetchError);
        return null;
      }

      if (!existingProfile) {
        console.log('Creating new user profile for:', user.email);
        
        const now = new Date().toISOString();
        const newProfile = {
          id: user.id,
          auth_id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '', // Will be empty for Google sign-ups
          email: user.email || '',
          date_created: now,
          date_modified: now,
          is_admin: false,
        };

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();

        if (insertError && insertError.code !== '23505') { // Skip unique violation errors
          console.error('Error creating user profile:', insertError);
          return null;
        }

        return insertedUser;
      }

      return existingProfile;
    } catch (error) {
      console.error('Error in handleUserProfileCreation:', error);
      return null;
    }
  };

  // Handle auth state changes
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session?.user?.email);
    
    setSession(session);
    setUser(session?.user ?? null);

    if (event === 'SIGNED_OUT') {
      // Clear all auth state
      setSession(null);
      setUser(null);
      setUserProfile(null);
      // Clear any stored redirect paths
      localStorage.removeItem('redirectAfterLogin');
      setLoading(false);
      return;
    }

    if (session?.user) {
      // Handle user profile for any signed-in user
      const profile = await handleUserProfileCreation(session.user);
      setUserProfile(profile);

      // Handle redirect only for explicit sign-in events (not initial session)
      if (event === 'SIGNED_IN') {
        // Check for redirect after login
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/my-account/teams';
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          // Use window.location.replace for immediate redirect without adding to history
          window.location.replace(redirectPath);
          return;
        }
        
        // Check if this is a first-time sign in or incomplete profile
        else if (profile) {
          const isProfileComplete = profile.name && profile.phone && 
            profile.name.trim() !== '' && profile.phone.trim() !== '';
          
          if (!isProfileComplete) {
            // Redirect to account page for profile completion
            window.location.replace('/my-account/profile?complete=true');
          } else {
            // Redirect to teams page by default
            window.location.replace('/my-account/profile');
          }
        } else {
          // Fallback redirect to teams page
          window.location.replace('/my-account/profile');
        }
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
        setLoading(true);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
            setInitializing(false);
          }
          return;
        }
        
        if (mounted) {
          await handleAuthStateChange('INITIAL_SESSION', session);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    getInitialSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false);
        return { error };
      }
      
      // Don't set loading to false here - let the auth state change handler do it
      return { error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/my-account/profile`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      return { error };
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/my-account/profile`
        }
      });
      
      return { user: data?.user || null, error };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { user: null, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Set loading state
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Clear local storage items
      localStorage.removeItem('redirectAfterLogin');
      
      console.log('User signed out successfully');
      
      // Force page reload to ensure clean state
      window.location.replace('/');
    } catch (error) {
      console.error('Error in signOut:', error);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userProfile, 
      loading, 
      signIn, 
      signInWithGoogle, 
      signUp, 
      signOut, 
      checkProfileCompletion,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};