import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';
import { render } from '../../test/test-utils';
import { useAuth } from '../../contexts/AuthContext';

// Mock auth context to prevent loading state
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    profileComplete: false,
    userProfile: null,
    refreshUserProfile: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all elements', () => {
    render(<LoginPage />);
    
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    // Check HTML5 validation (browser will handle this)
    expect(emailInput).toHaveAttribute('type', 'email');
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
    } as ReturnType<typeof useAuth>);
    
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: 'Login' });
    await user.click(submitButton);
    
    // The form should not submit due to HTML5 validation
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profileComplete: false,
      userProfile: null,
      refreshUserProfile: vi.fn(),
      signIn: mockSignIn,
      signInWithGoogle: vi.fn(),
    } as ReturnType<typeof useAuth>);
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue({ 
      error: { message: 'Invalid credentials' } 
    });
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profileComplete: false,
      userProfile: null,
      refreshUserProfile: vi.fn(),
      signIn: mockSignIn,
      signInWithGoogle: vi.fn(),
    } as ReturnType<typeof useAuth>);
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('navigates to forgot password page', () => {
    render(<LoginPage />);
    
    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('navigates to signup page', () => {
    render(<LoginPage />);
    
    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('handles Google sign in', async () => {
    const user = userEvent.setup();
    const mockSignInWithGoogle = vi.fn().mockResolvedValue({ error: null });
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profileComplete: false,
      userProfile: null,
      refreshUserProfile: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: mockSignInWithGoogle,
    } as ReturnType<typeof useAuth>);
    
    render(<LoginPage />);
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);
    
    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profileComplete: false,
      userProfile: null,
      refreshUserProfile: vi.fn(),
      signIn: mockSignIn,
      signInWithGoogle: vi.fn(),
    } as ReturnType<typeof useAuth>);
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText('Logging in...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});