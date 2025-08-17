import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeagueTeamsPage } from '../LeagueTeamsPage';
import { supabase } from '../../../lib/supabase';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ leagueId: '28' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { 
      id: 'admin-user',
      is_admin: true,
      name: 'Admin User',
      email: 'admin@example.com'
    },
  }),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('LeagueTeamsPage - Individual Skill Levels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays skill level for individual registrations', async () => {
    // Mock league query
    const mockLeagueQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 28,
          name: 'Badminton League',
          team_registration: false, // Individual registration league
          cost: 100,
          location: 'Downtown',
          sports: { name: 'Badminton' }
        },
        error: null
      })
    };

    // Mock users query for individual registrations
    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      contains: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user-hong',
            name: 'Hong',
            email: 'hong@example.com',
            league_ids: [28]
          },
          {
            id: 'user-jane',
            name: 'Jane',
            email: 'jane@example.com',
            league_ids: [28]
          }
        ],
        error: null
      })
    };

    // Mock payments query with skill levels
    const mockPaymentsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'user-hong',
            status: 'paid',
            amount_due: 100,
            amount_paid: 100,
            skill_level_id: 3,
            skills: { id: 3, name: 'Advanced' }
          },
          {
            user_id: 'user-jane',
            status: 'partial',
            amount_due: 100,
            amount_paid: 50,
            skill_level_id: 2,
            skills: { id: 2, name: 'Intermediate' }
          }
        ],
        error: null
      })
    };

    // Setup mock implementations
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'leagues') return mockLeagueQuery as any;
      if (table === 'users') return mockUsersQuery as any;
      if (table === 'league_payments') return mockPaymentsQuery as any;
      return {} as any;
    });

    render(
      <MemoryRouter>
        <LeagueTeamsPage />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Hong')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that skill levels are displayed for individual registrations
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    
    // Verify payment status is also shown
    const paidBadges = screen.getAllByText('Paid');
    expect(paidBadges.length).toBeGreaterThan(0);
    
    const partialBadges = screen.getAllByText('Partial');
    expect(partialBadges.length).toBeGreaterThan(0);
  });

  it('handles individual registrations without skill levels', async () => {
    // Mock league query
    const mockLeagueQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 28,
          name: 'Badminton League',
          team_registration: false,
          cost: 100,
          location: 'Downtown',
          sports: { name: 'Badminton' }
        },
        error: null
      })
    };

    // Mock users query
    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      contains: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user-no-skill',
            name: 'No Skill User',
            email: 'noskill@example.com',
            league_ids: [28]
          }
        ],
        error: null
      })
    };

    // Mock payments query without skill level
    const mockPaymentsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'user-no-skill',
            status: 'pending',
            amount_due: 100,
            amount_paid: 0,
            skill_level_id: null,
            skills: null
          }
        ],
        error: null
      })
    };

    // Setup mock implementations
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'leagues') return mockLeagueQuery as any;
      if (table === 'users') return mockUsersQuery as any;
      if (table === 'league_payments') return mockPaymentsQuery as any;
      return {} as any;
    });

    render(
      <MemoryRouter>
        <LeagueTeamsPage />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('No Skill User')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify the user is displayed but no skill level is shown
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    expect(screen.queryByText('Intermediate')).not.toBeInTheDocument();
    expect(screen.queryByText('Beginner')).not.toBeInTheDocument();
  });
});