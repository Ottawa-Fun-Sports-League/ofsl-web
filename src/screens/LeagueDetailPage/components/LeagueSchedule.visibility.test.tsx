import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

// Mock Supabase calls used inside LeagueSchedule for start date and weekly tiers
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          single: vi.fn(() => Promise.resolve({ data: { start_date: '2025-09-01' }, error: null }))
        }))
      }))
    }))
  }
}));

// Mock AuthContext useAuth to avoid needing AuthProvider
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    loading: false,
  }),
}));

// Mock fetchLeagueById to control schedule visibility
const fetchLeagueByIdMock = vi.fn();
vi.mock('../../../lib/leagues', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../lib/leagues')>();
  return {
    ...mod,
    fetchLeagueById: (...args: Parameters<typeof mod.fetchLeagueById>) => fetchLeagueByIdMock(...args),
  };
});
// Import after mocks
import { LeagueSchedule } from './LeagueSchedule';

describe('LeagueSchedule visibility overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows overlay when schedule_visible is false', async () => {
    fetchLeagueByIdMock.mockResolvedValue({
      id: 1,
      name: 'Test League',
      start_date: '2025-09-01',
      end_date: '2025-12-01',
      day_of_week: 1,
      playoff_weeks: 0,
      schedule_visible: false,
      description: null,
      additional_info: null,
      location: null,
      league_type: 'regular_season',
      gender: 'Mixed',
      sport_id: null,
      skill_id: null,
      skill_ids: [],
      year: null,
      cost: null,
      max_teams: null,
      gym_ids: [],
      active: true,
      hide_day: null,
      payment_due_date: null,
      deposit_amount: null,
      deposit_date: null,
      team_registration: true,
      created_at: new Date().toISOString(),
      sport_name: null,
      skill_name: null,
      gyms: [],
    });

    render(<LeagueSchedule leagueId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Schedule coming soon')).toBeInTheDocument();
    });
  });

  it('does not show overlay when schedule_visible is true', async () => {
    fetchLeagueByIdMock.mockResolvedValue({
      id: 1,
      name: 'Test League',
      start_date: '2025-09-01',
      end_date: '2025-12-01',
      day_of_week: 1,
      playoff_weeks: 0,
      schedule_visible: true,
      description: null,
      additional_info: null,
      location: null,
      league_type: 'regular_season',
      gender: 'Mixed',
      sport_id: null,
      skill_id: null,
      skill_ids: [],
      year: null,
      cost: null,
      max_teams: null,
      gym_ids: [],
      active: true,
      hide_day: null,
      payment_due_date: null,
      deposit_amount: null,
      deposit_date: null,
      team_registration: true,
      created_at: new Date().toISOString(),
      sport_name: null,
      skill_name: null,
      gyms: [],
    });

    render(<LeagueSchedule leagueId="1" />);

    // Wait for initial render/effects to settle
    await waitFor(() => {
      expect(screen.queryByText('Schedule coming soon')).not.toBeInTheDocument();
    });
  });
});