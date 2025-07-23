import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
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
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: '/' })),
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, profileComplete } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  // Don't render anything special for incomplete profile - let AuthContext handle redirect
  
  return <div>Profile {profileComplete ? 'complete' : 'incomplete'}</div>;
};

describe('AuthContext Profile Completion Redirect', () => {
  let mockLocationReplace: jest.Mock;
  let mockSupabase: any;
  
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get the mocked supabase
    const { supabase } = await import('../lib/supabase');
    mockSupabase = supabase;
    
    // Mock window.location.replace
    mockLocationReplace = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/',
        hash: '#/',
        replace: mockLocationReplace,
        reload: vi.fn(),
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
      },
      writable: true,
    });
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should redirect to /complete-profile when user has incomplete profile', async () => {
    // Mock authenticated user with incomplete profile
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      user: mockUser,
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
    };

    // Mock incomplete profile from database
    const mockIncompleteProfile = {
      auth_id: 'test-user-id',
      email: 'test@example.com',
      name: '', // Missing name
      phone: '', // Missing phone
      profile_completed: false,
      user_sports_skills: [], // Empty skills
    };

    // Setup Supabase mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Simulate auth state change
      setTimeout(() => {
        callback('INITIAL_SESSION', mockSession);
      }, 0);
      
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    // Mock RPC call for profile creation
    mockSupabase.rpc.mockResolvedValue({
      data: mockIncompleteProfile,
      error: null,
    });

    // Mock profile fetch
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIncompleteProfile,
            error: null,
          }),
        }),
      }),
    });

    // Render the component
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for auth state to be processed
    await waitFor(() => {
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    // Wait for profile completion check and redirect
    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith('/#/complete-profile');
    }, { timeout: 2000 });

    // Verify localStorage was set for redirect
    expect(localStorage.setItem).toHaveBeenCalledWith('redirectAfterLogin', '/');
  });

  it('should redirect to /complete-profile when user has no profile', async () => {
    // Mock authenticated user
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      user: mockUser,
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
    };

    // Setup Supabase mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => {
        callback('INITIAL_SESSION', mockSession);
      }, 0);
      
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    // Mock RPC call returning null (no profile)
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: null,
    });

    // Mock profile fetch returning null
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // No profile found
          }),
        }),
      }),
    });

    // Render the component
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for auth state to be processed
    await waitFor(() => {
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    // Wait for redirect to complete-profile
    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith('/#/complete-profile');
    }, { timeout: 2000 });
  });

  it('should not redirect when user has complete profile', async () => {
    // Mock authenticated user with complete profile
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      user: mockUser,
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
    };

    // Mock complete profile from database
    const mockCompleteProfile = {
      auth_id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      phone: '123-456-7890',
      profile_completed: true,
      user_sports_skills: [
        { sport: 'volleyball', skill_level: 'intermediate' }
      ],
    };

    // Setup Supabase mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => {
        callback('INITIAL_SESSION', mockSession);
      }, 0);
      
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    // Mock RPC call for profile creation
    mockSupabase.rpc.mockResolvedValue({
      data: mockCompleteProfile,
      error: null,
    });

    // Mock profile fetch
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCompleteProfile,
            error: null,
          }),
        }),
      }),
    });

    // Render the component
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for auth state to be processed
    await waitFor(() => {
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    // Wait a bit to ensure no redirect happens
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify no redirect happened
    expect(mockLocationReplace).not.toHaveBeenCalledWith('/#/complete-profile');
    
    // Verify the user is authenticated and profile is complete
    await waitFor(() => {
      expect(screen.getByText('Profile complete')).toBeInTheDocument();
    });
  });
});