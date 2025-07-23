import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordPage } from './ResetPasswordPage';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for token parsing
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '?token=reset-token-123',
        hash: '#/reset-password?token=reset-token-123',
      },
      writable: true,
    });
  });

  it('renders reset password form with all elements', () => {
    render(<ResetPasswordPage />);
    
    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    expect(screen.getByText(/enter your new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows error when no token is present', () => {
    // Remove token from URL
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '',
        hash: '#/reset-password',
      },
      writable: true,
    });
    
    render(<ResetPasswordPage />);
    
    expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText(/new password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'short');
    await user.click(submitButton);
    
    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');
    await user.click(submitButton);
    
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('handles successful password reset', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
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
    expect(screen.getByText(/your password has been reset/i)).toBeInTheDocument();
    
    // Should navigate to login after a delay
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 3000 });
  });

  it('handles password reset error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token expired' },
    });
    
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    expect(await screen.findByText(/token expired/i)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang to see loading state
    mockSupabase.auth.updateUser.mockImplementationOnce(
      () => new Promise(() => {})
    );
    
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    expect(screen.getByText(/resetting password.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('extracts token from hash fragment in HashRouter', () => {
    // Simulate HashRouter URL structure
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '',
        hash: '#/reset-password?token=hash-token-123&type=recovery',
      },
      writable: true,
    });
    
    render(<ResetPasswordPage />);
    
    // Should render form normally with token present
    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    expect(screen.queryByText(/invalid or missing reset token/i)).not.toBeInTheDocument();
  });

  it('prevents form resubmission after success', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    
    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
    });
    
    // Form should be hidden after success
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });
});