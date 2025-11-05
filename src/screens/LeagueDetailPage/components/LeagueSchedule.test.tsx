import { render, screen, waitFor } from '@testing-library/react';
import { LeagueSchedule } from './LeagueSchedule';
import { supabase } from '../../../lib/supabase';
import { fetchLeagueById } from '../../../lib/leagues';
import type { League } from '../../../lib/leagues';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null
            }))
          })),
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }))
  }
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: 'admin', is_admin: true },
    loading: false,
  }),
}));

vi.mock('../../../lib/leagues', () => ({
  fetchLeagueById: vi.fn().mockResolvedValue({
    id: 1,
    start_date: '2025-09-01',
    end_date: '2025-12-01',
    playoff_weeks: 0,
    day_of_week: 3,
    schedule_visible: true,
  } as League),
}));

describe('LeagueSchedule', () => {
const mockProps = {
  mockSchedule: [],
  leagueId: '1'
};

const mockedFetchLeagueById = vi.mocked(fetchLeagueById);

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchLeagueById.mockResolvedValue({
    id: 1,
    start_date: '2099-01-01',
    end_date: '2099-12-31',
    playoff_weeks: 0,
    day_of_week: 3,
    schedule_visible: true,
  } as League);
});

  it('displays loading state initially', async () => {
    render(<LeagueSchedule {...mockProps} />);
    
    expect(screen.getByText('League Schedule')).toBeInTheDocument();
    expect(screen.getByText('Week 1 - League start date not set')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('loads weekly schedule data from database', async () => {
    const mockWeeklyData = [
      {
        id: 1,
        tier_number: 1,
        location: 'Test Location',
        time_slot: '7:00 PM - 8:30 PM',
        court: 'Court 1',
        team_a_name: 'Team A',
        team_a_ranking: 1,
        team_b_name: 'Team B',
        team_b_ranking: 2,
        team_c_name: 'Team C',
        team_c_ranking: 3,
        is_completed: false
      }
    ];

    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockWeeklyData,
              error: null
            }))
          })),
          single: vi.fn(() => Promise.resolve({
            data: { start_date: '2025-09-01' },
            error: null
          }))
        }))
      }))
    };

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFromChain);

    render(<LeagueSchedule {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Tier 1')).toBeInTheDocument();
      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByText('7:00 PM - 8:30 PM')).toBeInTheDocument();
      expect(screen.getByText('Court 1')).toBeInTheDocument();
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
      expect(screen.getByText('Team C')).toBeInTheDocument();
    });
  });

  it('shows no schedule message when no data exists for week 1', async () => {
    mockedFetchLeagueById.mockResolvedValueOnce({
      id: 1,
      start_date: '2099-01-01',
      end_date: '2099-12-31',
      playoff_weeks: 0,
      day_of_week: 3,
      schedule_visible: true,
    } as League);

    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          })),
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      }))
    };

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFromChain);

    render(<LeagueSchedule {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No Schedule Available')).toBeInTheDocument();
    });

    expect(screen.getByText('The league schedule hasn\'t been generated yet.')).toBeInTheDocument();
  });

  it('shows future week message for weeks beyond current', async () => {
    mockedFetchLeagueById.mockResolvedValueOnce({
      id: 1,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      playoff_weeks: 0,
      day_of_week: 3,
      schedule_visible: true,
    } as League);

    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          })),
          single: vi.fn(() => Promise.resolve({
            data: { start_date: '2025-01-01' }, // Past date to make current week > 1
            error: null
          }))
        }))
      }))
    };

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFromChain);

    render(<LeagueSchedule {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/This week's schedule will be available/)).toBeInTheDocument();
    });
  });
});
