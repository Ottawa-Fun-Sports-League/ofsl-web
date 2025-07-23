import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupPage, SignupConfirmation } from './index';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form with all elements', () => {
    render(<SignupPage />);
    
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(passwordInput, 'short');
    await user.click(submitButton);
    
    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');
    await user.click(submitButton);
    
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('handles successful signup', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-user-id',
      email: 'newuser@example.com',
    };
    
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { 
        user: mockUser, 
        session: null // Email confirmation required
      },
      error: null,
    });
    
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      });
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/signup-confirmation');
  });

  it('handles signup error - user already exists', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });
    
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);
    
    expect(await screen.findByText(/user already registered/i)).toBeInTheDocument();
  });

  it('handles Google OAuth signup', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    
    render(<SignupPage />);
    
    const googleButton = screen.getByRole('button', { name: /sign up with google/i });
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

  it('navigates to login page', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const loginLink = screen.getByRole('link', { name: /sign in/i });
    await user.click(loginLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows loading state during signup', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang to see loading state
    mockSupabase.auth.signUp.mockImplementationOnce(
      () => new Promise(() => {})
    );
    
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText(/creating account.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});

describe('SignupConfirmation', () => {
  it('renders confirmation message', () => {
    render(<SignupConfirmation />);
    
    expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/we've sent a confirmation email/i)).toBeInTheDocument();
    expect(screen.getByText(/please check your email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
  });

  it('navigates back to login', async () => {
    const user = userEvent.setup();
    render(<SignupConfirmation />);
    
    const loginLink = screen.getByRole('link', { name: /back to sign in/i });
    await user.click(loginLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});