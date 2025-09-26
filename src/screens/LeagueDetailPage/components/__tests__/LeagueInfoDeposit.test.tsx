import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LeagueInfo } from '../LeagueInfo';
import type { League } from '../../../../lib/leagues';

// Mock dependencies
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('../../../../lib/stripe', () => ({
  getStripeProductByLeagueId: vi.fn().mockResolvedValue(null),
}));

// Mock AuthContext
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    userProfile: { id: 'test-user-id', name: 'Test User' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('LeagueInfo Deposit Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseLeague: League = {
    id: 1,
    name: 'Test League',
    description: 'Test Description',
    league_type: 'regular_season',
    gender: 'Mixed',
    sport_id: 1,
    skill_id: 1,
    skill_ids: [1],
    day_of_week: 1,
    start_date: '2025-01-01',
    end_date: '2025-03-31',
    team_registration: false,
    cost: 250,
    max_teams: 20,
    gym_ids: [1],
    payment_due_date: '2025-08-21',
    deposit_amount: null,
    deposit_date: null,
    active: true,
    hide_day: false,
    year: '2025',
    created_at: '2024-01-01',
    sport_name: 'Volleyball',
    skill_name: 'Intermediate',
    location: null,
    additional_info: null,
    gyms: [
      {
        id: 1,
        gym: 'Test Gym',
        address: '123 Test St',
        locations: ['Central'],
      },
    ],
  };

  it('should display deposit information when deposit is set', () => {
    const leagueWithDeposit: League = {
      ...baseLeague,
      deposit_amount: 75,
      deposit_date: '2025-01-15',
    };

    render(
      <BrowserRouter>
        <LeagueInfo
          league={leagueWithDeposit}
            skillLevels={['Intermediate']}
          />
      </BrowserRouter>
    );

    // Check that deposit information is displayed
    expect(screen.getByText('Deposit Required')).toBeInTheDocument();
    expect(screen.getByText(/\$75\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
    expect(screen.getByText('Non-refundable deposit to secure your spot')).toBeInTheDocument();
  });

  it('should not display deposit information when deposit is not set', () => {
    render(
      <BrowserRouter>
        <LeagueInfo
          league={baseLeague}
            skillLevels={['Intermediate']}
          />
      </BrowserRouter>
    );

    // Check that deposit information is not displayed
    expect(screen.queryByText('Deposit Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-refundable deposit to secure your spot')).not.toBeInTheDocument();
  });

  it('should not display deposit when only amount is set without date', () => {
    const leagueWithOnlyAmount: League = {
      ...baseLeague,
      deposit_amount: 50,
      deposit_date: null,
    };

    render(
      <BrowserRouter>
        <LeagueInfo
          league={leagueWithOnlyAmount}
            skillLevels={['Intermediate']}
          />
      </BrowserRouter>
    );

    // Check that deposit information is not displayed without date
    expect(screen.queryByText('Deposit Required')).not.toBeInTheDocument();
  });

  it('should not display deposit when only date is set without amount', () => {
    const leagueWithOnlyDate: League = {
      ...baseLeague,
      deposit_amount: null,
      deposit_date: '2025-01-15',
    };

    render(
      <BrowserRouter>
        <LeagueInfo
          league={leagueWithOnlyDate}
            skillLevels={['Intermediate']}
          />
      </BrowserRouter>
    );

    // Check that deposit information is not displayed without amount
    expect(screen.queryByText('Deposit Required')).not.toBeInTheDocument();
  });

  it('should format deposit date correctly', () => {
    const leagueWithDeposit: League = {
      ...baseLeague,
      deposit_amount: 100,
      deposit_date: '2025-12-31',
    };

    render(
      <BrowserRouter>
        <LeagueInfo
          league={leagueWithDeposit}
            skillLevels={['Intermediate']}
          />
      </BrowserRouter>
    );

    // Check that date is formatted correctly
    expect(screen.getByText(/Dec 31, 2025/)).toBeInTheDocument();
  });

  it('should format deposit amount with two decimal places', () => {
    const leagueWithDeposit: League = {
      ...baseLeague,
      deposit_amount: 99.99,
      deposit_date: '2025-01-15',
    };

    render(
      <BrowserRouter>
        <LeagueInfo
          league={leagueWithDeposit}
            skillLevels={['Intermediate']}
          />
      </BrowserRouter>
    );

    // Check that amount is formatted correctly
    expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
  });
});
