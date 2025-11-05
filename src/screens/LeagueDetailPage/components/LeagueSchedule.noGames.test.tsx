import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LeagueSchedule } from './LeagueSchedule';

const supabaseMocks = vi.hoisted(() => {
  const createBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() =>
      Promise.resolve({ data: [], error: null })
    );
    builder.limit = vi.fn(() =>
      Promise.resolve({ data: [], error: null })
    );
    builder.single = vi.fn(() =>
      Promise.resolve({ data: null, error: null })
    );
    builder.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: null })
    );
    return builder;
  };

  const builders: Record<string, ReturnType<typeof createBuilder>> = {};

  const getBuilder = (table: string) => {
    if (!builders[table]) {
      builders[table] = createBuilder();
    }
    return builders[table];
  };

  const from = vi.fn((table: string) => getBuilder(table));

  const reset = () => {
    from.mockClear();
    Object.values(builders).forEach((builder) => {
      builder.select.mockReset().mockImplementation(() => builder);
      builder.eq.mockReset().mockImplementation(() => builder);
      builder.order.mockReset().mockResolvedValue({ data: [], error: null });
      builder.limit.mockReset().mockResolvedValue({ data: [], error: null });
      builder.single.mockReset().mockResolvedValue({ data: null, error: null });
      builder.maybeSingle
        ?.mockReset()
        .mockResolvedValue({ data: null, error: null });
    });
  };

  return { from, getBuilder, reset };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

const fetchLeagueByIdMock = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/leagues', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/leagues')>(
    '../../../lib/leagues'
  );
  return {
    ...actual,
    fetchLeagueById: fetchLeagueByIdMock,
  };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: null,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LeagueSchedule - No Games Feature', () => {
  beforeEach(() => {
    supabaseMocks.reset();
    fetchLeagueByIdMock.mockReset();
    fetchLeagueByIdMock.mockResolvedValue({
      start_date: '2025-01-01',
      end_date: '2025-04-01',
      day_of_week: 3,
      playoff_weeks: 0,
      schedule_visible: true,
    });
  });

  it('displays "No games this week" message when no_games flag is true', async () => {
    const leaguesBuilder = supabaseMocks.getBuilder('leagues');
    leaguesBuilder.single.mockResolvedValueOnce({
      data: { start_date: '2025-01-01' },
      error: null,
    });

    const weeklyBuilder = supabaseMocks.getBuilder('weekly_schedules');
    weeklyBuilder.order.mockImplementation(() =>
      Promise.resolve({
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
            no_games: true,
          },
        ],
        error: null,
      })
    );

    const resultsBuilder = supabaseMocks.getBuilder('game_results');
    resultsBuilder.limit.mockImplementation(() =>
      Promise.resolve({ data: [], error: null })
    );

    // Mock league start date
    render(<LeagueSchedule leagueId="1" />);

    // Wait for the component to load and check for the message
    expect(await screen.findByText('No games this week')).toBeInTheDocument();
  });

  it('applies greyed-out styling to tiers when no_games is true', async () => {
    const leaguesBuilder = supabaseMocks.getBuilder('leagues');
    leaguesBuilder.single.mockResolvedValueOnce({
      data: { start_date: '2025-01-01' },
      error: null,
    });

    const weeklyBuilder = supabaseMocks.getBuilder('weekly_schedules');
    weeklyBuilder.order.mockImplementation(() =>
      Promise.resolve({
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
            no_games: true,
          },
        ],
        error: null,
      })
    );

    const resultsBuilder = supabaseMocks.getBuilder('game_results');
    resultsBuilder.limit.mockImplementation(() =>
      Promise.resolve({ data: [], error: null })
    );

    // Mock league start date
    render(<LeagueSchedule leagueId="1" />);

    // Wait for the tier to be rendered and check for greyed-out styling
    await waitFor(() => {
      const tierElement = screen.getByText('Tier 1');
      expect(tierElement.closest('.opacity-60')).not.toBeNull();
    });
    
    // Check that "No Games" text appears in team positions
    const noGamesTexts = await screen.findAllByText('No Games');
    expect(noGamesTexts).toHaveLength(3); // Should appear for positions A, B, C
  });

  it('does not display "No games this week" message when no_games is false', async () => {
    const leaguesBuilder = supabaseMocks.getBuilder('leagues');
    leaguesBuilder.single.mockResolvedValueOnce({
      data: { start_date: '2025-01-01' },
      error: null,
    });

    const weeklyBuilder = supabaseMocks.getBuilder('weekly_schedules');
    weeklyBuilder.order.mockImplementation(() =>
      Promise.resolve({
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
            no_games: false,
          },
        ],
        error: null,
      })
    );

    const resultsBuilder = supabaseMocks.getBuilder('game_results');
    resultsBuilder.limit.mockImplementation(() =>
      Promise.resolve({ data: [], error: null })
    );

    // Mock league start date
    render(<LeagueSchedule leagueId="1" />);

    // Wait for the component to load
    await screen.findByText('Tier 1');

    // Check that the "No games this week" message is not displayed
    expect(screen.queryByText('No games this week')).not.toBeInTheDocument();
    
    // Check that team names are displayed instead of "No Games"
    expect(await screen.findByText(/Team A/i)).toBeInTheDocument();
    expect(await screen.findByText(/Team B/i)).toBeInTheDocument();
    expect(await screen.findByText(/Team C/i)).toBeInTheDocument();
  });
});
