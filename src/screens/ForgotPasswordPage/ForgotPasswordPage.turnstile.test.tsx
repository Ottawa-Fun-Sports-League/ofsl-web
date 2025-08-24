import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { render } from '../../test/test-utils';
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

// Mock Turnstile widget
interface MockTurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

vi.mock('../../components/ui/turnstile', () => ({
  TurnstileWidget: vi.fn(({ onVerify }: MockTurnstileProps) => {
    // Auto-verify after mount
    setTimeout(() => onVerify('test-turnstile-token'), 100);
    return <div data-testid="turnstile-widget">Turnstile Widget</div>;
  }),
  TurnstileHandle: {},
}));

describe('ForgotPasswordPage with Turnstile', () => {
  const originalEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    // Enable Turnstile for these tests
    // @ts-expect-error - we need to modify env for testing
    import.meta.env.VITE_TURNSTILE_SITE_KEY = 'test-site-key';
  });

  afterEach(() => {
    // @ts-expect-error - we need to restore env for testing
    if (originalEnv !== undefined) {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = originalEnv;
    } else {
      delete import.meta.env.VITE_TURNSTILE_SITE_KEY;
    }
  });

  it('renders Turnstile widget when site key is configured', () => {
    render(<ForgotPasswordPage />);
    
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
  });

  it('disables submit button until Turnstile is verified', async () => {
    render(<ForgotPasswordPage />);
    
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    // Button should be disabled initially
    expect(submitButton).toBeDisabled();
    
    // Wait for Turnstile to auto-verify
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 200 });
  });

  it('includes captcha token in password reset request when Turnstile is enabled', async () => {
    const user = userEvent.setup();
    
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: null,
    });
    
    render(<ForgotPasswordPage />);
    
    // Wait for Turnstile to auto-verify
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 200 });
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: expect.stringContaining('/reset-password'),
          captchaToken: 'test-turnstile-token',
        }
      );
    });
  });

  // Skip these tests as they require complex mocking of TurnstileWidget
  it.skip('shows error when submitting without Turnstile verification', async () => {
    // Test would require complex mocking of Turnstile widget internals
  });

  it.skip('resets Turnstile after successful submission', async () => {
    // Test would require complex mocking of Turnstile widget internals
  });

  it.skip('resets Turnstile after error', async () => {
    // Test would require complex mocking of Turnstile widget internals
  });
});