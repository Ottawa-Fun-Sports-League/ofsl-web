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

describe('UserRegistrationsPage Individual Leagues', () => {
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
    } as any);
  });

  it('should display individual league registrations correctly', async () => {
    const mockUser = {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-456-7890',
      team_ids: [],
      league_ids: [101, 102]  // User has 2 individual league registrations
    };

    const mockIndividualLeagues = [
      {
        id: 101,
        name: 'Individual Badminton League',
        sport_id: 2,
        year: 2024,
        start_date: '2024-03-01',
        team_registration: false,  // Individual league
        deposit_amount: 120,
        deposit_date: '2024-02-15',
        sports: { name: 'Badminton' }
      },
      {
        id: 102,
        name: 'Singles Volleyball League',
        sport_id: 1,
        year: 2024,
        start_date: '2024-06-01',
        team_registration: false,  // Individual league
        deposit_amount: 150,
        deposit_date: '2024-05-15',
        sports: { name: 'Volleyball' }
      }
    ];

    const mockPayments = [
      {
        id: 1,
        team_id: null,  // Individual registration has no team
        league_id: 101,
        user_id: 'test-user-123',
        amount_due: 120,
        amount_paid: 135.60,  // 120 * 1.13 = fully paid with tax
      },
      {
        id: 2,
        team_id: null,  // Individual registration has no team
        league_id: 102,
        user_id: 'test-user-123',
        amount_due: 150,
        amount_paid: 84.75,  // 150 * 1.13 * 0.5 = deposit paid with tax
      }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'id' && value === 'test-user-123') {
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
        } as any;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: mockIndividualLeagues,
            error: null
          })
        } as any;
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockImplementation((field, values) => {
            if (field === 'league_id') {
              return Promise.resolve({
                data: mockPayments.filter(p => values.includes(p.league_id)),
                error: null
              });
            }
            return Promise.resolve({ data: [], error: null });
          })
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
      expect(screen.getByText("Test User's Registrations")).toBeInTheDocument();
    });

    // Check header shows correct total
    expect(screen.getByText(/2 Total Registrations/)).toBeInTheDocument();

    // Check individual registrations section
    expect(screen.getByText('Individual Registrations (2)')).toBeInTheDocument();
    
    // Check first individual league
    expect(screen.getByText('Individual Badminton League')).toBeInTheDocument();
    expect(screen.getByText('Badminton')).toBeInTheDocument();
    
    // Check second individual league
    expect(screen.getByText('Singles Volleyball League')).toBeInTheDocument();
    expect(screen.getByText('Volleyball')).toBeInTheDocument();

    // Check payment statuses
    const fullyPaidElements = screen.getAllByText('Fully Paid');
    expect(fullyPaidElements).toHaveLength(1);  // One fully paid

    const depositPaidElements = screen.getAllByText('Deposit Paid');
    expect(depositPaidElements).toHaveLength(1);  // One deposit paid

    // Check edit buttons
    const editButtons = screen.getAllByText('Edit Registration');
    expect(editButtons).toHaveLength(2);
  });

  it('should show correct message when user has no individual leagues', async () => {
    const mockUser = {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-456-7890',
      team_ids: [],
      league_ids: []  // No individual leagues
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'id' && value === 'test-user-123') {
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
      expect(screen.getByText('No registrations found for this user')).toBeInTheDocument();
    });

    expect(screen.getByText('This user has not registered for any teams or individual leagues')).toBeInTheDocument();
  });

  it('should filter out team leagues from individual registrations', async () => {
    const mockUser = {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-456-7890',
      team_ids: [],
      league_ids: [201, 202, 203]  // User has 3 league IDs
    };

    const mockLeagues = [
      {
        id: 201,
        name: 'Individual Badminton',
        sport_id: 2,
        year: 2024,
        start_date: '2024-03-01',
        team_registration: false,  // Individual league - should show
        deposit_amount: 100,
        deposit_date: '2024-02-15',
        sports: { name: 'Badminton' }
      },
      {
        id: 202,
        name: 'Team Volleyball',
        sport_id: 1,
        year: 2024,
        start_date: '2024-06-01',
        team_registration: true,  // Team league - should NOT show
        deposit_amount: 500,
        deposit_date: '2024-05-15',
        sports: { name: 'Volleyball' }
      },
      {
        id: 203,
        name: 'Singles Tennis',
        sport_id: 3,
        year: 2024,
        start_date: '2024-09-01',
        team_registration: false,  // Individual league - should show
        deposit_amount: 80,
        deposit_date: '2024-08-15',
        sports: { name: 'Tennis' }
      }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'id' && value === 'test-user-123') {
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
        } as any;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: mockLeagues,
            error: null
          })
        } as any;
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
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
      expect(screen.getByText("Test User's Registrations")).toBeInTheDocument();
    });

    // Should only show 2 individual leagues (filtered out the team league)
    expect(screen.getByText('Individual Registrations (2)')).toBeInTheDocument();
    
    // Individual leagues should be shown
    expect(screen.getByText('Individual Badminton')).toBeInTheDocument();
    expect(screen.getByText('Singles Tennis')).toBeInTheDocument();
    
    // Team league should NOT be shown
    expect(screen.queryByText('Team Volleyball')).not.toBeInTheDocument();
  });
});