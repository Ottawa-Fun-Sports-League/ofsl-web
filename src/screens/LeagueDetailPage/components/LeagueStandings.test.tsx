import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LeagueStandings } from './LeagueStandings';

// Mock the volleyball API
vi.mock('../../../lib/volleyball', () => ({
  getLeagueStandings: vi.fn()
}));

import { getLeagueStandings } from '../../../lib/volleyball';
const mockGetLeagueStandings = vi.mocked(getLeagueStandings);

describe('LeagueStandings', () => {
  const mockStandingsResponse = {
    current_week: 3,
    total_teams: 3,
    tiers: [
      {
        tier_number: 1,
        teams: [
          {
            id: 1,
            league_id: 1,
            team_id: 1,
            team: {
              id: 1,
              name: 'Team Alpha',
              captain_id: 'captain-1',
              captain: {
                id: 'captain-1',
                name: 'John Doe'
              }
            },
            week_number: 3,
            current_tier: 1,
            tier_rank: 1,
            matches_played: 2,
            matches_won: 2,
            matches_lost: 0,
            sets_played: 6,
            sets_won: 5,
            sets_lost: 1,
            points_for: 150,
            points_against: 120,
            point_differential: 30,
            match_win_percentage: 1.0,
            set_win_percentage: 0.833,
            previous_tier: 1,
            tier_movement: 0,
            calculated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            league_id: 1,
            team_id: 2,
            team: {
              id: 2,
              name: 'Team Beta',
              captain_id: 'captain-2',
              captain: {
                id: 'captain-2',
                name: 'Jane Smith'
              }
            },
            week_number: 3,
            current_tier: 1,
            tier_rank: 2,
            matches_played: 2,
            matches_won: 1,
            matches_lost: 1,
            sets_played: 6,
            sets_won: 3,
            sets_lost: 3,
            points_for: 135,
            points_against: 135,
            point_differential: 0,
            match_win_percentage: 0.5,
            set_win_percentage: 0.5,
            previous_tier: 1,
            tier_movement: 0,
            calculated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 3,
            league_id: 1,
            team_id: 3,
            team: {
              id: 3,
              name: 'Team Gamma',
              captain_id: 'captain-3',
              captain: null // Hidden captain
            },
            week_number: 3,
            current_tier: 1,
            tier_rank: 3,
            matches_played: 2,
            matches_won: 0,
            matches_lost: 2,
            sets_played: 6,
            sets_won: 2,
            sets_lost: 4,
            points_for: 110,
            points_against: 140,
            point_differential: -30,
            match_win_percentage: 0.0,
            set_win_percentage: 0.333,
            previous_tier: 1,
            tier_movement: 0,
            calculated_at: '2024-01-01T00:00:00Z'
          }
        ]
      }
    ],
    last_updated: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockGetLeagueStandings.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LeagueStandings leagueId={1} />);

    expect(screen.getByText('League Standings')).toBeInTheDocument();
    // Check for loading spinner by its class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders error state', async () => {
    mockGetLeagueStandings.mockRejectedValue(new Error('Failed to load standings'));

    render(<LeagueStandings leagueId={1} />);

    // Wait for error state to render
    await waitFor(() => {
      expect(screen.getByText('League Standings')).toBeInTheDocument();
      expect(screen.getByText('Error loading standings: Failed to load standings')).toBeInTheDocument();
    });
  });

  it('renders empty state when no teams', async () => {
    mockGetLeagueStandings.mockResolvedValue({
      current_week: 1,
      total_teams: 0,
      tiers: [],
      last_updated: ''
    });

    render(<LeagueStandings leagueId={1} />);

    await waitFor(() => {
      expect(screen.getByText('League Standings')).toBeInTheDocument();
      expect(screen.getByText('No Standings Available')).toBeInTheDocument();
      expect(screen.getByText(/Standings will be calculated once matches are played/)).toBeInTheDocument();
    });
  });

  it('renders standings table with teams', async () => {
    mockGetLeagueStandings.mockResolvedValue(mockStandingsResponse);

    render(<LeagueStandings leagueId={1} />);

    await waitFor(() => {
      // Check header
      expect(screen.getByText('League Standings')).toBeInTheDocument();

      // Check table headers
      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Captain')).toBeInTheDocument();
      expect(screen.getByText('Wins')).toBeInTheDocument();
      expect(screen.getByText('Losses')).toBeInTheDocument();
      expect(screen.getByText('Points')).toBeInTheDocument();

      // Check team data
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Team Gamma')).toBeInTheDocument();
      expect(screen.getByText('(hidden)')).toBeInTheDocument(); // Hidden captain
    });
  });

  it('shows actual match results', async () => {
    mockGetLeagueStandings.mockResolvedValue(mockStandingsResponse);

    render(<LeagueStandings leagueId={1} />);

    await waitFor(() => {
      // Check specific values from our mock data - be more specific
      const winCells = screen.getAllByText('2');
      expect(winCells.length).toBeGreaterThan(0); // Team Alpha wins and Team Gamma losses
      
      const lossCells = screen.getAllByText('0');
      expect(lossCells.length).toBeGreaterThan(0); // Team Alpha losses and Team Gamma wins
      
      expect(screen.getByText('150')).toBeInTheDocument(); // Team Alpha points
      expect(screen.getByText('+30')).toBeInTheDocument(); // Team Alpha differential
    });
  });

  it('applies correct styling to table rows', async () => {
    mockGetLeagueStandings.mockResolvedValue(mockStandingsResponse);

    const { container } = render(<LeagueStandings leagueId={1} />);

    await waitFor(() => {
      // Check alternating row colors
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('bg-white');
      expect(rows[1]).toHaveClass('bg-gray-50');
      expect(rows[2]).toHaveClass('bg-white');
    });
  });

  it('handles invalid leagueId', async () => {
    mockGetLeagueStandings.mockResolvedValue({
      current_week: 1,
      total_teams: 0,
      tiers: [],
      last_updated: ''
    });

    render(<LeagueStandings leagueId={0} />);

    await waitFor(() => {
      expect(screen.getByText('League Standings')).toBeInTheDocument();
      expect(screen.getByText('No Standings Available')).toBeInTheDocument();
    });
  });
});