import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeagueStandings } from './LeagueStandings';

// Mock the useLeagueStandings hook
vi.mock('../hooks/useLeagueStandings', () => ({
  useLeagueStandings: vi.fn()
}));

import { useLeagueStandings } from '../hooks/useLeagueStandings';
const mockUseLeagueStandings = vi.mocked(useLeagueStandings);

describe('LeagueStandings', () => {
  const mockTeams = [
    {
      id: 1,
      name: 'Team Alpha',
      roster_size: 6,
      wins: 0,
      losses: 0,
      points: 0,
      differential: 0,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: 'Team Beta',
      roster_size: 6,
      wins: 0,
      losses: 0,
      points: 0,
      differential: 0,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      name: 'Team Gamma',
      roster_size: 6,
      wins: 0,
      losses: 0,
      points: 0,
      differential: 0,
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: [],
      loading: true,
      error: null,
      hasSchedule: false,
      refetch: vi.fn()
    });

    render(<LeagueStandings leagueId="1" />);

    expect(screen.getByText('League Standings')).toBeInTheDocument();
    // Check for loading spinner by its class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: [],
      loading: false,
      error: 'Failed to load standings',
      hasSchedule: false,
      refetch: vi.fn()
    });

    render(<LeagueStandings leagueId="1" />);

    expect(screen.getByText('League Standings')).toBeInTheDocument();
    expect(screen.getByText('Error loading standings: Failed to load standings')).toBeInTheDocument();
  });

  it('renders empty state when no teams', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: [],
      loading: false,
      error: null,
      hasSchedule: false,
      refetch: vi.fn()
    });

    render(<LeagueStandings leagueId="1" />);

    expect(screen.getByText('League Standings')).toBeInTheDocument();
    expect(screen.getByText('No Teams Registered')).toBeInTheDocument();
    expect(screen.getByText(/This league doesn.*t have any registered teams yet/)).toBeInTheDocument();
  });

  it('renders standings table with teams', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: mockTeams,
      loading: false,
      error: null,
      hasSchedule: true,
      refetch: vi.fn()
    });

    render(<LeagueStandings leagueId="1" />);

    // Check header
    expect(screen.getByText('League Standings')).toBeInTheDocument();

    // Check note about standings
    expect(screen.getByText(/Game records and standings will be available/)).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.queryByText('Captain')).not.toBeInTheDocument(); // Captain column removed
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();

    // Check team data
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // Captain names removed
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument(); // Captain names removed
    expect(screen.getByText('Team Gamma')).toBeInTheDocument();
    expect(screen.queryByText('(hidden)')).not.toBeInTheDocument(); // Hidden captain removed
  });

  it('shows placeholders for wins, losses, and points', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: mockTeams,
      loading: false,
      error: null,
      hasSchedule: true,
      refetch: vi.fn()
    });

    render(<LeagueStandings leagueId="1" />);

    // All teams should show "-" for wins, losses, and points
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBe(9); // 3 teams × 3 columns (wins, losses, points)
  });

  it('applies correct styling to table rows', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: mockTeams,
      loading: false,
      error: null,
      hasSchedule: true,
      refetch: vi.fn()
    });

    const { container } = render(<LeagueStandings leagueId="1" />);

    // Check alternating row colors
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveClass('bg-white');
    expect(rows[1]).toHaveClass('bg-gray-50');
    expect(rows[2]).toHaveClass('bg-white');
  });

  it('handles undefined leagueId', () => {
    mockUseLeagueStandings.mockReturnValue({
      teams: [],
      loading: false,
      error: null,
      hasSchedule: false,
      refetch: vi.fn()
    });

    render(<LeagueStandings leagueId={undefined} />);

    expect(screen.getByText('League Standings')).toBeInTheDocument();
    expect(screen.getByText('No Teams Registered')).toBeInTheDocument();
  });
});