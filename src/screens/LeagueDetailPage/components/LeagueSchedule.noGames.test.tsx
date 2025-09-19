import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeagueSchedule } from './LeagueSchedule';

// Mock Supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();

mockFrom.mockReturnValue({
  select: mockSelect
});

mockSelect.mockReturnValue({
  eq: mockEq,
  order: mockOrder
});

mockEq.mockReturnValue({
  eq: mockEq,
  single: mockSingle,
  order: mockOrder
});

mockOrder.mockReturnValue({
  eq: mockEq
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: mockFrom
  }
}));

describe('LeagueSchedule - No Games Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays "No games this week" message when no_games flag is true', async () => {
    // Mock league start date
    mockSingle.mockResolvedValueOnce({
      data: { start_date: '2025-01-01' },
      error: null
    });

    // Mock weekly schedule with no_games = true
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          tier_number: 1,
          location: 'Test Location',
          time_slot: '7:00 PM',
          court: 'Court 1',
          format: '3v3',
          team_a_name: null,
          team_a_ranking: null,
          team_b_name: null,
          team_b_ranking: null,
          team_c_name: null,
          team_c_ranking: null,
          is_completed: false,
          no_games: true
        }
      ],
      error: null
    });

    render(<LeagueSchedule leagueId="1" />);

    // Wait for the component to load and check for the message
    expect(await screen.findByText('No games this week')).toBeInTheDocument();
  });

  it('applies greyed-out styling to tiers when no_games is true', async () => {
    // Mock league start date
    mockSingle.mockResolvedValueOnce({
      data: { start_date: '2025-01-01' },
      error: null
    });

    // Mock weekly schedule with no_games = true
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          tier_number: 1,
          location: 'Test Location',
          time_slot: '7:00 PM',
          court: 'Court 1',
          format: '3v3',
          team_a_name: null,
          team_a_ranking: null,
          team_b_name: null,
          team_b_ranking: null,
          team_c_name: null,
          team_c_ranking: null,
          is_completed: false,
          no_games: true
        }
      ],
      error: null
    });

    render(<LeagueSchedule leagueId="1" />);

    // Wait for the tier to be rendered and check for greyed-out styling
    const tierElement = await screen.findByText('Tier 1');
    const tierCard = tierElement.closest('[data-testid]') || tierElement.closest('.opacity-60');
    
    expect(tierCard).toBeInTheDocument();
    
    // Check that "No Games" text appears in team positions
    const noGamesTexts = await screen.findAllByText('No Games');
    expect(noGamesTexts).toHaveLength(3); // Should appear for positions A, B, C
  });

  it('does not display "No games this week" message when no_games is false', async () => {
    // Mock league start date
    mockSingle.mockResolvedValueOnce({
      data: { start_date: '2025-01-01' },
      error: null
    });

    // Mock weekly schedule with no_games = false
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          tier_number: 1,
          location: 'Test Location',
          time_slot: '7:00 PM',
          court: 'Court 1',
          format: '3v3',
          team_a_name: 'Team A',
          team_a_ranking: 1,
          team_b_name: 'Team B',
          team_b_ranking: 2,
          team_c_name: 'Team C',
          team_c_ranking: 3,
          is_completed: false,
          no_games: false
        }
      ],
      error: null
    });

    render(<LeagueSchedule leagueId="1" />);

    // Wait for the component to load
    await screen.findByText('Tier 1');

    // Check that the "No games this week" message is not displayed
    expect(screen.queryByText('No games this week')).not.toBeInTheDocument();
    
    // Check that team names are displayed instead of "No Games"
    expect(await screen.findByText('Team A (1)')).toBeInTheDocument();
    expect(await screen.findByText('Team B (2)')).toBeInTheDocument();
    expect(await screen.findByText('Team C (3)')).toBeInTheDocument();
  });
});