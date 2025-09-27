import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Get the Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const isBrowser = typeof window !== 'undefined';
let redirectingForUnauthorized = false;

const getCurrentPath = () => {
  if (!isBrowser) return '/';
  const hashPath = window.location.hash ? window.location.hash.replace('#', '') : '';
  if (hashPath) return hashPath;
  const { pathname, search } = window.location;
  return `${pathname || ''}${search || ''}` || '/';
};

const redirectToLogin = (reason: string) => {
  if (!isBrowser || redirectingForUnauthorized) {
    return;
  }

  redirectingForUnauthorized = true;

  try {
    const currentPath = getCurrentPath();
    if (currentPath && currentPath !== '/login' && currentPath !== '/signup') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    localStorage.removeItem('supabase.auth.token');
  } catch (error) {
    console.warn('Failed to persist redirect path during unauthorized redirect', error);
  }

  console.warn(`Unauthorized Supabase response detected (${reason}). Redirecting to login.`);

  // Delay to ensure any pending promise handlers settle before navigation
  setTimeout(() => {
    window.location.hash = '#/login';
    redirectingForUnauthorized = false;
  }, 0);
};

const nativeFetch = typeof fetch === 'function' ? fetch.bind(globalThis) : null;

const supabaseFetch = nativeFetch
  ? (async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await nativeFetch(input, init);

      if (!response.ok && (response.status === 401 || response.status === 403)) {
        redirectToLogin(`http-${response.status}`);
      }

      return response;
    })
  : undefined;

const clientOptions: Parameters<typeof createClient>[2] = {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false,
  },
};

if (supabaseFetch) {
  clientOptions.global = {
    fetch: supabaseFetch,
  };
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, clientOptions);

// Set up auth state change handler for the global supabase instance
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    redirectToLogin('token-refresh-failed');
  }
});
