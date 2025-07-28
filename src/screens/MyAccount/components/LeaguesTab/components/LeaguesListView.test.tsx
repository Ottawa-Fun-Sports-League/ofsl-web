import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LeaguesListView } from './LeaguesListView';
import { LeagueWithTeamCount } from '../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../../lib/leagues', () => ({
  getDayName: vi.fn((day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }),
  formatLeagueDates: vi.fn((start, end) => {
    const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startDate} - ${endDate}`;
  }),
  getGymNamesByLocation: vi.fn(() => []),
  getPrimaryLocation: vi.fn((gyms) => {
    if (!gyms || gyms.length === 0) return [];
    const locations = [...new Set(gyms.map(g => g.location))];
    return locations;
  }),
}));

const mockLeagues: LeagueWithTeamCount[] = [
  {
    id: 1,
    name: 'Summer Volleyball League',
    sport_name: 'Volleyball',
    day_of_week: 1,
    start_date: '2024-06-01',
    end_date: '2024-08-31',
    cost: 750,
    spots_remaining: 5,
    team_count: 8,
    gyms: [
      { id: 1, name: 'Sandy Hill Community Centre', location: 'Central' },
      { id: 2, name: 'Rideau Sports Centre', location: 'East' }
    ],
    hide_day: false,
  },
  {
    id: 2,
    name: 'Fall Badminton League',
    sport_name: 'Badminton',
    day_of_week: 3,
    start_date: '2024-09-01',
    end_date: '2024-11-30',
    cost: 120,
    spots_remaining: 0,
    team_count: 16,
    gyms: [],
    hide_day: false,
  },
];

describe('LeaguesListView', () => {
  const mockOnDelete = vi.fn();
  const mockOnCopy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no leagues', () => {
    render(
      <BrowserRouter>
        <LeaguesListView
          leagues={[]}
          onDelete={mockOnDelete}
          onCopy={mockOnCopy}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('No leagues found')).toBeInTheDocument();
    expect(screen.getByText('Create your first league to get started.')).toBeInTheDocument();
  });

  it('renders table with all league information', () => {
    render(
      <BrowserRouter>
        <LeaguesListView
          leagues={mockLeagues}
          onDelete={mockOnDelete}
          onCopy={mockOnCopy}
        />
      </BrowserRouter>
    );

    // Check table headers
    expect(screen.getByText('League')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check first league data
    expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    // Check that date ranges are shown (exact format may vary based on timezone)
    const dateRanges = screen.getAllByText(/2024.*2024/);
    expect(dateRanges.length).toBeGreaterThan(0);
    expect(screen.getByText('$750 + HST')).toBeInTheDocument();
    expect(screen.getByText('per team')).toBeInTheDocument();
    expect(screen.getByText('5 spots left')).toBeInTheDocument();
    expect(screen.getByText('Central')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
    
    // Check second league data
    expect(screen.getByText('Fall Badminton League')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('shows correct sport icons', () => {
    render(
      <BrowserRouter>
        <LeaguesListView
          leagues={mockLeagues}
          onDelete={mockOnDelete}
          onCopy={mockOnCopy}
        />
      </BrowserRouter>
    );

    const volleyballIcon = screen.getByAltText('Volleyball icon');
    expect(volleyballIcon).toHaveAttribute('src', '/Volleyball.png');

    const badmintonIcon = screen.getByAltText('Badminton icon');
    expect(badmintonIcon).toHaveAttribute('src', '/Badminton.png');
  });

  it('shows team count badges', () => {
    render(
      <BrowserRouter>
        <LeaguesListView
          leagues={mockLeagues}
          onDelete={mockOnDelete}
          onCopy={mockOnCopy}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
  });

  it('handles action button clicks', () => {
    render(
      <BrowserRouter>
        <LeaguesListView
          leagues={mockLeagues}
          onDelete={mockOnDelete}
          onCopy={mockOnCopy}
        />
      </BrowserRouter>
    );

    // Click teams button
    const teamsButtons = screen.getAllByRole('button');
    const firstTeamsButton = teamsButtons.find(btn => btn.querySelector('.lucide-users'));
    expect(firstTeamsButton).toBeDefined();
    fireEvent.click(firstTeamsButton!);
    expect(mockNavigate).toHaveBeenCalledWith('/leagues/1/teams');

    // Click copy button
    const copyButtons = teamsButtons.filter(btn => btn.querySelector('.lucide-copy'));
    expect(copyButtons.length).toBeGreaterThan(0);
    fireEvent.click(copyButtons[0]);
    expect(mockOnCopy).toHaveBeenCalledWith(mockLeagues[0]);

    // Click delete button
    const deleteButtons = teamsButtons.filter(btn => btn.querySelector('.lucide-trash2'));
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('applies correct spot availability colors', () => {
    const leaguesWithDifferentSpots: LeagueWithTeamCount[] = [
      { ...mockLeagues[0], spots_remaining: 0 }, // Full - red
      { ...mockLeagues[0], id: 3, spots_remaining: 1 }, // 1 spot - orange
      { ...mockLeagues[0], id: 4, spots_remaining: 10 }, // Many spots - green
    ];

    render(
      <BrowserRouter>
        <LeaguesListView
          leagues={leaguesWithDifferentSpots}
          onDelete={mockOnDelete}
          onCopy={mockOnCopy}
        />
      </BrowserRouter>
    );

    const fullBadge = screen.getByText('Full');
    expect(fullBadge).toHaveClass('bg-red-100', 'text-red-800');

    const oneSpotBadge = screen.getByText('1 spot left');
    expect(oneSpotBadge).toHaveClass('bg-orange-100', 'text-orange-800');

    const manySpotsadge = screen.getByText('10 spots left');
    expect(manySpotsadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  describe('Sorting functionality', () => {
    it('sorts by league name', () => {
      render(
        <BrowserRouter>
          <LeaguesListView
            leagues={mockLeagues}
            onDelete={mockOnDelete}
            onCopy={mockOnCopy}
          />
        </BrowserRouter>
      );

      const leagueHeader = screen.getByText('League').closest('th');
      expect(leagueHeader).toBeDefined();

      // Get initial order
      const rows = screen.getAllByRole('row');
      const firstRowInitial = within(rows[1]).getByText('Summer Volleyball League');
      expect(firstRowInitial).toBeInTheDocument();

      // Click to sort ascending
      fireEvent.click(leagueHeader!);
      
      // Wait for re-render and check for sort indicator
      const sortedHeader = screen.getByText('League').closest('th');
      expect(within(sortedHeader!).getByTestId('lucide-chevron-up')).toBeInTheDocument();

      // Click again to sort descending
      fireEvent.click(sortedHeader!);
      const descHeader = screen.getByText('League').closest('th');
      expect(within(descHeader!).getByTestId('lucide-chevron-down')).toBeInTheDocument();
    });

    it('sorts by schedule (start date)', () => {
      render(
        <BrowserRouter>
          <LeaguesListView
            leagues={mockLeagues}
            onDelete={mockOnDelete}
            onCopy={mockOnCopy}
          />
        </BrowserRouter>
      );

      const scheduleHeader = screen.getByText('Schedule').closest('th');
      expect(scheduleHeader).toBeDefined();

      // Click to sort by date
      fireEvent.click(scheduleHeader!);
      
      // Wait for re-render and check for sort indicator
      const sortedScheduleHeader = screen.getByText('Schedule').closest('th');
      expect(within(sortedScheduleHeader!).getByTestId('lucide-chevron-up')).toBeInTheDocument();
    });

    it('sorts by availability (spots remaining)', () => {
      const leaguesWithVariedSpots: LeagueWithTeamCount[] = [
        { ...mockLeagues[0], id: 1, name: 'League A', spots_remaining: 10 },
        { ...mockLeagues[0], id: 2, name: 'League B', spots_remaining: 0 },
        { ...mockLeagues[0], id: 3, name: 'League C', spots_remaining: 5 },
      ];

      render(
        <BrowserRouter>
          <LeaguesListView
            leagues={leaguesWithVariedSpots}
            onDelete={mockOnDelete}
            onCopy={mockOnCopy}
          />
        </BrowserRouter>
      );

      const availabilityHeader = screen.getByText('Availability').closest('th');
      
      // Initially should be unsorted
      const initialBadges = screen.getAllByText(/spots left|Full/);
      expect(initialBadges).toHaveLength(3);

      // Click to sort ascending (least spots first)
      fireEvent.click(availabilityHeader!);
      
      // Check that header shows sorting indicator
      const sortedAvailHeader = screen.getByText('Availability').closest('th');
      expect(within(sortedAvailHeader!).getByTestId('lucide-chevron-up')).toBeInTheDocument();

      // Click again for descending
      fireEvent.click(sortedAvailHeader!);
      
      // Check that header shows descending indicator
      const descAvailHeader = screen.getByText('Availability').closest('th');
      expect(within(descAvailHeader!).getByTestId('lucide-chevron-down')).toBeInTheDocument();
    });

    it('shows sort indicators correctly', () => {
      render(
        <BrowserRouter>
          <LeaguesListView
            leagues={mockLeagues}
            onDelete={mockOnDelete}
            onCopy={mockOnCopy}
          />
        </BrowserRouter>
      );

      const leagueHeader = screen.getByText('League').closest('th');
      const locationHeader = screen.getByText('Location').closest('th');

      // Sortable headers should have neutral indicator
      expect(within(leagueHeader!).getByTestId('lucide-chevrons-up-down')).toBeInTheDocument();
      
      // Non-sortable headers should not have indicators
      expect(within(locationHeader!).queryByTestId('lucide-chevrons-up-down')).not.toBeInTheDocument();
    });
  });
});