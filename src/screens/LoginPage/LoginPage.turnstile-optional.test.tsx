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

describe('LoginPage with optional Turnstile', () => {
  const createMockAuthContext = (overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> => ({
    user: null,
    session: null,
    loading: false,
    profileComplete: false,
    userProfile: null,
    refreshUserProfile: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
    setUserProfile: vi.fn(),
    checkProfileCompletion: vi.fn(),
    setIsNewUser: vi.fn(),
    isNewUser: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows login when Turnstile is not configured', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({
      signIn: mockSignIn,
    }));
    
    // Mock environment without Turnstile key
    const originalKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    delete import.meta.env.VITE_TURNSTILE_SITE_KEY;
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    // Submit button should be enabled even without Turnstile
    expect(submitButton).not.toBeDisabled();
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      // Should be called with undefined as third parameter when Turnstile is not configured
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123', undefined);
    });
    
    // Restore environment
    if (originalKey) {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = originalKey;
    }
  });

  it('requires Turnstile when configured', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    
    vi.mocked(useAuth).mockReturnValue(createMockAuthContext({
      signIn: mockSignIn,
    }));
    
    // Mock environment with Turnstile key
    import.meta.env.VITE_TURNSTILE_SITE_KEY = 'test-key';
    
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    // Submit button should be disabled until Turnstile is completed
    expect(submitButton).toBeDisabled();
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    // Button should still be disabled without Turnstile verification
    expect(submitButton).toBeDisabled();
    
    // Restore environment
    delete import.meta.env.VITE_TURNSTILE_SITE_KEY;
  });
});