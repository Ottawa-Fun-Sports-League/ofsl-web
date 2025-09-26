import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ManageTeamsTab } from '../ManageTeamsTab';
import { useAuth } from '../../../../../contexts/AuthContext';

// Mock the auth context
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock supabase with teams data
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            name: `Team ${i + 1}`,
            captain_id: `captain-${i + 1}`,
            roster: Array.from({ length: 5 }, (_, j) => `player-${j + 1}`),
            active: true,
            created_at: new Date(2024, 0, i + 1).toISOString(),
            league_id: 1,
            skill_level_id: 1,
            skills: { id: 1, name: 'Beginner' },
            users: { name: `Captain ${i + 1}`, email: `captain${i + 1}@example.com` }
          })), 
          error: null 
        })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        not: vi.fn(() => ({
          is: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        is: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

describe('ManageTeamsTab Teams Pagination', () => {
  const mockUserProfile = {
    id: 'user-123',
    name: 'Admin User',
    email: 'admin@example.com',
    is_admin: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.mocked(useAuth).mockReturnValue({
      userProfile: mockUserProfile,
      loading: false
    } as ReturnType<typeof useAuth>);
  });

  it('should render Teams tab with pagination controls', async () => {
    render(
      <BrowserRouter>
        <ManageTeamsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Manage Registrations')).toBeInTheDocument();
    });

    // Should be on Teams tab by default
    const teamsTab = screen.getByText(/Teams \(/);
    expect(teamsTab).toHaveClass('text-[#B20000]');

    // Should show pagination controls for 30 teams
    await waitFor(() => {
      expect(screen.getByText('Show')).toBeInTheDocument();
      expect(screen.getByText('per page')).toBeInTheDocument();
      expect(screen.getByText('30 of 30 teams')).toBeInTheDocument();
    });
  });

  it('should show first page of teams by default', async () => {
    render(
      <BrowserRouter>
        <ManageTeamsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show first 25 teams (default page size)
      expect(screen.getByText('Team 1')).toBeInTheDocument();
      expect(screen.getByText('Team 25')).toBeInTheDocument();
      expect(screen.queryByText('Team 26')).not.toBeInTheDocument();
    });
  });

  it('should handle page navigation for teams', async () => {
    render(
      <BrowserRouter>
        <ManageTeamsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team 1')).toBeInTheDocument();
    });

    // Go to page 2
    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    await waitFor(() => {
      // Should show teams 26-30 on page 2
      expect(screen.getByText('Team 26')).toBeInTheDocument();
      expect(screen.getByText('Team 30')).toBeInTheDocument();
      expect(screen.queryByText('Team 1')).not.toBeInTheDocument();
    });
  });

  it('should handle page size changes for teams', async () => {
    render(
      <BrowserRouter>
        <ManageTeamsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team 25')).toBeInTheDocument();
    });

    // Change page size to 50
    const pageSizeSelect = screen.getByDisplayValue('25');
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });

    await waitFor(() => {
      // Should now show all 30 teams on first page
      expect(screen.getByText('Team 30')).toBeInTheDocument();
    });
  });

  it('should switch between card and table view with pagination', async () => {
    render(
      <BrowserRouter>
        <ManageTeamsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team 1')).toBeInTheDocument();
    });

    // Switch to table view
    const tableButton = screen.getByText('Table');
    fireEvent.click(tableButton);

    await waitFor(() => {
      // Should still see pagination and team data
      expect(screen.getByText('Show')).toBeInTheDocument();
      expect(screen.getByText('Team 1')).toBeInTheDocument();
      expect(screen.getByText('Team 25')).toBeInTheDocument();
    });

    // Switch back to card view
    const cardButton = screen.getByText('Card');
    fireEvent.click(cardButton);

    await waitFor(() => {
      // Should still have pagination
      expect(screen.getByText('Show')).toBeInTheDocument();
      expect(screen.getByText('Team 1')).toBeInTheDocument();
    });
  });

  it('should maintain pagination when searching teams', async () => {
    render(
      <BrowserRouter>
        <ManageTeamsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team 1')).toBeInTheDocument();
    });

    // Search for teams
    const searchInput = screen.getByPlaceholderText(/Search by team name/);
    fireEvent.change(searchInput, { target: { value: 'Team 1' } });

    await waitFor(() => {
      // Should see filtered results (Team 1, Team 10-19)
      expect(screen.getByText('Team 1')).toBeInTheDocument();
      expect(screen.getByText('Team 10')).toBeInTheDocument();
      // Pagination should adjust to filtered results
      expect(screen.getByText(/11 of 30 teams/)).toBeInTheDocument();
    });
  });
});
