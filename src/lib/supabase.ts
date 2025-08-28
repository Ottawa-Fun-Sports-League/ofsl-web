import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Get the Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true, 
    detectSessionInUrl: true, 
    flowType: 'pkce',
    debug: false
  }
});

// Set up auth state change handler for the global supabase instance
supabase.auth.onAuthStateChange((event, session) => {
  // Handle token refresh failures at the global level
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('Global: Token refresh failed, user will need to sign in again');
    
    // Store current path for redirect after login
    const currentPath = window.location.hash.replace("#", "") || "/";
    if (currentPath !== '/login' && currentPath !== '/signup') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    
    // Clear any stored data and redirect to login
    localStorage.removeItem('supabase.auth.token');
    window.location.hash = '#/login';
  }
  
  // Handle successful token refresh
  if (event === 'TOKEN_REFRESHED' && session) {
    // Token refresh successful - no action needed
  }
});