import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  if (!profileComplete) return <div>Profile incomplete</div>;
  
  return <div>Profile complete</div>;
};

describe('AuthContext Basic Flow', () => {
  let mockLocationReplace: jest.Mock;
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  
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
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabase.auth.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
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
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Setup auth state change mock
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Simulate initial session
      setTimeout(() => {
        callback('INITIAL_SESSION', mockSession);
      }, 10);
      
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    // Mock RPC call
    mockSupabase.rpc.mockResolvedValue({
      data: mockIncompleteProfile,
      error: null,
    });

    // Mock profile fetch
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockIncompleteProfile,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
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

    
    // Wait for redirect to happen
    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith('/#/complete-profile');
    }, { timeout: 5000 });

  });
});