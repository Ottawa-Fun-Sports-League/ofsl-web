import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { render, mockNavigate } from '../../test/test-utils';
import { supabase } from '../../lib/supabase';

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    profileComplete: false,
    userProfile: null,
    refreshUserProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form with all elements', () => {
    render(<ForgotPasswordPage />);
    
    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('validates required email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('handles successful password reset request', async () => {
    const user = userEvent.setup();
    
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: null,
    });
    
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: expect.stringContaining('/reset-password'),
        }
      );
    });
    
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/we've sent a password reset link/i)).toBeInTheDocument();
  });

  it('handles error when email not found', async () => {
    const user = userEvent.setup();
    
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: { message: 'User not found' },
    });
    
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    await user.type(emailInput, 'nonexistent@example.com');
    await user.click(submitButton);
    
    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang to see loading state
    vi.mocked(supabase.auth.resetPasswordForEmail).mockImplementationOnce(
      () => new Promise(() => {})
    );
    
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    expect(screen.getByText(/sending.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('navigates back to login page', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    
    const backLink = screen.getByRole('link', { name: /back to login/i });
    await user.click(backLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('prevents form resubmission after success', async () => {
    const user = userEvent.setup();
    
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: null,
    });
    
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    
    // Form should be hidden after success
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send reset instructions/i })).not.toBeInTheDocument();
  });
});