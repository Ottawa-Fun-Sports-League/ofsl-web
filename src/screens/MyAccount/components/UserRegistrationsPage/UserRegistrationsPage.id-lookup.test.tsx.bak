import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserRegistrationsPage } from './UserRegistrationsPage';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';

// Mock dependencies
vi.mock('../../../../contexts/AuthContext');
vi.mock('../../../../lib/supabase');

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();
let mockUserId = 'test-user-123';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ userId: mockUserId }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('UserRegistrationsPage ID Lookup', () => {
  const mockAdminProfile = {
    id: 'admin-123',
    is_admin: true,
    name: 'Admin User',
    email: 'admin@test.com'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      userProfile: mockAdminProfile,
      loading: false,
    } as unknown as ReturnType<typeof supabase.from>);
  });

  it('should find user by profile ID (users.id)', async () => {
    const profileId = 'profile-123';
    mockUserId = profileId;  // Set the mock userId

    const mockUser = {
      id: profileId,
      auth_id: 'auth-456',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-456-7890',
      team_ids: [],
      league_ids: []
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'id' && value === profileId) {
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUser,
                  error: null
                })
              };
            }
            return {
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            };
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test User's Registrations")).toBeInTheDocument();
    });

    expect(mockShowToast).not.toHaveBeenCalledWith('User not found', 'error');
  });

  it('should find user by auth_id when profile ID not found', async () => {
    const authId = 'auth-789';
    mockUserId = authId;  // Set the mock userId

    const mockUser = {
      id: 'profile-999',
      auth_id: authId,
      name: 'Auth User',
      email: 'auth@example.com',
      phone: '987-654-3210',
      team_ids: [],
      league_ids: []
    };

    const _queryCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field, value) => {
            queryCount++;
            if (field === 'id' && value === authId) {
              // First query by id fails
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              };
            }
            if (field === 'auth_id' && value === authId) {
              // Second query by auth_id succeeds
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUser,
                  error: null
                })
              };
            }
            return {
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            };
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Auth User's Registrations")).toBeInTheDocument();
    });

    expect(mockShowToast).not.toHaveBeenCalledWith('User not found', 'error');
  });

  it('should show error when user not found by either ID', async () => {
    const unknownId = 'unknown-123';
    mockUserId = unknownId;  // Set the mock userId

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('User not found', 'error');
      expect(mockNavigate).toHaveBeenCalledWith('/my-account/users');
    });
  });

  it('should use correct user.id for payment queries', async () => {
    const authId = 'auth-123';
    const profileId = 'profile-456';
    mockUserId = authId;  // Pass auth ID

    const mockUser = {
      id: profileId,  // Actual profile ID
      auth_id: authId,
      name: 'Payment Test User',
      email: 'payment@example.com',
      phone: '555-1234',
      team_ids: [],
      league_ids: [1]
    };

    const paymentQueries: { field: string; value: unknown }[] = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'id' && value === authId) {
              // First try by ID fails
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              };
            }
            if (field === 'auth_id' && value === authId) {
              // Second try by auth_id succeeds
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUser,
                  error: null
                })
              };
            }
            return {
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            };
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{
              id: 1,
              name: 'Test League',
              year: 2024,
              start_date: '2024-03-01',
              team_registration: false,
              deposit_amount: 100,
              deposit_date: '2024-02-15',
              sports: { name: 'Volleyball' }
            }],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      if (table === 'league_payments') {
        const mockChain: MockSupabaseChain = {
          select: vi.fn().mockImplementation(() => mockChain),
          eq: vi.fn().mockImplementation((field, value) => {
            paymentQueries.push({ field, value });
            return mockChain;
          }),
          is: vi.fn().mockImplementation(() => mockChain),
          in: vi.fn().mockImplementation(() => Promise.resolve({
            data: [],
            error: null
          }))
        };
        return mockChain;
      }
      
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Payment Test User's Registrations")).toBeInTheDocument();
    });

    // Check that payment query used the profile ID, not the auth ID
    const userIdQuery = paymentQueries.find(q => q.field === 'user_id');
    expect(userIdQuery).toBeDefined();
    expect(userIdQuery?.value).toBe(profileId);  // Should use profile ID for payments
    expect(userIdQuery?.value).not.toBe(authId);  // Should NOT use auth ID
  });
});