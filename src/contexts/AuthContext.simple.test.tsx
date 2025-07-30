import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

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
    })),
    rpc: vi.fn(),
  },
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: '/' })),
}));

// Test component
const TestComponent = () => {
  const { user, loading, profileComplete } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
      <p className="mt-4 text-[#6F6F6F]">Initializing authentication...</p>
    </div>
  );
  if (!user) return <div>Not authenticated</div>;
  if (!profileComplete) return <div>Profile incomplete</div>;
  
  return <div>Profile complete</div>;
};

describe('AuthContext Basic Flow', () => {
  let mockLocationReplace: Mock;
  let mockSupabase: typeof import('../lib/supabase').supabase;
  
  beforeEach(async () => {
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
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it('should show loading initially', () => {
    // Mock no session
    (mockSupabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (mockSupabase.auth.onAuthStateChange as Mock).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Initializing authentication...')).toBeInTheDocument();
  });

  it('should redirect to complete-profile for incomplete profile', async () => {
    
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

    // Mock incomplete profile
    const mockIncompleteProfile = {
      auth_id: 'test-user-id',
      email: 'test@example.com',
      name: '', // Missing
      phone: '', // Missing
      profile_completed: false,
      user_sports_skills: [], // Empty
    };

    // Setup session mock
    (mockSupabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Setup auth state change mock - no need for callback since getSession is called first
    (mockSupabase.auth.onAuthStateChange as Mock).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    // Mock RPC call for check_and_fix_user_profile_v4
    (mockSupabase.rpc as Mock).mockResolvedValue({
      error: null,
    });

    // Mock profile fetch
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockIncompleteProfile,
      error: null,
    });

    (mockSupabase.from as Mock).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    
    // Wait for redirect to happen by checking window.location.hash
    await waitFor(() => {
      expect(window.location.hash).toBe('#/complete-profile');
    }, { timeout: 3000 });

  });
});