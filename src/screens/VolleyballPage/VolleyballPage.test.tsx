import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VolleyballPage } from './VolleyballPage';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

describe('VolleyballPage', () => {
  const mockVolleyballLeagues = [
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
      sports: { name: 'Volleyball' },
      skills: { name: 'Recreational' },
    },
    {
      id: 2,
      name: 'Competitive Volleyball League',
      sport_id: 1,
      location: 'Sports Complex',
      start_date: '2024-04-01',
      end_date: '2024-06-01',
      registration_deadline: '2024-03-15',
      cost: 150,
      max_teams: 8,
      active: true,
      sports: { name: 'Volleyball' },
      skills: { name: 'Competitive' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock volleyball sport fetch
    mockSupabase.from('sports').select().eq('name', 'Volleyball').single().then = vi.fn().mockResolvedValue({
      data: { id: 1, name: 'Volleyball' },
      error: null,
    });
    
    // Mock volleyball leagues fetch
    mockSupabase.from('leagues').select().eq('sport_id', 1).eq('active', true).order().then = vi.fn().mockResolvedValue({
      data: mockVolleyballLeagues,
      error: null,
    });
  });

  it('renders volleyball page header and description', async () => {
    render(<VolleyballPage />);
    
    expect(screen.getByRole('heading', { name: /volleyball leagues/i })).toBeInTheDocument();
    expect(screen.getByText(/join our volleyball community/i)).toBeInTheDocument();
    expect(screen.getByText(/perfect for all skill levels/i)).toBeInTheDocument();
  });

  it('displays volleyball-specific information', () => {
    render(<VolleyballPage />);
    
    expect(screen.getByText(/league format/i)).toBeInTheDocument();
    expect(screen.getByText(/6v6 co-ed teams/i)).toBeInTheDocument();
    expect(screen.getByText(/skill levels/i)).toBeInTheDocument();
    expect(screen.getByText(/recreational.*competitive.*intermediate/i)).toBeInTheDocument();
  });

  it('displays volleyball leagues', async () => {
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
      expect(screen.getByText('Competitive Volleyball League')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/community center/i)).toBeInTheDocument();
    expect(screen.getByText(/sports complex/i)).toBeInTheDocument();
    expect(screen.getByText('$120')).toBeInTheDocument();
    expect(screen.getByText('$150')).toBeInTheDocument();
  });

  it('shows loading state while fetching leagues', () => {
    // Make the promise hang to see loading state
    mockSupabase.from('leagues').select().eq().eq().order().then = vi.fn(() => new Promise(() => {}));
    
    render(<VolleyballPage />);
    
    expect(screen.getByTestId('leagues-loading')).toBeInTheDocument();
  });

  it('handles error when fetching leagues fails', async () => {
    mockSupabase.from('leagues').select().eq().eq().order().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch leagues' },
    });
    
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load leagues/i)).toBeInTheDocument();
    });
  });

  it('navigates to league detail when clicking on a league', async () => {
    const user = userEvent.setup();
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Spring Volleyball League')).toBeInTheDocument();
    });
    
    const leagueCard = screen.getByText('Spring Volleyball League').closest('div[role="article"]');
    const registerButton = leagueCard!.querySelector('a');
    await user.click(registerButton!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/leagues/1');
  });

  it('displays skill level badges', async () => {
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Recreational')).toBeInTheDocument();
      expect(screen.getByText('Competitive')).toBeInTheDocument();
    });
  });

  it('shows message when no leagues are available', async () => {
    mockSupabase.from('leagues').select().eq().eq().order().then = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no volleyball leagues available/i)).toBeInTheDocument();
      expect(screen.getByText(/check back soon/i)).toBeInTheDocument();
    });
  });

  it('displays rules and standards link', () => {
    render(<VolleyballPage />);
    
    const rulesLink = screen.getByRole('link', { name: /view volleyball rules/i });
    expect(rulesLink).toBeInTheDocument();
    expect(rulesLink).toHaveAttribute('href', '/standards-of-play#volleyball');
  });

  it('displays registration deadline for leagues', async () => {
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/registration deadline:/i)).toBeInTheDocument();
      // Check that dates are formatted
      expect(screen.getByText(/feb 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/mar 15, 2024/i)).toBeInTheDocument();
    });
  });

  it('displays team capacity information', async () => {
    render(<VolleyballPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/12 teams max/i)).toBeInTheDocument();
      expect(screen.getByText(/8 teams max/i)).toBeInTheDocument();
    });
  });
});