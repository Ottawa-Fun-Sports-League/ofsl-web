import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeagueDetailPage } from './LeagueDetailPage';
import { render, mockNavigate, mockUser, mockUserProfile } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

describe('LeagueDetailPage', () => {
  const mockLeague = {
    id: 1,
    name: 'Spring Volleyball League',
    sport_id: 1,
    location: 'Community Center',
    description: 'Join our fun volleyball league!',
    start_date: '2024-03-01',
    end_date: '2024-05-01',
    registration_deadline: '2024-02-15',
    cost: 120,
    max_teams: 12,
    active: true,
    schedule_day: 'Wednesday',
    schedule_time: '7:00 PM',
    sports: { name: 'Volleyball' },
    skills: { name: 'Recreational' },
  };

  const mockTeams = [
    { id: 1, name: 'Team A', active: true },
    { id: 2, name: 'Team B', active: true },
    { id: 3, name: 'Team C', active: false }, // Waitlisted
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock league fetch
    mockSupabase.from('leagues').select().eq('id', 1).single().then = vi.fn().mockResolvedValue({
      data: mockLeague,
      error: null,
    });
    
    // Mock teams count
    mockSupabase.from('teams').select('id').eq('league_id', 1).then = vi.fn().mockResolvedValue({
      data: mockTeams,
      error: null,
    });
  });

  it('renders league details', async () => {
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Join our fun volleyball league!')).toBeInTheDocument();
      expect(screen.getByText(/community center/i)).toBeInTheDocument();
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
      expect(screen.getByText('Recreational')).toBeInTheDocument();
    });
  });

  it('displays league schedule information', async () => {
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/schedule/i)).toBeInTheDocument();
      expect(screen.getByText(/wednesday/i)).toBeInTheDocument();
      expect(screen.getByText(/7:00 pm/i)).toBeInTheDocument();
    });
  });

  it('displays registration information', async () => {
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/registration deadline/i)).toBeInTheDocument();
      expect(screen.getByText(/feb 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText('$120')).toBeInTheDocument();
    });
  });

  it('shows team capacity', async () => {
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/teams/i)).toBeInTheDocument();
      expect(screen.getByText(/2 \/ 12/)).toBeInTheDocument(); // 2 active teams out of 12 max
    });
  });

  it('shows register button for unauthenticated users', async () => {
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      const registerButton = screen.getByRole('button', { name: /sign in to register/i });
      expect(registerButton).toBeInTheDocument();
    });
  });

  it('navigates to login when unauthenticated user clicks register', async () => {
    const user = userEvent.setup();
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in to register/i })).toBeInTheDocument();
    });
    
    const registerButton = screen.getByRole('button', { name: /sign in to register/i });
    await user.click(registerButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows register button for authenticated users', async () => {
    render(<LeagueDetailPage />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      const registerButton = screen.getByRole('button', { name: /register team/i });
      expect(registerButton).toBeInTheDocument();
    });
  });

  it('handles team registration', async () => {
    const user = userEvent.setup();
    
    // Mock Stripe checkout
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { sessionId: 'stripe-session-123' },
      error: null,
    });
    
    render(<LeagueDetailPage />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register team/i })).toBeInTheDocument();
    });
    
    const registerButton = screen.getByRole('button', { name: /register team/i });
    await user.click(registerButton);
    
    // Should show team name modal
    expect(await screen.findByText(/enter team name/i)).toBeInTheDocument();
    
    const teamNameInput = screen.getByPlaceholderText(/team name/i);
    await user.type(teamNameInput, 'My Awesome Team');
    
    const confirmButton = screen.getByRole('button', { name: /continue to payment/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('stripe-checkout', {
        body: expect.objectContaining({
          teamName: 'My Awesome Team',
          leagueId: 1,
        }),
      });
    });
  });

  it('shows waitlist message when league is full', async () => {
    // Mock full league (12 active teams)
    const fullTeams = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      active: true,
    }));
    
    mockSupabase.from('teams').select('id').eq('league_id', 1).then = vi.fn().mockResolvedValue({
      data: fullTeams,
      error: null,
    });
    
    render(<LeagueDetailPage />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText(/league is full/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    });
  });

  it('shows closed message when past registration deadline', async () => {
    const pastDeadlineLeague = {
      ...mockLeague,
      registration_deadline: '2023-01-01', // Past date
    };
    
    mockSupabase.from('leagues').select().eq('id', 1).single().then = vi.fn().mockResolvedValue({
      data: pastDeadlineLeague,
      error: null,
    });
    
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/registration closed/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    // Make the promise hang to see loading state
    mockSupabase.from('leagues').select().eq().single().then = vi.fn(() => new Promise(() => {}));
    
    render(<LeagueDetailPage />);
    
    expect(screen.getByTestId('league-loading')).toBeInTheDocument();
  });

  it('handles error when league not found', async () => {
    mockSupabase.from('leagues').select().eq('id', 1).single().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'League not found' },
    });
    
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/league not found/i)).toBeInTheDocument();
    });
  });

  it('shows admin actions for admin users', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueDetailPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /edit league/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /manage teams/i })).toBeInTheDocument();
    });
  });

  it('navigates back when clicking back button', async () => {
    const user = userEvent.setup();
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('displays league dates', async () => {
    render(<LeagueDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/season dates/i)).toBeInTheDocument();
      expect(screen.getByText(/mar 1, 2024.*may 1, 2024/i)).toBeInTheDocument();
    });
  });

  it('handles user without profile completion', async () => {
    render(<LeagueDetailPage />, {
      user: mockUser,
      userProfile: null, // No profile
    });
    
    await waitFor(() => {
      const registerButton = screen.getByRole('button', { name: /complete profile to register/i });
      expect(registerButton).toBeInTheDocument();
    });
  });
});