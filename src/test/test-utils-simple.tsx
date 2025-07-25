import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../components/ui/toast';
import userEvent from '@testing-library/user-event';
import { supabase } from '../lib/supabase';

// Re-export everything
export * from '@testing-library/react';

// Override render
export function render(
  ui: ReactElement,
  {
    initialRoute = '/',
    ...renderOptions
  }: RenderOptions & { initialRoute?: string } = {}
) {
  // Set up default mocks
  const mockSupabase = supabase as any;
  
  // Default to no session
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  
  // Default auth state change
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { 
      subscription: { 
        unsubscribe: vi.fn() 
      } 
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  const user = userEvent.setup();

  return {
    user,
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Mock navigation
export const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

export const mockUserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  phone: '1234567890',
  skill_id: 1,
  is_admin: false,
  team_ids: [],
};