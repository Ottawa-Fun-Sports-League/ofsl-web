import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from './HomePage';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

describe('HomePage', () => {
  const mockLeagues = [
    {
      id: 1,
      name: 'Spring Volleyball League',
      sport_id: 1,
      location: 'Community Center',
      start_date: '2024-03-01',
      end_date: '2024-05-01',
      registration_deadline: '2024-02-15',
      active: true,
      sports: { name: 'Volleyball' },
    },
    {
      id: 2,
      name: 'Summer Badminton League',
      sport_id: 2,
      location: 'Sports Complex',
      start_date: '2024-06-01',
      end_date: '2024-08-01',
      registration_deadline: '2024-05-15',
      active: true,
      sports: { name: 'Badminton' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful leagues fetch
    mockSupabase.from('leagues').select().eq().order().then = vi.fn().mockResolvedValue({
      data: mockLeagues,
      error: null,
    });
  });

  it('renders hero section with all elements', async () => {
    render(<HomePage />);
    
    expect(screen.getByText(/ottawa fun sports league/i)).toBeInTheDocument();
    expect(screen.getByText(/join ottawa's premier adult recreational sports/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /join a league/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument();
  });

  it('displays upcoming leagues', async () => {
    render(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/community center/i)).toBeInTheDocument();
    expect(screen.getByText(/sports complex/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching leagues', () => {
    // Make the promise hang to see loading state
    mockSupabase.from('leagues').select().eq().order().then = vi.fn(() => new Promise(() => {}));
    
    render(<HomePage />);
    
    expect(screen.getByTestId('leagues-loading')).toBeInTheDocument();
  });

  it('handles error when fetching leagues fails', async () => {
    mockSupabase.from('leagues').select().eq().order().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch leagues' },
    });
    
    render(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load leagues/i)).toBeInTheDocument();
    });
  });

  it('navigates to leagues page when clicking Join a League', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    
    const joinLeagueButton = screen.getByRole('link', { name: /join a league/i });
    await user.click(joinLeagueButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/leagues');
  });

  it('navigates to about page when clicking Learn More', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    
    const learnMoreButton = screen.getByRole('link', { name: /learn more/i });
    await user.click(learnMoreButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/about-us');
  });

  it('displays sport categories with links', () => {
    render(<HomePage />);
    
    expect(screen.getByRole('heading', { name: /our sports/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volleyball/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /badminton/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pickleball/i })).toBeInTheDocument();
  });

  it('displays features section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/why choose ofsl/i)).toBeInTheDocument();
    expect(screen.getByText(/organized leagues/i)).toBeInTheDocument();
    expect(screen.getByText(/all skill levels/i)).toBeInTheDocument();
    expect(screen.getByText(/social atmosphere/i)).toBeInTheDocument();
  });

  it('displays call to action section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/ready to play/i)).toBeInTheDocument();
    expect(screen.getByText(/join thousands of players/i)).toBeInTheDocument();
    
    const ctaButton = screen.getAllByRole('link', { name: /browse leagues/i })[0];
    expect(ctaButton).toBeInTheDocument();
  });

  it('filters and displays only active leagues', async () => {
    const mixedLeagues = [
      ...mockLeagues,
      {
        id: 3,
        name: 'Inactive League',
        sport_id: 1,
        location: 'Old Gym',
        start_date: '2024-01-01',
        end_date: '2024-02-01',
        registration_deadline: '2023-12-15',
        active: false,
        sports: { name: 'Volleyball' },
      },
    ];
    
    mockSupabase.from('leagues').select().eq().order().then = vi.fn().mockResolvedValue({
      data: mixedLeagues,
      error: null,
    });
    
    render(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Summer Badminton League')).toBeInTheDocument();
    });
    
    // Inactive league should not be displayed
    expect(screen.queryByText('Inactive League')).not.toBeInTheDocument();
  });

  it('shows message when no leagues are available', async () => {
    mockSupabase.from('leagues').select().eq().order().then = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    
    render(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no upcoming leagues at the moment/i)).toBeInTheDocument();
    });
  });

  it('navigates to league detail page when clicking on a league', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    const leagueCard = screen.getByText('Spring Volleyball League').closest('a');
    await user.click(leagueCard!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/leagues/1');
  });
});