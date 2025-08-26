import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import userEvent from '@testing-library/user-event';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types/auth';
import { globalMockSupabase } from './mocks/setup-supabase';

// Mock data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: '',
  created_at: '',
};

export const mockAdminUser = {
  ...mockUser,
  id: 'admin-user-id',
  email: 'admin@example.com',
};

export const mockUserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  phone: '1234567890',
  skill_id: 1,
  is_admin: false,
  team_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockAdminProfile = {
  ...mockUserProfile,
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  is_admin: true,
};

export const mockLeague = {
  id: 1,
  name: 'Test League',
  sport_id: 1,
  location: 'Test Location',
  cost: 100,
  description: 'Test Description',
  start_date: '2024-01-01',
  end_date: '2024-03-01',
  registration_deadline: '2023-12-15',
  max_teams: 10,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockTeam = {
  id: 1,
  name: 'Test Team',
  captain_id: 'test-user-id',
  league_id: 1,
  roster: ['test-user-id'],
  skill_level_id: 1,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Enhanced Supabase mock
export const createMockSupabase = (overrides = {}) => {
  const supabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn((_table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    ...overrides,
  };

  return supabase;
};

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  user?: User | null;
  userProfile?: UserProfile | null;
}

// Simple mock ToastProvider component for tests
const MockToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="toast-provider">{children}</div>;
};

const AllTheProviders = ({ 
  children, 
  initialRoute = '/',
}: { 
  children: React.ReactNode;
  initialRoute?: string;
}) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <MockToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        </AuthProvider>
      </MockToastProvider>
    </MemoryRouter>
  );
};

export const customRender = (
  ui: ReactElement,
  {
    initialRoute = '/',
    user = null,
    userProfile = null,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  // Use the imported global mock
  const mockSupabase = globalMockSupabase;
  
  // Clear any existing mocks
  vi.clearAllMocks();
  
  // Always mock getSession to prevent loading state
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { 
      session: user ? { 
        user, 
        access_token: 'mock-token', 
        refresh_token: 'mock-refresh' 
      } : null 
    },
    error: null,
  });
  
  if (user) {
    // Mock user profile fetch
    const userProfileResult = Promise.resolve({
      data: userProfile || mockUserProfile,
      error: null,
    });
    mockSupabase.from('users').select.mockReturnThis();
    mockSupabase.from('users').eq.mockReturnThis();
    // @ts-expect-error - Mock type mismatch after enhanced type safety
    mockSupabase.from('users').single.mockReturnValue(userProfileResult);
  } else {
    // Mock no user profile
    const noUserResult = Promise.resolve({
      data: null,
      error: { code: 'PGRST116', message: 'User not found' },
    });
    mockSupabase.from('users').select.mockReturnThis();
    mockSupabase.from('users').eq.mockReturnThis();
    mockSupabase.from('users').single.mockReturnValue(noUserResult as never);
  }

  // Mock auth state change subscription
  mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
    // Immediately call the callback with the current auth state
    if (callback) {
      // Use setTimeout to ensure this runs after component mount
      setTimeout(() => {
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
      }, 0);
    }
    return {
      data: { 
        subscription: { 
          unsubscribe: vi.fn() 
        } 
      },
    };
  });

  const userEventInstance = userEvent.setup();

  return {
    user: userEventInstance,
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllTheProviders initialRoute={initialRoute}>
          {children}
        </AllTheProviders>
      ),
      ...renderOptions,
    }),
  };
};

// Re-export everything from RTL
export * from '@testing-library/react';

// Override render with our custom render
export { customRender as render };

// Utility to wait for loading states to resolve
export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import('@testing-library/react');
  const { expect } = await import('vitest');
  await waitFor(() => {
    const loaders = document.querySelectorAll('[class*="animate-spin"]');
    expect(loaders.length).toBe(0);
  });
};

// Utility to wait for auth to initialize
export const waitForAuthToLoad = async () => {
  const { waitFor } = await import('@testing-library/react');
  
  await waitFor(
    () => {
      const authLoading = document.querySelector('[aria-label="Loading"]');
      const initText = document.body.textContent?.includes('Initializing authentication');
      return !authLoading && !initText;
    },
    { timeout: 5000 }
  );
};

// Mock Stripe
export const mockStripe = {
  elements: vi.fn(() => ({
    create: vi.fn(() => ({
      mount: vi.fn(),
      unmount: vi.fn(),
      on: vi.fn(),
      update: vi.fn(),
    })),
  })),
  createPaymentMethod: vi.fn(),
  confirmCardPayment: vi.fn(),
  redirectToCheckout: vi.fn(),
};

export const mockLoadStripe = vi.fn(() => Promise.resolve(mockStripe));

// Common test scenarios
export const loginAs = async (email: string, password: string) => {
  const { screen } = await import('@testing-library/react');
  const user = userEvent.setup();
  const emailInput = await screen.findByLabelText(/email/i);
  const passwordInput = await screen.findByLabelText(/password/i);
  const submitButton = await screen.findByRole('button', { name: /sign in/i });

  await user.type(emailInput, email);
  await user.type(passwordInput, password);
  await user.click(submitButton);
};

// Mock navigation
export const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Clean up function for tests
export const cleanupMocks = () => {
  vi.clearAllMocks();
  mockNavigate.mockClear();
  localStorage.clear();
  sessionStorage.clear();
};