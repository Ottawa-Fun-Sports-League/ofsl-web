import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '../../test/test-utils-simple';
import { LoginPage } from './LoginPage';
import { useAuth } from '../../contexts/AuthContext';

// Mock the AuthContext instead of Supabase directly
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('LoginPage Simple Test', () => {
  const createMockAuthContext = (overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> => ({
    user: null,
    session: null,
    loading: false,
    profileComplete: false,
    userProfile: null,
    refreshUserProfile: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    checkProfileCompletion: vi.fn(),
    validateSession: vi.fn().mockResolvedValue(true),
    emailVerified: false,
    isNewUser: false,
    setIsNewUser: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock for useAuth
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext());
  });

  it('renders login form with all elements', async () => {
    render(<LoginPage />);
    
    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    // Remove Turnstile env var for this test to simplify
    const originalEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({
      signIn: mockSignIn,
    }));
    
    const { user } = render(<LoginPage />);
    
    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123', undefined);
    });
    
    // Restore env
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', originalEnv);
  });
});