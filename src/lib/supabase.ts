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

// Set up auth state change handler
supabase.auth.onAuthStateChange((event, session) => {
  // Only keep critical warnings
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('Token refresh failed, user will need to sign in again');
  }
});