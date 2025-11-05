import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UsersTab } from '../UsersTab';
import { USER_SEARCH_DEBOUNCE_MS } from '../constants';
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

const createQueryChain = (data: unknown) => {
  const chain: Record<string, Mock> & {
    then: (resolve: (value: { data: unknown; error: null }) => void, reject?: (reason: unknown) => void) => Promise<void>;
    catch: () => Promise<void>;
    finally: (callback: () => void) => Promise<void>;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: (resolve: (value: { data: unknown; error: null }) => void) => {
      resolve({ data, error: null });
      return Promise.resolve();
    },
    catch: () => Promise.resolve(),
    finally: (callback: () => void) => {
      callback();
      return Promise.resolve();
    },
  } as unknown as Record<string, Mock> & {
    then: (resolve: (value: { data: unknown; error: null }) => void, reject?: (reason: unknown) => void) => Promise<void>;
    catch: () => Promise<void>;
    finally: (callback: () => void) => Promise<void>;
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue({ data, error: null });
  chain.single.mockResolvedValue({ data, error: null });
  chain.maybeSingle.mockResolvedValue({ data, error: null });

  return chain;
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('UsersTab Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sportsData = [
      { id: 1, name: 'Volleyball' },
      { id: 2, name: 'Basketball' },
    ];
    const leaguesData = [
      { id: 10, name: 'Fall Volleyball League' },
      { id: 11, name: 'Winter Basketball League' },
    ];
    const teamsData = [
      { id: 100, name: 'Spikers', league_id: 10 },
      { id: 200, name: 'Hoopers', league_id: 11 },
    ];
    const tiersData = [
      { league_id: 10, tier_number: 1 },
      { league_id: 11, tier_number: 2 },
    ];
    
    // Mock admin check
    (supabase.from as Mock).mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createQueryChain({ is_admin: true });
        chain.single = vi.fn().mockResolvedValue({
          data: { is_admin: true },
          error: null,
        });
        return chain;
      }

      if (table === 'sports') {
        const chain = createQueryChain(sportsData);
        chain.order = vi.fn().mockResolvedValue({ data: sportsData, error: null });
        return chain;
      }

      if (table === 'leagues') {
        const chain = createQueryChain(leaguesData);
        chain.order = vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: leaguesData, error: null }),
        } as unknown as Record<string, Mock>);
        return chain;
      }

      if (table === 'teams') {
        const chain = createQueryChain(teamsData);
        chain.order = vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: teamsData, error: null }),
        } as unknown as Record<string, Mock>);
        return chain;
      }

      if (table === 'weekly_schedules') {
        const chain = createQueryChain(tiersData);
        chain.order = vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: tiersData, error: null }),
        } as unknown as Record<string, Mock>);
        return chain;
      }

      return createQueryChain([]);
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

    vi.useFakeTimers();
    try {

      // Mock search results
      (supabase.rpc as Mock).mockResolvedValue({
        data: createMockUsers(1, 50, 25), // Filtered results
        error: null
      });

      // Search for something
      const searchInput = screen.getByPlaceholderText('Search users by name, email, or phone...');
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(USER_SEARCH_DEBOUNCE_MS + 10);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(USER_SEARCH_DEBOUNCE_MS + 10);
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      await act(async () => {
        await Promise.resolve();
      });

      const rpcCalls = (supabase.rpc as Mock).mock.calls;
      const lastCallArgs = rpcCalls[rpcCalls.length - 1]?.[1];
      expect(lastCallArgs).toMatchObject({
        p_search: 'John',
        p_offset: 0,
      });
    } finally {
      vi.useRealTimers();
    }
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
