import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordPage } from './ResetPasswordPage';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

// Mock the auth context to prevent loading state
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    loading: false,
    profileComplete: false,
    emailVerified: false,
    isNewUser: false,
    setIsNewUser: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    checkProfileCompletion: vi.fn(),
    refreshUserProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for token parsing
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '?type=recovery&access_token=valid-token',
        hash: '#/reset-password?type=recovery&access_token=valid-token',
      },
      writable: true,
    });
    
    // Mock auth.getSession to return a valid session for password reset
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { 
        session: {
          access_token: 'valid-token',
          refresh_token: 'refresh-token',
          user: { id: 'test-user-id' },
        }
      },
      error: null,
    });
    
    // Mock auth state change
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      if (callback) {
        callback('INITIAL_SESSION', null);
      }
      return {
        data: { 
          subscription: { 
            unsubscribe: vi.fn() 
          } 
        },
      };
    });
  });

  it('renders reset password form with all elements', async () => {
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByText(/enter your new password below to reset/i)).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows error when no token is present', async () => {
    // Remove token from URL and session
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '',
        hash: '#/reset-password',
      },
      writable: true,
    });
    
    // Mock no session for this test
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/invalid or expired password reset link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request new reset link/i })).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    const passwordInput = screen.getByLabelText('New Password');
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'short');
    await user.click(submitButton);
    
    expect(await screen.findByText(/password must be at least 12 characters/i)).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    const passwordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');
    await user.click(submitButton);
    
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it.skip('handles successful password reset', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    const passwordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });
    
    expect(await screen.findByText(/password reset successful/i)).toBeInTheDocument();
    // Should show success message
    expect(screen.getByText(/your password has been reset successfully/i)).toBeInTheDocument();
    
    // Should navigate to login after a delay
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: {
          message: 'Your password has been reset successfully. You can now log in with your new password.'
        }
      });
    }, { timeout: 3500 });
  });

  it.skip('handles password reset error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token expired' },
    });
    
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    const passwordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    // The error should appear in the form
    await waitFor(() => {
      // Check for error message - it might show as a form error or in the component
      const errorElement = screen.getByText('Token expired');
      expect(errorElement).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang to see loading state
    mockSupabase.auth.updateUser.mockImplementationOnce(
      () => new Promise(() => {})
    );
    
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    const passwordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    expect(screen.getByText(/resetting password.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('extracts token from hash fragment in HashRouter', async () => {
    // Simulate HashRouter URL structure
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '',
        hash: '#/reset-password?access_token=hash-token-123&type=recovery',
      },
      writable: true,
    });
    
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    // Should render form normally with token present
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.queryByText(/invalid or missing reset token/i)).not.toBeInTheDocument();
  });

  it('prevents form resubmission after success', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    
    render(<ResetPasswordPage />);
    
    // Wait for token validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating reset link/i)).not.toBeInTheDocument();
    });
    
    const passwordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
    });
    
    // Form should be hidden after success
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });
});