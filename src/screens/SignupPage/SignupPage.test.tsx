import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupPage, SignupConfirmation } from './index';
import { render } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';
import { useAuth } from '../../contexts/AuthContext';

// Mock auth context to prevent loading state
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    profileComplete: false,
    userProfile: null,
    refreshUserProfile: vi.fn(),
    signInWithGoogle: vi.fn(),
    setIsNewUser: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form with all elements', () => {
    render(<SignupPage />);
    
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password (minimum 12 characters)')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profileComplete: false,
      userProfile: null,
      refreshUserProfile: vi.fn(),
      signIn: mockSignIn,
      signInWithGoogle: vi.fn(),
      setIsNewUser: vi.fn(),
    } as any);
    
    render(<SignupPage />);
    
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitButton);
    
    // The form should not submit due to HTML5 validation
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'Password123!@#');
    await user.type(confirmPasswordInput, 'Password123!@#');
    await user.click(submitButton);
    
    // Check HTML5 validation
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    await user.click(submitButton);
    
    expect(await screen.findByText('Password must be at least 12 characters')).toBeInTheDocument();
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123!@#');
    await user.type(confirmPasswordInput, 'different123');
    await user.click(submitButton);
    
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('handles successful signup', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { 
        user: { 
          id: '123', 
          email: 'test@example.com' 
        },
        session: null
      },
      error: null,
    });
    
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123!@#');
    await user.type(confirmPasswordInput, 'Password123!@#');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!@#',
        options: {
          data: {
            full_name: 'Test User'
          },
          emailRedirectTo: 'http://localhost:3000/#/complete-profile'
        }
      });
    });
  });

  it('handles existing user error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Password123!@#');
    await user.type(confirmPasswordInput, 'Password123!@#');
    await user.click(submitButton);
    
    expect(await screen.findByText('An account with this email already exists. Please try logging in instead.')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const toggleButton = screen.getAllByRole('button', { name: /show password/i })[0];
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles confirm password visibility', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const toggleButton = screen.getAllByRole('button', { name: /show password/i })[1];
    
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  it('navigates to login page', () => {
    render(<SignupPage />);
    
    const loginLink = screen.getByRole('link', { name: /login/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('handles Google sign up', async () => {
    const user = userEvent.setup();
    const mockSignInWithGoogle = vi.fn().mockResolvedValue({ error: null });
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profileComplete: false,
      userProfile: null,
      refreshUserProfile: vi.fn(),
      signInWithGoogle: mockSignInWithGoogle,
      setIsNewUser: vi.fn(),
    } as any);
    
    render(<SignupPage />);
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);
    
    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    mockSupabase.auth.signUp.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<SignupPage />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password (minimum 12 characters)');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123!@#');
    await user.type(confirmPasswordInput, 'Password123!@#');
    await user.click(submitButton);
    
    expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});

describe('SignupConfirmation', () => {
  it('displays confirmation message', () => {
    render(<SignupConfirmation />);
    
    expect(screen.getByRole('heading', { name: /account created successfully/i })).toBeInTheDocument();
    expect(screen.getByText(/sent a verification email/i)).toBeInTheDocument();
    expect(screen.getByText('your email address')).toBeInTheDocument();
  });


  it('has button to return to home', () => {
    render(<SignupConfirmation />);
    
    const homeButton = screen.getByRole('button', { name: /back to home/i });
    expect(homeButton).toBeInTheDocument();
  });
});