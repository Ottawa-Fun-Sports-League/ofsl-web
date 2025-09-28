import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';
import type { Session } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        hash: '#/',
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
      },
      writable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    
    // Mock getSession to return null initially (no user logged in)
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.refreshSession>>);

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  });

  describe('checkProfileCompletion', () => {
    it('should return false when no profile is provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.checkProfileCompletion()).toBe(false);
    });

    it('should return false when profile is incomplete', async () => {
      const incompleteProfile: UserProfile = {
        id: 'test-user-id',
        auth_id: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '',
        skill_id: null,
        is_admin: false,
        team_ids: null,
        profile_completed: false,
        user_sports_skills: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.checkProfileCompletion(incompleteProfile)).toBe(false);
    });

    it('should return true when profile is complete', async () => {
      const completeProfile: UserProfile = {
        id: 'test-user-id',
        auth_id: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User',
        phone: '123-456-7890',
        skill_id: 2,
        is_admin: false,
        team_ids: null,
        profile_completed: true,
        user_sports_skills: [{
          id: 1,
          user_id: 'test-user-id',
          sport_id: 1,
          skill_id: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.checkProfileCompletion(completeProfile)).toBe(true);
    });

    it('should always return a boolean value', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Test with various inputs to ensure boolean return
      expect(typeof result.current.checkProfileCompletion()).toBe('boolean');
      expect(typeof result.current.checkProfileCompletion(null)).toBe('boolean');
      expect(typeof result.current.checkProfileCompletion(undefined)).toBe('boolean');
    });
  });

  describe('signInWithGoogle', () => {
    it('should call supabase signInWithOAuth with correct parameters', async () => {
      const mockSignInWithOAuth = vi.fn().mockResolvedValue({
        data: { url: 'https://google.com/oauth' },
        error: null,
      });
      vi.mocked(supabase.auth.signInWithOAuth).mockImplementation(mockSignInWithOAuth);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/#/signup-confirmation',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });
  });

  describe('validateSession', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    it('redirects to login when no active session is found', async () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      window.location.hash = '#/my-account/teams';

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      let outcome: boolean | undefined;
      await act(async () => {
        outcome = await result.current.validateSession();
      });

      expect(outcome).toBe(false);
      expect(window.location.hash).toBe('#/login');
      expect(setItemSpy).toHaveBeenCalledWith('redirectAfterLogin', '/my-account/teams');
    });

    it('redirects to login when user lookup fails', async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const mockSession = {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_at: futureExpiry,
        token_type: 'bearer',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
          app_metadata: {},
        },
      } as unknown as Session;

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Token expired' },
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      let outcome: boolean | undefined;
      await act(async () => {
        outcome = await result.current.validateSession();
      });

      expect(outcome).toBe(false);
      expect(window.location.hash).toBe('#/login');
    });
  });
});
