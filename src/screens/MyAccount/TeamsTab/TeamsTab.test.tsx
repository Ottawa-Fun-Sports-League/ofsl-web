import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsTab } from '../components/TeamsTab/TeamsTab';
import { render, mockUser, mockUserProfile, mockNavigate } from '../../../test/test-utils';
import { mockSupabase } from '../../../test/mocks/supabase-enhanced';

describe('TeamsTab', () => {
  const mockTeams = [
    {
      id: 1,
      name: 'Volleyball Warriors',
      captain_id: 'test-user-id',
      league_id: 1,
      roster: ['test-user-id', 'player-2-id'],
      active: true,
      leagues: {
        id: 1,
        name: 'Spring Volleyball League',
        start_date: '2024-03-01',
        sports: { name: 'Volleyball' },
      },
    },
    {
      id: 2,
      name: 'Badminton Buddies',
      captain_id: 'other-captain-id',
      league_id: 2,
      roster: ['other-captain-id', 'test-user-id'],
      active: true,
      leagues: {
        id: 2,
        name: 'Summer Badminton League',
        start_date: '2024-06-01',
        sports: { name: 'Badminton' },
      },
    },
  ];

  const mockPayments = [
    {
      team_id: 1,
      status: 'paid',
      amount_due: 120,
      amount_paid: 120,
    },
    {
      team_id: 2,
      status: 'pending',
      amount_due: 80,
      amount_paid: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock teams fetch
    mockSupabase.from('teams').select().in('id', mockUserProfile.team_ids || []).order().then = 
      vi.fn().mockResolvedValue({
        data: mockTeams,
        error: null,
      });
    
    // Mock payments fetch
    mockSupabase.from('league_payments').select().in('team_id', [1, 2]).then = 
      vi.fn().mockResolvedValue({
        data: mockPayments,
        error: null,
      });
  });

  it('renders teams list', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Volleyball Warriors')).toBeInTheDocument();
      expect(screen.getByText('Badminton Buddies')).toBeInTheDocument();
    });
  });

  it('shows captain badge for teams user captains', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      // User is captain of team 1
      const team1Card = screen.getByText('Volleyball Warriors').closest('[role="article"]');
      expect(team1Card).toHaveTextContent('Captain');
      
      // User is not captain of team 2
      const team2Card = screen.getByText('Badminton Buddies').closest('[role="article"]');
      expect(team2Card).not.toHaveTextContent('Captain');
    });
  });

  it('displays payment status', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows empty state when user has no teams', async () => {
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: { ...mockUserProfile, team_ids: [] },
    });
    
    await waitFor(() => {
      expect(screen.getByText(/you are not part of any teams/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /browse leagues/i })).toBeInTheDocument();
    });
  });

  it('navigates to leagues when clicking browse leagues', async () => {
    const user = userEvent.setup();
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: { ...mockUserProfile, team_ids: [] },
    });
    
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /browse leagues/i })).toBeInTheDocument();
    });
    
    const browseLink = screen.getByRole('link', { name: /browse leagues/i });
    await user.click(browseLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/leagues');
  });

  it('shows loading state', () => {
    // Make the promise hang
    mockSupabase.from('teams').select().in().order().then = vi.fn(() => new Promise(() => {}));
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: { ...mockUserProfile, team_ids: [1, 2] },
    });
    
    expect(screen.getByTestId('teams-loading')).toBeInTheDocument();
  });

  it('handles error when fetching teams', async () => {
    mockSupabase.from('teams').select().in().order().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch teams' },
    });
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: { ...mockUserProfile, team_ids: [1, 2] },
    });
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load teams/i)).toBeInTheDocument();
    });
  });

  it('shows team details correctly', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      // League names
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
      
      // Sports
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
      expect(screen.getByText('Badminton')).toBeInTheDocument();
      
      // Roster counts
      expect(screen.getByText('2 players')).toBeInTheDocument();
    });
  });

  it('allows captain to manage team', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      const team1Card = screen.getByText('Volleyball Warriors').closest('[role="article"]');
      const manageButton = team1Card!.querySelector('button');
      expect(manageButton).toHaveTextContent(/manage team/i);
    });
  });

  it('shows view details for non-captain teams', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      const team2Card = screen.getByText('Badminton Buddies').closest('[role="article"]');
      const viewButton = team2Card!.querySelector('button');
      expect(viewButton).toHaveTextContent(/view details/i);
    });
  });

  it('handles team with missing league data', async () => {
    const teamsWithMissingData = [
      {
        ...mockTeams[0],
        leagues: null,
      },
    ];
    
    mockSupabase.from('teams').select().in().order().then = vi.fn().mockResolvedValue({
      data: teamsWithMissingData,
      error: null,
    });
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: { ...mockUserProfile, team_ids: [1] },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Volleyball Warriors')).toBeInTheDocument();
      expect(screen.getByText(/league information unavailable/i)).toBeInTheDocument();
    });
  });

  it('displays correct payment amounts', async () => {
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      // Team 1 - fully paid
      expect(screen.getByText('$120.00 / $120.00')).toBeInTheDocument();
      
      // Team 2 - not paid
      expect(screen.getByText('$0.00 / $80.00')).toBeInTheDocument();
    });
  });

  it('opens team management modal for captains', async () => {
    const user = userEvent.setup();
    const profileWithTeams = { ...mockUserProfile, team_ids: [1, 2] };
    
    render(<TeamsTab />, {
      user: mockUser,
      userProfile: profileWithTeams,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Volleyball Warriors')).toBeInTheDocument();
    });
    
    const team1Card = screen.getByText('Volleyball Warriors').closest('[role="article"]');
    const manageButton = team1Card!.querySelector('button[aria-label*="manage"]');
    
    await user.click(manageButton!);
    
    // Should open team management modal
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /manage team/i })).toBeInTheDocument();
  });
});