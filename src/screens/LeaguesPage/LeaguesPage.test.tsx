import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

// Mock the league functions
vi.mock('../../lib/leagues', () => ({
  fetchLeagues: vi.fn(),
  fetchSports: vi.fn(),
  fetchSkills: vi.fn(),
  getDayName: vi.fn((day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }),
  formatLeagueDates: vi.fn((start, end) => `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`),
  getPrimaryLocation: vi.fn(() => ['Community Center']),
  getGymNamesByLocation: vi.fn(() => ['Main Gym']),
  groupLeaguesByDay: vi.fn((leagues) => {
    // Simple mock implementation that groups leagues by day
    const groups: Record<number, unknown[]> = {};
    leagues.forEach((league: { day_of_week?: number }) => {
      const day = league.day_of_week || 0;
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(league);
    });
    return groups;
  }),
  LeagueWithTeamCount: {},
}));

// Import after mocking
import { LeaguesPage } from './LeaguesPage';
import { fetchLeagues, fetchSports, fetchSkills } from '../../lib/leagues';

const mockFetchLeagues = fetchLeagues as ReturnType<typeof vi.fn>;
const mockFetchSports = fetchSports as ReturnType<typeof vi.fn>;
const mockFetchSkills = fetchSkills as ReturnType<typeof vi.fn>;

