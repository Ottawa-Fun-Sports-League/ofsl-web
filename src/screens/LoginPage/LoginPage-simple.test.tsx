import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '../../test/test-utils-simple';
import { LoginPage } from './LoginPage';
import { supabase } from '../../lib/supabase';

// Get the mocked supabase
const mockSupabase = supabase as typeof supabase & {
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
  };
};

describe('LoginPage Simple Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset default mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('renders login form with all elements', async () => {
    render(<LoginPage />);
    
    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const { user } = render(<LoginPage />);
    
    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });
    
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
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /^login$/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});