import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TeamRegistrationModal } from '../TeamRegistrationModal';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';

// Mock supabase
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    },
    auth: {
      getSession: vi.fn()
    }
  }
}));

// Mock the useAuth hook
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '123',
      email: 'test@example.com'
    },
    userProfile: {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      team_ids: [],
      league_ids: [],
      skills: [2]
    },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn()
  })
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ToastProvider>
      {children}
    </ToastProvider>
  </BrowserRouter>
);

describe('Individual Registration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock skills fetch
    interface MockSupabaseChain {
      select: () => MockSupabaseChain;
      order: () => Promise<{ data: unknown[] | null; error: null }>;
    }

    vi.mocked(supabase.from).mockImplementation((table: string): MockSupabaseChain => {
      if (table === 'skills') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, name: 'Beginner', description: 'New to the sport' },
              { id: 2, name: 'Intermediate', description: 'Some experience' },
              { id: 3, name: 'Advanced', description: 'Experienced player' }
            ],
            error: null
          })
        } as MockSupabaseChain;
      }
      return {} as MockSupabaseChain;
    });
  });

  it('should not show team name field for individual registration leagues', async () => {
    const mockLeague = {
      id: 1,
      name: 'Badminton Singles',
      team_registration: false, // Individual registration
      cost: 100,
      deposit_amount: null,
      deposit_date: null
    };

    render(
      <TestWrapper>
        <TeamRegistrationModal
          showModal={true}
          closeModal={vi.fn()}
          leagueId={1}
          leagueName="Badminton Singles"
          league={mockLeague}
        />
      </TestWrapper>
    );

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.queryByText('Loading skill levels...')).not.toBeInTheDocument();
    });

    // Should NOT show team name field
    expect(screen.queryByText('Team Name *')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter your team name')).not.toBeInTheDocument();

    // Should show "Your Skill Level" instead of "Team Skill Level"
    expect(screen.getByText('Your Skill Level *')).toBeInTheDocument();
    expect(screen.queryByText('Team Skill Level *')).not.toBeInTheDocument();

    // Should show individual registration note
    expect(screen.getByText(/This is an individual registration/)).toBeInTheDocument();
  });

  it('should show team name field for team registration leagues', async () => {
    const mockLeague = {
      id: 2,
      name: 'Volleyball League',
      team_registration: true, // Team registration
      cost: 500,
      deposit_amount: null,
      deposit_date: null
    };

    render(
      <TestWrapper>
        <TeamRegistrationModal
          showModal={true}
          closeModal={vi.fn()}
          leagueId={2}
          leagueName="Volleyball League"
          league={mockLeague}
        />
      </TestWrapper>
    );

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.queryByText('Loading skill levels...')).not.toBeInTheDocument();
    });

    // Should show team name field
    expect(screen.getByText('Team Name *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your team name')).toBeInTheDocument();

    // Should show team registration note
    expect(screen.getByText(/You will be automatically added as the team captain/)).toBeInTheDocument();
  });

  it('should display correct fields for individual registration', async () => {
    const mockLeague = {
      id: 3,
      name: 'Badminton Singles',
      team_registration: false,
      cost: 150,
      deposit_amount: null,
      deposit_date: null
    };

    const mockCloseModal = vi.fn();

    render(
      <TestWrapper>
        <TeamRegistrationModal
          showModal={true}
          closeModal={mockCloseModal}
          leagueId={3}
          leagueName="Badminton Singles"
          league={mockLeague}
        />
      </TestWrapper>
    );

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.queryByText('Loading skill levels...')).not.toBeInTheDocument();
    });

    // Check that the modal displays correct information for individual registration
    expect(screen.getByText('Registrant:')).toBeInTheDocument();
    expect(screen.queryByText('Captain:')).not.toBeInTheDocument();
    expect(screen.getByText('Your Skill Level *')).toBeInTheDocument();
    expect(screen.queryByText('Team Skill Level *')).not.toBeInTheDocument();
    expect(screen.getByText(/This is an individual registration/)).toBeInTheDocument();

    // Should have skill level selector
    const skillSelect = screen.getByRole('combobox');
    expect(skillSelect).toBeInTheDocument();
  });

  it('should display correct fields for team registration', async () => {
    const mockLeague = {
      id: 4,
      name: 'Volleyball League',
      team_registration: true,
      cost: 500,
      deposit_amount: null,
      deposit_date: null
    };

    const mockCloseModal = vi.fn();

    render(
      <TestWrapper>
        <TeamRegistrationModal
          showModal={true}
          closeModal={mockCloseModal}
          leagueId={4}
          leagueName="Volleyball League"
          league={mockLeague}
        />
      </TestWrapper>
    );

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.queryByText('Loading skill levels...')).not.toBeInTheDocument();
    });

    // Check that the modal displays correct information for team registration
    expect(screen.getByText('Captain:')).toBeInTheDocument();
    expect(screen.queryByText('Registrant:')).not.toBeInTheDocument();
    expect(screen.getByText('Team Skill Level *')).toBeInTheDocument();
    expect(screen.queryByText('Your Skill Level *')).not.toBeInTheDocument();
    expect(screen.getByText(/You will be automatically added as the team captain/)).toBeInTheDocument();

    // Should have team name field
    const teamNameInput = screen.getByPlaceholderText('Enter your team name');
    expect(teamNameInput).toBeInTheDocument();
    
    // Should have skill level selector
    const skillSelect = screen.getByRole('combobox');
    expect(skillSelect).toBeInTheDocument();
  });
});