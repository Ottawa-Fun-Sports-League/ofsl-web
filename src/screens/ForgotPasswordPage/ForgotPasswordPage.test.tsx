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
    
    // HTML5 validation prevents form submission for invalid email
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('validates required email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    // Clear the field to ensure it's empty
    await user.clear(emailInput);
    await user.click(submitButton);
    
    // HTML5 validation prevents submission, but we can check the required attribute
    expect(emailInput).toHaveAttribute('required');
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
    
    expect(await screen.findByText('Password reset instructions have been sent to your email')).toBeInTheDocument();
    expect(screen.getByText(/Please check your email inbox/i)).toBeInTheDocument();
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
    
    expect(await screen.findByText('Failed to send password reset email')).toBeInTheDocument();
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

  it('navigates back to login page', () => {
    render(<ForgotPasswordPage />);
    
    const backLink = screen.getByRole('link', { name: /back to login/i });
    expect(backLink).toHaveAttribute('href', '/login');
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
    
    // Form should still be visible after success
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
    // But email field should be cleared
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
  });
});