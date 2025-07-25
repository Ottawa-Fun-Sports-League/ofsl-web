import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { LeagueInfo } from './LeagueInfo';
import { BrowserRouter } from 'react-router-dom';
import type { League } from '../../../lib/leagues';
import { ToastProvider } from '../../../components/ui/toast';

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock dependencies
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      })
    })
  }
}));

vi.mock('../../../lib/stripe', () => ({
  getStripeProductByLeagueId: vi.fn().mockResolvedValue(null)
}));

describe('LeagueInfo', () => {
  const mockLeague: League = {
    id: 1,
    name: 'Test League',
    description: 'Test Description',
    additional_info: null,
    location: 'Test Location',
    league_type: 'regular_season',
    gender: 'Mixed',
    sport_id: 1,
    skill_id: 1,
    skill_ids: [1, 2],
    day_of_week: 3, // Wednesday
    start_date: '2024-01-01',
    year: '2024',
    end_date: '2024-03-31',
    cost: 250,
    max_teams: 10,
    gym_ids: [1, 2],
    active: true,
    hide_day: false,
    created_at: '2024-01-01T00:00:00Z',
    sport_name: 'Volleyball',
    skill_name: 'Intermediate',
    gyms: [
      {
        id: 1,
        gym: 'Test Gym 1',
        address: '123 Test St',
        locations: ['Downtown']
      },
      {
        id: 2,
        gym: 'Test Gym 2',
        address: '456 Test Ave',
        locations: ['Downtown', 'West End']
      }
    ]
  };

  const renderComponent = (props = {}) => {
    return render(
      <ToastProvider>
        <BrowserRouter>
          <LeagueInfo
            league={mockLeague}
            sport="Volleyball"
            skillLevels={['Beginner', 'Intermediate']}
            {...props}
          />
        </BrowserRouter>
      </ToastProvider>
    );
  };

  it('should render league information correctly', () => {
    renderComponent();

    // Check day of week is displayed correctly
    expect(screen.getByText('Wednesday')).toBeInTheDocument();

    // Check location badges are displayed
    expect(screen.getByText('Downtown')).toBeInTheDocument();
    expect(screen.getByText('West End')).toBeInTheDocument();

    // Check season dates
    expect(screen.getByText(/Jan 1, 2024 - Mar 31, 2024/)).toBeInTheDocument();

    // Check skill levels
    expect(screen.getByText('Skill Levels')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();

    // Check league fee
    expect(screen.getByText('League Fee')).toBeInTheDocument();
    expect(screen.getByText('$250.00 + HST per team')).toBeInTheDocument();
  });

  it('should render with no cost correctly', () => {
    const leagueNoCost = { ...mockLeague, cost: null };
    renderComponent({ league: leagueNoCost });

    expect(screen.getByText('No fee required')).toBeInTheDocument();
  });

  it('should render with skill_name when no skillLevels provided', () => {
    renderComponent({ skillLevels: undefined });

    expect(screen.getByText('Skill Level')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });

  it('should render TBD when no gyms provided', () => {
    const leagueNoGyms = { ...mockLeague, gyms: [] };
    renderComponent({ league: leagueNoGyms });

    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('should handle null values gracefully', () => {
    const leagueWithNulls: League = {
      ...mockLeague,
      day_of_week: null,
      start_date: null,
      end_date: null,
      skill_name: null,
      cost: null,
      gyms: []
    };
    
    renderComponent({ league: leagueWithNulls, skillLevels: [] });

    // Should render without crashing
    expect(screen.getByText('Location:')).toBeInTheDocument();
    expect(screen.getByText('Season Dates')).toBeInTheDocument();
    expect(screen.getByText('League Fee')).toBeInTheDocument();
  });
});