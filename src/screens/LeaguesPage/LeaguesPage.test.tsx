import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaguesPage } from './LeaguesPage';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

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
    // Mock leagues fetch
    mockSupabase.from('leagues').select().eq('active', true).order().then = vi.fn().mockResolvedValue({
      data: mockLeagues,
      error: null,
    });
    
    // Mock sports fetch
    mockSupabase.from('sports').select().order().then = vi.fn().mockResolvedValue({
      data: mockSports,
      error: null,
    });
  });

  it('renders leagues page with header', async () => {
    render(<LeaguesPage />);
    
    expect(screen.getByRole('heading', { name: /all leagues/i })).toBeInTheDocument();
    expect(screen.getByText(/browse all available leagues/i)).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /all sports/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /volleyball/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /badminton/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pickleball/i })).toBeInTheDocument();
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
    
    // Click volleyball filter
    const volleyballFilter = screen.getByRole('button', { name: /volleyball/i });
    await user.click(volleyballFilter);
    
    // Only volleyball leagues should be visible
    expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    expect(screen.queryByText('Summer Badminton League')).not.toBeInTheDocument();
    expect(screen.queryByText('Fall Pickleball League')).not.toBeInTheDocument();
  });

  it('shows all leagues when clicking All Sports filter', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    // Filter by volleyball first
    const volleyballFilter = screen.getByRole('button', { name: /volleyball/i });
    await user.click(volleyballFilter);
    
    // Then click all sports
    const allSportsFilter = screen.getByRole('button', { name: /all sports/i });
    await user.click(allSportsFilter);
    
    // All leagues should be visible again
    expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
    expect(screen.getByText('Fall Pickleball League')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<LeaguesPage />);
    
    const searchInput = screen.getByPlaceholderText(/search leagues/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('filters leagues by search term', async () => {
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

  it('shows loading state while fetching leagues', () => {
    // Make the promise hang to see loading state
    mockSupabase.from('leagues').select().eq().order().then = vi.fn(() => new Promise(() => {}));
    
    render(<LeaguesPage />);
    
    expect(screen.getByTestId('leagues-loading')).toBeInTheDocument();
  });

  it('handles error when fetching leagues fails', async () => {
    mockSupabase.from('leagues').select().eq().order().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch leagues' },
    });
    
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load leagues/i)).toBeInTheDocument();
    });
  });

  it('shows message when no leagues match filters', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search leagues/i);
    await user.type(searchInput, 'nonexistent league');
    
    expect(screen.getByText(/no leagues found/i)).toBeInTheDocument();
  });

  it('navigates to league detail page when clicking on a league', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    const leagueCard = screen.getByText('Spring Volleyball League').closest('div[role="article"]');
    const viewDetailsButton = leagueCard!.querySelector('a');
    await user.click(viewDetailsButton!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/leagues/1');
  });

  it('displays league information correctly', async () => {
    render(<LeaguesPage />);
    
    await waitFor(() => {
      // League names
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      
      // Locations
      expect(screen.getByText(/community center/i)).toBeInTheDocument();
      
      // Costs
      expect(screen.getByText('$120')).toBeInTheDocument();
      expect(screen.getByText('$80')).toBeInTheDocument();
      expect(screen.getByText('$60')).toBeInTheDocument();
      
      // Skill levels
      expect(screen.getByText('Recreational')).toBeInTheDocument();
      expect(screen.getByText('All Levels')).toBeInTheDocument();
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
  });

  it('combines sport filter and search', async () => {
    const user = userEvent.setup();
    render(<LeaguesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    // Filter by volleyball
    const volleyballFilter = screen.getByRole('button', { name: /volleyball/i });
    await user.click(volleyballFilter);
    
    // Search for "spring"
    const searchInput = screen.getByPlaceholderText(/search leagues/i);
    await user.type(searchInput, 'spring');
    
    // Only Spring Volleyball League should be visible
    expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    expect(screen.queryByText('Summer Badminton League')).not.toBeInTheDocument();
    expect(screen.queryByText('Fall Pickleball League')).not.toBeInTheDocument();
  });
});