// Mock the auth context to prevent loading state
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    loading: false,
    profileComplete: false,
    emailVerified: false,
    isNewUser: false,
    setIsNewUser: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    checkProfileCompletion: vi.fn(),
    refreshUserProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LeaguesPage', () => {
  const mockLeagues = [
    {
      id: 1,
      name: 'Spring Volleyball League',
      sport_id: 1,
      location: 'Community Center',
      start_date: '2024-03-01',
      end_date: '2024-05-01',
      registration_deadline: '2024-02-15',
      cost: 120,
      max_teams: 12,
      active: true,
      sports: { id: 1, name: 'Volleyball' },
      skills: { name: 'Recreational' },
    },
    {
      id: 2,
      name: 'Summer Badminton League',
      sport_id: 2,
      location: 'Sports Complex',
      start_date: '2024-06-01',
      end_date: '2024-08-01',
      registration_deadline: '2024-05-15',
      cost: 80,
      max_teams: 16,
      active: true,
      sports: { id: 2, name: 'Badminton' },
      skills: { name: 'All Levels' },
    },
    {
      id: 3,
      name: 'Fall Pickleball League',
      sport_id: 3,
      location: 'Recreation Center',
      start_date: '2024-09-01',
      end_date: '2024-11-01',
      registration_deadline: '2024-08-15',
      cost: 60,
      max_teams: 20,
      active: true,
      sports: { id: 3, name: 'Pickleball' },
      skills: { name: 'Beginner' },
    },
  ];

  const mockSports = [
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' },
    { id: 3, name: 'Pickleball' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth session to prevent loading state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    // Mock auth state change to immediately return null session
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Immediately call callback with no session
      if (callback) {
        callback('INITIAL_SESSION', null);
      }
      return {
        data: { 
          subscription: { 
            unsubscribe: vi.fn() 
          } 
        },
      };
    });
    
    // Mock the fetch functions with proper data including spots_remaining
    const mockLeaguesWithSpots = mockLeagues.map(league => ({
      ...league,
      spots_remaining: 10,
      team_count: 2,
      sport_name: league.sports.name,
      skill_name: league.skills.name,
      gyms: [],
    }));
    
    mockFetchLeagues.mockResolvedValue(mockLeaguesWithSpots);
    mockFetchSports.mockResolvedValue(mockSports);
    mockFetchSkills.mockResolvedValue([
      { id: 1, name: 'Recreational' },
      { id: 2, name: 'All Levels' },
      { id: 3, name: 'Beginner' },
    ]);
  });

  it('renders leagues page with header', async () => {
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /find a league/i })).toBeInTheDocument();
    });
  });

  it('displays all active leagues', async () => {
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
      expect(screen.getByText('Fall Pickleball League')).toBeInTheDocument();
    });
  });

  it('displays sport filter buttons', async () => {
    render(<LeaguesPage />);
    
    await waitFor(() => {
      // Sport buttons are now individual buttons without "All Sports"
      // There might be multiple instances (mobile and desktop), so use getAllBy
      const volleyballButtons = screen.getAllByRole('button', { name: /volleyball/i });
      const badmintonButtons = screen.getAllByRole('button', { name: /badminton/i });
      const pickleballButtons = screen.getAllByRole('button', { name: /pickleball/i });
      
      expect(volleyballButtons.length).toBeGreaterThan(0);
      expect(badmintonButtons.length).toBeGreaterThan(0);
      expect(pickleballButtons.length).toBeGreaterThan(0);
    });
  });

  it('filters leagues by sport', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
      expect(screen.getByText('Fall Pickleball League')).toBeInTheDocument();
    });
    
    // Click volleyball filter (get the first one if multiple exist)
    const volleyballFilters = screen.getAllByRole('button', { name: /volleyball/i });
    await user.click(volleyballFilters[0]);
    
    // Only volleyball leagues should be visible
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.queryByText('Summer Badminton League')).not.toBeInTheDocument();
      expect(screen.queryByText('Fall Pickleball League')).not.toBeInTheDocument();
    });
  });

  it('shows only selected sport leagues when clicking sport filter', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
      expect(screen.getByText('Fall Pickleball League')).toBeInTheDocument();
    });
    
    // Filter by volleyball (get the first one if multiple exist)
    const volleyballFilters = screen.getAllByRole('button', { name: /volleyball/i });
    await user.click(volleyballFilters[0]);
    
    // Only volleyball leagues should be visible
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.queryByText('Summer Badminton League')).not.toBeInTheDocument();
      expect(screen.queryByText('Fall Pickleball League')).not.toBeInTheDocument();
    });
  });

  // Search functionality has been removed from the current implementation
  it.skip('displays search input', () => {
    render(<LeaguesPage />);
    
    const searchInput = screen.getByPlaceholderText(/search leagues/i);
    expect(searchInput).toBeInTheDocument();
  });

  // Search functionality has been removed from the current implementation
  it.skip('filters leagues by search term', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search leagues/i);
    await user.type(searchInput, 'volleyball');
    
    // Only volleyball league should be visible
    expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    expect(screen.queryByText('Summer Badminton League')).not.toBeInTheDocument();
    expect(screen.queryByText('Fall Pickleball League')).not.toBeInTheDocument();
  });

  it('shows loading state while fetching leagues', async () => {
    // Make the promise hang to see loading state
    mockFetchLeagues.mockImplementation(() => new Promise(() => {}));
    
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /find a league/i })).toBeInTheDocument();
    });
    
    // Check for loading spinner
    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner).toBeInTheDocument();
  });

  it('handles error when fetching leagues fails', async () => {
    mockFetchLeagues.mockRejectedValue(new Error('Failed to fetch leagues'));
    
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load leagues/i)).toBeInTheDocument();
    });
  });

  it('shows message when no leagues match filters', async () => {
    // Test with empty league data
    mockFetchLeagues.mockResolvedValue([]);
    
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no leagues match your filters/i)).toBeInTheDocument();
    });
  });

  it('navigates to league detail page when clicking on a league', async () => {
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    // The entire card is a link now
    const leagueLink = screen.getByText('Spring Volleyball League').closest('a');
    expect(leagueLink).toHaveAttribute('href', '/leagues/1');
  });

  it('displays league information correctly', async () => {
    render(<LeaguesPage />);
    
    await waitFor(() => {
      // League names
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
      expect(screen.getByText('Fall Pickleball League')).toBeInTheDocument();
      
      // Locations (there might be multiple)
      const communityLocations = screen.getAllByText(/community center/i);
      expect(communityLocations.length).toBeGreaterThan(0);
      
      // Costs - check for the cost values with currency and additional text
      expect(screen.getByText(/\$120.*per team/i)).toBeInTheDocument();
      expect(screen.getByText(/\$80.*per player/i)).toBeInTheDocument();
      expect(screen.getByText(/\$60.*per player/i)).toBeInTheDocument();
    });
  });

  // Search functionality has been removed from the current implementation
  it.skip('combines sport filter and search', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    // Filter by volleyball (get the first one if multiple exist)
    const volleyballFilters = screen.getAllByRole('button', { name: /volleyball/i });
    await user.click(volleyballFilters[0]);
    
    // Search for "spring"
    const searchInput = screen.getByPlaceholderText(/search leagues/i);
    await user.type(searchInput, 'spring');
    
    // Only Spring Volleyball League should be visible
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.queryByText('Summer Badminton League')).not.toBeInTheDocument();
      expect(screen.queryByText('Fall Pickleball League')).not.toBeInTheDocument();
    });
  });
});