import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeagueTeamsPage } from './LeagueTeamsPage';
import { render, mockNavigate, mockUser, mockUserProfile } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ leagueId: '1' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn(<T,>(arr: T[], from: number, to: number): T[] => {
    const newArr = [...arr];
    const [removed] = newArr.splice(from, 1);
    newArr.splice(to, 0, removed);
    return newArr;
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

describe('LeagueTeamsPage', () => {
  const mockLeague = {
    id: 1,
    name: 'Spring Volleyball League',
    location: 'Community Center',
    cost: 120,
    sports: { name: 'Volleyball' },
  };

  const mockActiveTeams = [
    {
      id: 1,
      name: 'Team Alpha',
      captain_id: 'captain-1',
      roster: ['captain-1', 'player-2', 'player-3'],
      created_at: '2024-01-15T10:00:00Z',
      skill_level_id: 2,
      display_order: 1,
      active: true,
      users: { name: 'John Captain' },
      skills: { name: 'Recreational' },
      leagues: mockLeague,
    },
    {
      id: 2,
      name: 'Team Beta',
      captain_id: 'captain-2',
      roster: ['captain-2', 'player-4'],
      created_at: '2024-01-16T10:00:00Z',
      skill_level_id: 3,
      display_order: 2,
      active: true,
      users: { name: 'Jane Captain' },
      skills: { name: 'Intermediate' },
      leagues: mockLeague,
    },
  ];

  const mockWaitlistedTeams = [
    {
      id: 3,
      name: 'Team Gamma',
      captain_id: 'captain-3',
      roster: ['captain-3'],
      created_at: '2024-01-17T10:00:00Z',
      skill_level_id: 1,
      display_order: 3,
      active: false,
      users: { name: 'Bob Captain' },
      skills: { name: 'Beginner' },
      leagues: mockLeague,
    },
  ];

  const mockPayments = [
    {
      team_id: 1,
      league_id: 1,
      status: 'paid',
      amount_due: 120,
      amount_paid: 120,
    },
    {
      team_id: 2,
      league_id: 1,
      status: 'partial',
      amount_due: 120,
      amount_paid: 60,
    },
    {
      team_id: 3,
      league_id: 1,
      status: 'pending',
      amount_due: 120,
      amount_paid: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock league fetch
    mockSupabase.from('leagues').select().eq('id', 1).single().then = vi.fn().mockResolvedValue({
      data: mockLeague,
      error: null,
    });
    
    // Mock active teams fetch
    mockSupabase.from('teams').select().eq('league_id', 1).eq('active', true).order().then = 
      vi.fn().mockResolvedValue({
        data: mockActiveTeams,
        error: null,
      });
    
    // Mock waitlisted teams fetch
    mockSupabase.from('teams').select().eq('league_id', 1).eq('active', false).order().then = 
      vi.fn().mockResolvedValue({
        data: mockWaitlistedTeams,
        error: null,
      });
    
    // Mock payments fetch
    mockSupabase.from('league_payments').select().eq().eq().maybeSingle().then = 
      vi.fn().mockImplementation((args) => {
        const payment = mockPayments.find(p => p.team_id === args.team_id);
        return Promise.resolve({ data: payment || null, error: null });
      });
  });

  it('renders league teams page with header', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League - Teams Management')).toBeInTheDocument();
      expect(screen.getByText(/volleyball/i)).toBeInTheDocument();
      expect(screen.getByText(/community center/i)).toBeInTheDocument();
      expect(screen.getByText('$120 + HST per team')).toBeInTheDocument();
    });
  });

  it('displays active teams', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
      expect(screen.getByText('John Captain')).toBeInTheDocument();
      expect(screen.getByText('Jane Captain')).toBeInTheDocument();
    });
  });

  it('displays waitlisted teams', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Gamma')).toBeInTheDocument();
      expect(screen.getByText('Bob Captain')).toBeInTheDocument();
      expect(screen.getByText('Waitlisted')).toBeInTheDocument();
    });
  });

  it('shows payment status for teams', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      // Team Alpha - fully paid
      const teamAlpha = screen.getByText('Team Alpha').closest('.bg-white');
      expect(within(teamAlpha!).getByText('$120.00 / $135.60')).toBeInTheDocument();
      
      // Team Beta - partially paid
      const teamBeta = screen.getByText('Team Beta').closest('.bg-white');
      expect(within(teamBeta!).getByText('$60.00 / $135.60')).toBeInTheDocument();
    });
  });

  it('allows searching teams', async () => {
    const user = userEvent.setup();
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search teams/i);
    await user.type(searchInput, 'alpha');
    
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Gamma')).not.toBeInTheDocument();
  });

  it('handles team deletion', async () => {
    const user = userEvent.setup();
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    // Mock confirm dialog
    window.confirm = vi.fn().mockReturnValue(true);
    
    mockSupabase.from('teams').delete().eq().then = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });
    
    const teamAlpha = screen.getByText('Team Alpha').closest('.bg-white');
    const deleteButton = within(teamAlpha!).getByRole('button', { name: /delete team/i });
    
    await user.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to delete the team "Team Alpha"')
    );
    
    await waitFor(() => {
      expect(mockSupabase.from('teams').delete).toHaveBeenCalled();
    });
  });

  it('handles moving team to waitlist', async () => {
    const user = userEvent.setup();
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    window.confirm = vi.fn().mockReturnValue(true);
    
    mockSupabase.from('teams').update({ active: false }).eq().then = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });
    
    const teamAlpha = screen.getByText('Team Alpha').closest('.bg-white');
    const moveButton = within(teamAlpha!).getByRole('button', { name: /move to waitlist/i });
    
    await user.click(moveButton);
    
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('move to waitlist the team "Team Alpha"')
    );
    
    await waitFor(() => {
      expect(mockSupabase.from('teams').update).toHaveBeenCalledWith({ active: false });
    });
  });

  it('handles activating waitlisted team', async () => {
    const user = userEvent.setup();
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    window.confirm = vi.fn().mockReturnValue(true);
    
    mockSupabase.from('teams').update({ active: true }).eq().then = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Gamma')).toBeInTheDocument();
    });
    
    const teamGamma = screen.getByText('Team Gamma').closest('.bg-white');
    const activateButton = within(teamGamma!).getByRole('button', { name: /move to active/i });
    
    await user.click(activateButton);
    
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('activate from waitlist the team "Team Gamma"')
    );
    
    await waitFor(() => {
      expect(mockSupabase.from('teams').update).toHaveBeenCalledWith({ active: true });
    });
  });

  it('navigates to team edit page', async () => {
    const user = userEvent.setup();
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });
    
    const teamAlpha = screen.getByText('Team Alpha').closest('.bg-white');
    const editLink = within(teamAlpha!).getByRole('link', { name: /edit registration/i });
    
    await user.click(editLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/my-account/teams/edit/1');
  });

  it('shows loading state', () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    // Make promises hang
    mockSupabase.from('leagues').select().eq().single().then = vi.fn(() => new Promise(() => {}));
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    mockSupabase.from('leagues').select().eq().single().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to load league data' },
    });
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load league data')).toBeInTheDocument();
    });
  });

  it('shows empty state when no teams', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    // Mock empty teams
    mockSupabase.from('teams').select().eq('league_id', 1).eq('active', true).order().then = 
      vi.fn().mockResolvedValue({ data: [], error: null });
    
    mockSupabase.from('teams').select().eq('league_id', 1).eq('active', false).order().then = 
      vi.fn().mockResolvedValue({ data: [], error: null });
    
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText('No Teams Registered')).toBeInTheDocument();
      expect(screen.getByText('No teams have registered for this league yet.')).toBeInTheDocument();
    });
  });

  it('requires admin access', async () => {
    // Non-admin user
    render(<LeagueTeamsPage />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    // Should redirect since route requires admin
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});