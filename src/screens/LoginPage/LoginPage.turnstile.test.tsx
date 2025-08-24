import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '../../contexts/AuthContext';
import { MockWindow } from '../../types/test-mocks';

// Mock dependencies
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess, onError, onExpire }: { onSuccess: (token: string) => void; onError: (error: string) => void; onExpire: () => void }) => {
    // Store callbacks for testing
    (window as MockWindow).__turnstileCallbacks = { onSuccess, onError, onExpire };
    return <div data-testid="turnstile-widget">Turnstile Widget</div>;
  }
}));

const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();

const mockAuthContext = {
  user: null,
  signInWithGoogle: mockSignInWithGoogle,
  setIsNewUser: vi.fn(),
  loading: false,
  signIn: mockSignIn,
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

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage with Turnstile', () => {
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
    renderLoginPage();
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
  });

  it('should disable submit button when Turnstile token is not present', () => {
    renderLoginPage();
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button after Turnstile verification', async () => {
    renderLoginPage();
    
    // Initially disabled
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    expect(submitButton).toBeDisabled();

    // Simulate successful Turnstile verification
    const callbacks = (window as MockWindow).__turnstileCallbacks;
    callbacks.onSuccess('test-token');

    // Wait for React to re-render
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('should show error and keep button disabled on Turnstile error', async () => {
    renderLoginPage();
    
    // Simulate Turnstile error
    const callbacks = (window as MockWindow).__turnstileCallbacks;
    callbacks.onError();

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Security verification failed. Please try again.')).toBeInTheDocument();
    });
    
    // Button should remain disabled
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    expect(submitButton).toBeDisabled();
  });

  it('should reset token and disable button on Turnstile expiry', async () => {
    renderLoginPage();
    
    // First verify successfully
    const callbacks = (window as MockWindow).__turnstileCallbacks;
    callbacks.onSuccess('test-token');
    
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    
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
    renderLoginPage();
    
    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'TestPassword123!' } });

    // Try to submit without Turnstile verification
    const form = screen.getByRole('button', { name: /^login$/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please complete the security verification')).toBeInTheDocument();
    });
  });

  it('should include captcha token in login request', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    renderLoginPage();
    
    // Simulate Turnstile verification
    const callbacks = (window as MockWindow).__turnstileCallbacks;
    callbacks.onSuccess('test-turnstile-token');

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'TestPassword123!' } });

    // Submit form
    const form = screen.getByRole('button', { name: /^login$/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'TestPassword123!', 'test-turnstile-token');
    });
  });

  it('should handle login error with Turnstile token', async () => {
    const errorMessage = 'Invalid email or password';
    mockSignIn.mockResolvedValue({ error: { message: errorMessage } });

    renderLoginPage();
    
    // Simulate Turnstile verification
    const callbacks = (window as MockWindow).__turnstileCallbacks;
    callbacks.onSuccess('test-turnstile-token');

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'WrongPassword' } });

    // Submit form
    const form = screen.getByRole('button', { name: /^login$/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});