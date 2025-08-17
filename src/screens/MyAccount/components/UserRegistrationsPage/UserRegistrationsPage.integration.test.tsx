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
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ userId: 'test-user-123' }),
    useNavigate: () => mockNavigate,
  };
});

const mockShowToast = vi.fn();
vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('UserRegistrationsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle auth loading state gracefully', async () => {
    // Start with auth loading
    vi.mocked(useAuth).mockReturnValue({
      userProfile: null,
      loading: true,
    } as any);

    const { rerender } = render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Should show loading spinner
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

    // Now simulate auth loaded with admin user
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'admin-123',
        is_admin: true,
        name: 'Admin User',
        email: 'admin@test.com'
      },
      loading: false,
    } as any);

    // Mock successful user data fetch
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-123',
              name: 'Test User',
              email: 'test@example.com',
              phone: '123-456-7890',
              team_ids: [],
              league_ids: []
            },
            error: null
          })
        } as any;
      }
      return {} as any;
    });

    rerender(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText(/Test User's Registrations/)).toBeInTheDocument();
    });

    // Should not show error
    expect(mockShowToast).not.toHaveBeenCalledWith(
      'You must be an admin to view user registrations',
      'error'
    );
  });

  it('should redirect non-admin users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'user-123',
        is_admin: false,
        name: 'Regular User',
        email: 'user@test.com'
      },
      loading: false,
    } as any);

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Should show access denied
    expect(screen.getByText('Access denied. Admin privileges required.')).toBeInTheDocument();
  });

  it('should handle missing userProfile gracefully', async () => {
    // Simulate no user profile (logged out)
    vi.mocked(useAuth).mockReturnValue({
      userProfile: null,
      loading: false,
    } as any);

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Should redirect to users page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/my-account/users');
    });
  });

  it('should load user with both team and individual registrations', async () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'admin-123',
        is_admin: true,
        name: 'Admin User',
        email: 'admin@test.com'
      },
      loading: false,
    } as any);

    // Mock user with registrations
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-123',
              name: 'Test User',
              email: 'test@example.com',
              phone: '123-456-7890',
              team_ids: [1],
              league_ids: [10]
            },
            error: null
          })
        } as any;
      }
      
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{
              id: 1,
              name: 'Test Team',
              captain_id: 'test-user-123',
              co_captains: [],
              roster: ['test-user-123'],
              league_id: 5,
              leagues: {
                id: 5,
                name: 'Test League',
                season: 'Winter 2024',
                sports: { name: 'Volleyball' }
              }
            }],
            error: null
          })
        } as any;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{
              id: 10,
              name: 'Individual League',
              sport_id: 1,
              year: 2024,
              start_date: '2024-03-01',
              team_registration: false,
              deposit_amount: 100,
              deposit_date: '2024-02-15',
              sports: { name: 'Badminton' }
            }],
            error: null
          })
        } as any;
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
        } as any;
      }
      
      return {} as any;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Test User's Registrations/)).toBeInTheDocument();
    });

    // Check both sections are displayed
    expect(screen.getByText('Team Registrations (1)')).toBeInTheDocument();
    expect(screen.getByText('Individual Registrations (1)')).toBeInTheDocument();
    
    // Check specific registrations
    expect(screen.getByText('Test Team')).toBeInTheDocument();
    expect(screen.getByText('Individual League')).toBeInTheDocument();
  });
});