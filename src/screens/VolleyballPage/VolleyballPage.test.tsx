import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { VolleyballPage } from './VolleyballPage';
import { render } from '../../test/test-utils';

// Mock auth context to prevent loading state
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    profileComplete: false,
    userProfile: null,
    refreshUserProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('VolleyballPage', () => {
  it('renders volleyball page header and description', () => {
    render(<VolleyballPage />);
    
    expect(screen.getByRole('heading', { name: 'Volleyball Leagues', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/OFSL's volleyball leagues are organized to provide/i)).toBeInTheDocument();
  });

  it('displays find a league section', () => {
    render(<VolleyballPage />);
    
    expect(screen.getByRole('heading', { name: /find a league for you/i })).toBeInTheDocument();
    expect(screen.getByText(/OFSL offers a variety of league nights across four divisions/i)).toBeInTheDocument();
  });

  it('displays volleyball league cards', () => {
    render(<VolleyballPage />);
    
    // Check for specific league cards
    expect(screen.getByText("Tuesday Women's Elite")).toBeInTheDocument();
    expect(screen.getByText("Sunday Mixed League")).toBeInTheDocument();
    expect(screen.getByText("OFSL Men's League")).toBeInTheDocument();
    expect(screen.getByText("OFSL Women's League")).toBeInTheDocument();
  });

  it('displays register now and schedule & standings buttons', () => {
    render(<VolleyballPage />);
    
    // Get all register buttons and check the first one (in the hero banner)
    const registerButtons = screen.getAllByRole('link', { name: /register now/i });
    expect(registerButtons.length).toBeGreaterThan(0);
    expect(registerButtons[0]).toHaveAttribute('href', '/leagues?sport=Volleyball');
    
    const scheduleButton = screen.getByRole('link', { name: /schedule & standings/i });
    expect(scheduleButton).toBeInTheDocument();
    expect(scheduleButton).toHaveAttribute('href', '/login?redirect=/my-account/teams');
  });

  it('displays standards of play section', () => {
    render(<VolleyballPage />);
    
    expect(screen.getByRole('heading', { name: /standards of play/i })).toBeInTheDocument();
    const viewRulesButton = screen.getByRole('link', { name: /view rules/i });
    expect(viewRulesButton).toBeInTheDocument();
    expect(viewRulesButton).toHaveAttribute('href', '/standards-of-play');
  });

  it('displays about volleyball leagues section', () => {
    render(<VolleyballPage />);
    
    expect(screen.getByRole('heading', { name: /about our volleyball leagues/i })).toBeInTheDocument();
    expect(screen.getByText(/Separated by tiers which are updated every week/i)).toBeInTheDocument();
  });

  it('navigates to correct league when clicking league card', async () => {
    render(<VolleyballPage />);
    
    const eliteCard = screen.getByRole('link', { name: /tuesday women's elite/i });
    expect(eliteCard).toHaveAttribute('href', '/leagues?sport=Volleyball&day=Tuesday&level=Elite');
    
    const mixedCard = screen.getByRole('link', { name: /sunday mixed league/i });
    expect(mixedCard).toHaveAttribute('href', '/leagues?sport=Volleyball&day=Sunday&gender=Mixed');
  });

  it('shows schedule & standings link for non-logged in users', () => {
    render(<VolleyballPage />);
    
    // When not logged in, should show login redirect
    const scheduleButton = screen.getByRole('link', { name: /schedule & standings/i });
    expect(scheduleButton).toHaveAttribute('href', '/login?redirect=/my-account/teams');
  });

  it('displays all 8 league cards', () => {
    render(<VolleyballPage />);
    
    const expectedLeagues = [
      "Tuesday Women's Elite",
      "Sunday Mixed League",
      "OFSL Men's League",
      "OFSL Women's League",
      "Monday Mixed League",
      "Tuesday Mixed League",
      "Wednesday Mixed League",
      "Thursday Mixed League"
    ];
    
    expectedLeagues.forEach(leagueName => {
      expect(screen.getByText(leagueName)).toBeInTheDocument();
    });
  });

  it('displays league divisions information', () => {
    render(<VolleyballPage />);
    
    // Check that the paragraph containing division information exists
    const paragraphWithDivisions = screen.getByText(/OFSL offers a variety of league nights across four divisions/);
    expect(paragraphWithDivisions).toBeInTheDocument();
    
    // Check that it contains the expected division names
    expect(paragraphWithDivisions.textContent).toMatch(/Women.*Mixed.*Men.*Elite Women/);
    
    // Check for skill levels mentioned
    expect(screen.getByRole('heading', { name: /elite level/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /competitive level/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /advanced level/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /intermediate level/i })).toBeInTheDocument();
  });
});