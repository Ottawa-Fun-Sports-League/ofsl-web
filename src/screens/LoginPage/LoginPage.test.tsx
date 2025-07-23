import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';
import { render, mockNavigate } from '../../test/test-utils';
import { globalMockSupabase as mockSupabase } from '../../test/mocks/setup-supabase';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all elements', () => {
    render(<LoginPage />);
    
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };
    
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { 
        user: mockUser, 
        session: { 
          access_token: 'token',
          refresh_token: 'refresh',
          user: mockUser 
        } 
      },
      error: null,
    });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
    
    expect(screen.getByText(/logging in.../i)).toBeInTheDocument();
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
  });

  it('handles Google OAuth login', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    
    render(<LoginPage />);
    
    const googleButton = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(googleButton);
    
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/google-signup-redirect'),
        },
      });
    });
  });

  it('navigates to forgot password page', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const forgotPasswordLink = screen.getByText(/forgot password/i);
    await user.click(forgotPasswordLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('navigates to signup page', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const signupLink = screen.getByRole('link', { name: /sign up/i });
    await user.click(signupLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang to see loading state
    mockSupabase.auth.signInWithPassword.mockImplementationOnce(
      () => new Promise(() => {})
    );
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText(/logging in.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles redirect after login', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };
    
    // Simulate having a redirect path in storage
    localStorage.setItem('redirectAfterLogin', '/leagues/1');
    
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { 
        user: mockUser, 
        session: { 
          access_token: 'token',
          refresh_token: 'refresh',
          user: mockUser 
        } 
      },
      error: null,
    });
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(localStorage.getItem).toHaveBeenCalledWith('redirectAfterLogin');
    });
  });
});