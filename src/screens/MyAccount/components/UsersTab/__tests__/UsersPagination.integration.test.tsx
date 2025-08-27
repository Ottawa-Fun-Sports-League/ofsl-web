import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UsersTab } from '../UsersTab';
import { supabase } from '../../../../../lib/supabase';

// Mock Supabase
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock AuthContext
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-user-id' },
    userProfile: { 
      id: 'admin-user-id', 
      is_admin: true,
      name: 'Admin User',
      email: 'admin@test.com'
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    loading: false,
    setUserProfile: vi.fn(),
    setIsNewUser: vi.fn(),
    isNewUser: false,
    checkProfileCompletion: vi.fn(),
    refreshUserProfile: vi.fn()
  })
}));

// Mock toast context
vi.mock('../../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock paginated user data
const createMockUsers = (page: number, pageSize: number, totalCount: number) => {
  const users = [];
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  
  for (let i = startIdx; i < endIdx; i++) {
    users.push({
      profile_id: `user-${i + 1}`,
      auth_id: `auth-${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      phone: `555-000-${String(i + 1).padStart(4, '0')}`,
      is_admin: false,
      is_facilitator: false,
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      team_ids: [],
      league_ids: [],
      user_sports_skills: [],
      status: 'active',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      auth_created_at: new Date().toISOString(),
      total_count: totalCount,
      total_owed: 0,
      total_paid: 0,
      current_registrations: '[]'
    });
  }
  return users;
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('UsersTab Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock admin check
    (supabase.from as Mock).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { is_admin: true },
            error: null
          })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        from: vi.fn()
      };
    });
    
    // Mock paginated RPC call
    (supabase.rpc as Mock).mockResolvedValue({
      data: createMockUsers(1, 50, 150), // Page 1 of 3 pages
      error: null
    });
  });

  it('should display pagination controls for paginated data', async () => {
    render(
      <TestWrapper>
        <UsersTab />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Check pagination info is displayed
    expect(screen.getByText(/Showing 1 to 50 of 150 users/)).toBeInTheDocument();
    
    // Check page navigation buttons
    expect(screen.getByRole('button', { name: /1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3/ })).toBeInTheDocument();
  });

  it('should handle page changes correctly', async () => {
    render(
      <TestWrapper>
        <UsersTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Mock next page data
    (supabase.rpc as Mock).mockResolvedValue({
      data: createMockUsers(2, 50, 150), // Page 2 of 3 pages
      error: null
    });

    // Click page 2
    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_users_paginated_admin', 
        expect.objectContaining({
          p_offset: 50, // Should be offset for page 2
          p_limit: 50
        })
      );
    });
  });

  it('should handle page size changes correctly', async () => {
    render(
      <TestWrapper>
        <UsersTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Mock data for different page size
    (supabase.rpc as Mock).mockResolvedValue({
      data: createMockUsers(1, 100, 150), // Page 1 with 100 items per page
      error: null
    });

    // Change page size to 100
    const pageSizeSelect = screen.getByDisplayValue('50');
    fireEvent.change(pageSizeSelect, { target: { value: '100' } });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_users_paginated_admin',
        expect.objectContaining({
          p_limit: 100,
          p_offset: 0 // Should reset to first page
        })
      );
    });
  });

  it('should reset to first page when search changes', async () => {
    render(
      <TestWrapper>
        <UsersTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Mock search results
    (supabase.rpc as Mock).mockResolvedValue({
      data: createMockUsers(1, 50, 25), // Filtered results
      error: null
    });

    // Search for something
    const searchInput = screen.getByPlaceholderText(/Search users.../);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Wait for debounced search
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_users_paginated_admin',
        expect.objectContaining({
          p_search: 'John',
          p_offset: 0 // Should reset to first page
        })
      );
    }, { timeout: 1000 });
  });

  it('should display correct user count from server', async () => {
    render(
      <TestWrapper>
        <UsersTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should show total count from server, not just page count
    expect(screen.getByText(/150 users/)).toBeInTheDocument();
  });
});