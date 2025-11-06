import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { HomePage } from './HomePage';
import { render } from '../../test/test-utils';

// This import ensures the supabase mock is set up
import '../../test/mocks/setup-supabase';
import { supabase } from '../../lib/supabase';

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
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockLeagues,
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);
  });

  it('renders hero section with all elements', async () => {
    render(<HomePage />);
    
    expect(screen.getByText(/Welcome to OFSL!/i)).toBeInTheDocument();
    expect(screen.getByText(/Ottawa's leading adult volleyball and badminton league/i)).toBeInTheDocument();
    // Check for Learn more links - there are multiple
    const learnMoreLinks = screen.getAllByRole('link', { name: /learn more/i });
    expect(learnMoreLinks.length).toBeGreaterThan(0);
  });

  it('cycles through hero banner slides', () => {
    vi.useFakeTimers();
    render(<HomePage />);

    expect(screen.getByText(/Welcome to OFSL!/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText(/Fuel Your Competitive Edge/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('displays league cards', async () => {
    render(<HomePage />);
    
    // Check for league card titles
    expect(screen.getByText("Women's Elite Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Mixed Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Advanced Badminton")).toBeInTheDocument();
  });

  it('displays skills and drills section', () => {
    render(<HomePage />);
    
    // There are multiple headings with this text, so just check one exists
    const skillsHeadings = screen.getAllByRole('heading', { name: /Skills and drills/i });
    expect(skillsHeadings.length).toBeGreaterThan(0);
    expect(screen.getByText(/Whether you're just starting out or a seasoned player/i)).toBeInTheDocument();
  });

  it('displays about us section', () => {
    render(<HomePage />);
    
    expect(screen.getByRole('heading', { name: /About us/i })).toBeInTheDocument();
    expect(screen.getByText(/is dedicated to promoting active living/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /More about us/i })).toBeInTheDocument();
  });

  it('has correct link on Register now button', () => {
    render(<HomePage />);
    
    // There are multiple register now links, check the first one
    const registerButtons = screen.getAllByRole('link', { name: /register now/i });
    expect(registerButtons[0]).toHaveAttribute('href', '/leagues');
  });

  it('has correct link on skills and drills Learn More button', () => {
    render(<HomePage />);
    
    // Get the Learn more links and check the second one (for skills and drills)
    const learnMoreLinks = screen.getAllByRole('link', { name: /learn more/i });
    const skillsLink = learnMoreLinks.find((link) => link.getAttribute('href') === '/skills-and-drills');
    expect(skillsLink).toBeDefined();
    expect(skillsLink).toHaveAttribute('href', '/skills-and-drills');
  });

  it('displays sport categories as league cards', () => {
    render(<HomePage />);
    
    // Check for sport cards
    expect(screen.getByText("Women's Elite Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Mixed Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Advanced Badminton")).toBeInTheDocument();
    expect(screen.getByText("Indoor Pickleball")).toBeInTheDocument();
  });

  it('displays league description', () => {
    render(<HomePage />);
    
    // Check for league description text
    expect(screen.getByText(/Our leagues provide a well-organized structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Geared toward intermediate to competitive play/i)).toBeInTheDocument();
  });

  it('displays call to action section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/Ready to play\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Join thousands of athletes in our community/i)).toBeInTheDocument();
    
    // There are multiple register now links
    const ctaButtons = screen.getAllByRole('link', { name: /register now/i });
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  it('displays partner section', () => {
    render(<HomePage />);
    
    // Initial banner should show Popeye's sponsor
    expect(screen.getByAltText("Popeye's Supplements logo")).toBeInTheDocument();
  });

  it('rotates through partner and sponsor banners', () => {
    vi.useFakeTimers();
    render(<HomePage />);

    expect(screen.getByAltText("Popeye's Supplements logo")).toBeInTheDocument();
    const discountLink = screen.getByRole('link', { name: /Shop with 10% off/i });
    expect(discountLink).toHaveAttribute('href', 'https://popeyesonlineorders.com/discount/OFSL20');
    const emailLink = screen.getByRole('link', { name: /info@ofsl.ca/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:info@ofsl.ca');

    act(() => {
      vi.advanceTimersByTime(9500);
    });

    expect(screen.getByAltText('Diabetes Canada logo')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('displays all league cards in carousel', () => {
    render(<HomePage />);
    
    // Check for all league cards
    expect(screen.getByText("Women's Elite Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Mixed Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Advanced Badminton")).toBeInTheDocument();
    expect(screen.getByText("Competitive Badminton")).toBeInTheDocument();
    expect(screen.getByText("Women's Volleyball")).toBeInTheDocument();
    expect(screen.getByText("Men's Volleyball")).toBeInTheDocument();
  });

  it('has correct links on league cards', () => {
    render(<HomePage />);
    
    // Check that league cards have correct href attributes with all filters
    const leagueCard = screen.getByText("Women's Elite Volleyball").closest('a');
    expect(leagueCard).toHaveAttribute('href', '/leagues?sport=Volleyball&level=Elite&gender=Female');
  });
});
