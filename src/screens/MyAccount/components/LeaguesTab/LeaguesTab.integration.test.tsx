import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LeaguesTab } from '../LeaguesTab';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '123', email: 'admin@test.com' },
    userProfile: { id: '123', is_admin: true },
    signIn: vi.fn(),
    signOut: vi.fn(),
    loading: false,
  }),
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../../lib/leagues', () => ({
  fetchSports: vi.fn().mockResolvedValue([
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' },
  ]),
  fetchSkills: vi.fn().mockResolvedValue([
    { id: 1, name: 'Beginner' },
    { id: 2, name: 'Intermediate' },
  ]),
  getDayName: vi.fn((day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }),
  formatLeagueDates: vi.fn((start, end) => {
    return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
  }),
  getGymNamesByLocation: vi.fn(() => []),
  getPrimaryLocation: vi.fn(() => ['Central']),
}));


const mockLeagues = [
  {
    id: 1,
    name: 'Summer Volleyball League',
    sport_name: 'Volleyball',
    sport_id: 1,
    day_of_week: 1,
    start_date: '2024-06-01',
    end_date: '2024-08-31',
    cost: 750,
    spots_remaining: 5,
    team_count: 8,
    gyms: [{ id: 1, name: 'Sandy Hill CC', location: 'Central' }],
  },
  {
    id: 2,
    name: 'Fall Badminton League',
    sport_name: 'Badminton',
    sport_id: 2,
    day_of_week: 3,
    start_date: '2024-09-01',
    end_date: '2024-11-30',
    cost: 120,
    spots_remaining: 0,
    team_count: 16,
    gyms: [],
  },
];

describe('LeaguesTab - View Toggle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: mockLeagues,
      error: null,
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as unknown as ReturnType<typeof supabase.from>);
    
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
  });

  it('renders with card view by default', async () => {
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    });

    // Check that card view is displayed (grid layout)
    const cardGrid = screen.getByText('Summer Volleyball League').closest('.grid');
    expect(cardGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('switches between card and list views', async () => {
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    });

    // Initially in card view
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Click list view button
    const listButton = screen.getByText('List');
    fireEvent.click(listButton);

    // Should now show table view
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('League')).toBeInTheDocument(); // Table header
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();

    // Click card view button
    const cardButton = screen.getByText('Card');
    fireEvent.click(cardButton);

    // Should be back to card view
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cardGrid = screen.getByText('Summer Volleyball League').closest('.grid');
    expect(cardGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('maintains selected view when data updates', async () => {
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    });

    // Switch to list view
    fireEvent.click(screen.getByText('List'));
    expect(screen.getByRole('table')).toBeInTheDocument();

    // Simulate data refresh (would happen after delete/copy)
    const updatedLeagues = [...mockLeagues, {
      id: 3,
      name: 'Winter Basketball League',
      sport_name: 'Basketball',
      sport_id: 3,
      day_of_week: 5,
      start_date: '2024-12-01',
      end_date: '2025-02-28',
      cost: 600,
      spots_remaining: 10,
      team_count: 4,
      gyms: [],
    }];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: updatedLeagues,
      error: null,
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as unknown as ReturnType<typeof supabase.from>);
    
    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    // View should still be list after data update
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows same data in both views', async () => {
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    });

    // Check data in card view
    expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    expect(screen.getByText('Fall Badminton League')).toBeInTheDocument();
    expect(screen.getByText('$750 + HST')).toBeInTheDocument();
    expect(screen.getByText('5 spots left')).toBeInTheDocument();

    // Switch to list view
    fireEvent.click(screen.getByText('List'));

    // Same data should be visible in list view
    expect(screen.getByText('Summer Volleyball League')).toBeInTheDocument();
    expect(screen.getByText('Fall Badminton League')).toBeInTheDocument();
    expect(screen.getByText('$750 + HST')).toBeInTheDocument();
    expect(screen.getByText('5 spots left')).toBeInTheDocument();
  });
});