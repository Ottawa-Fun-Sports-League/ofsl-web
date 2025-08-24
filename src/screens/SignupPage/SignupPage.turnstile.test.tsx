import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { SignupPage } from './SignupPage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Define interfaces for mock types
interface TurnstileProps {
  onSuccess?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

interface WindowWithTurnstile {
  __turnstileCallbacks?: {
    onSuccess?: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
  };
}

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess, onError, onExpire }: TurnstileProps) => {
    // Store callbacks for testing
    (window as WindowWithTurnstile).__turnstileCallbacks = { onSuccess, onError, onExpire };
    return <div data-testid="turnstile-widget">Turnstile Widget</div>;
  }
}));

const mockAuthContext = {
  user: null,
  signInWithGoogle: vi.fn(),
  setIsNewUser: vi.fn(),
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  session: null,
  userProfile: null,
  profileComplete: false,
  emailVerified: false,
  isNewUser: false,
  createProfile: vi.fn(),
  setUserProfile: vi.fn(),
};

// Mock the AuthContext hook
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderSignupPage = () => {
  return render(
    <BrowserRouter>
      <SignupPage />
    </BrowserRouter>
  );
};

describe('SignupPage with Turnstile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key');
    // Mock useAuth to return our mock context
    vi.mocked(useAuth).mockReturnValue(mockAuthContext);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render Turnstile widget', () => {
    renderSignupPage();
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
  });

  it('should disable submit button when Turnstile token is not present', () => {
    renderSignupPage();
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button after Turnstile verification', async () => {
    renderSignupPage();
    
    // Initially disabled
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();

    // Simulate successful Turnstile verification
    const callbacks = (window as WindowWithTurnstile).__turnstileCallbacks;
    callbacks.onSuccess('test-token');

    // Wait for React to re-render
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('should show error and keep button disabled on Turnstile error', async () => {
    renderSignupPage();
    
    // Simulate Turnstile error
    const callbacks = (window as WindowWithTurnstile).__turnstileCallbacks;
    callbacks.onError();

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Security verification failed. Please try again.')).toBeInTheDocument();
    });
    
    // Button should remain disabled
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  it('should reset token and disable button on Turnstile expiry', async () => {
    renderSignupPage();
    
    // First verify successfully
    const callbacks = (window as WindowWithTurnstile).__turnstileCallbacks;
    callbacks.onSuccess('test-token');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    // Wait for button to be enabled
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    // Then expire the token
    callbacks.onExpire();
    
    // Wait for button to be disabled again
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show error when submitting without Turnstile token', async () => {
    renderSignupPage();
    
    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password \(minimum 12 characters\)/i), { target: { value: 'TestPassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'TestPassword123!' } });

    // Try to submit without Turnstile verification
    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please complete the security verification')).toBeInTheDocument();
    });
  });

  it('should include captcha token in signup request', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'test-id', email: 'test@example.com' },
        session: {}
      },
      error: null
    });
    
    vi.mocked(supabase.auth).signUp = mockSignUp;
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        error: null
      })
    } as { insert: () => { error: null } });
    vi.mocked(supabase.auth).getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'test-token' } }
    });

    // Mock fetch for edge function
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ processedCount: 0, teams: [] }),
      text: () => Promise.resolve('')
    });

    renderSignupPage();
    
    // Simulate Turnstile verification
    const callbacks = (window as WindowWithTurnstile).__turnstileCallbacks;
    callbacks.onSuccess('test-turnstile-token');

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password \(minimum 12 characters\)/i), { target: { value: 'TestPassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'TestPassword123!' } });

    // Submit form
    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Test User'
          },
          emailRedirectTo: `${window.location.origin}/#/complete-profile`,
          captchaToken: 'test-turnstile-token'
        }
      });
    });
  });
});