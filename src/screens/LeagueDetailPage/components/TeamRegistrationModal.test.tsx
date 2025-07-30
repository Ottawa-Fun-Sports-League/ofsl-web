import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamRegistrationModal } from './TeamRegistrationModal';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import type { League } from '../../../lib/leagues';

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { cost: 100 }, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 1, name: 'Test Team' }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ error: null }))
    },
    auth: {
      getSession: vi.fn(() => Promise.resolve({ 
        data: { session: { access_token: 'test-token' } } 
      }))
    }
  }
}));

// Mock toast
const mockShowToast = vi.fn();
vi.mock('../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock AuthContext
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

const mockUserProfile = {
  id: 'test-user-id',
  name: 'Test User',
  team_ids: []
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    userProfile: mockUserProfile,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshUserProfile: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

const mockLeague: Partial<League> = {
  id: 1,
  name: 'Test League',
  cost: 100,
  sport_name: 'Volleyball',
  skill_name: 'Intermediate',
  day_of_week: 3,
  start_date: '2024-01-01',
  end_date: '2024-03-01',
  hide_day: false,
  gyms: [
    {
      id: 1,
      gym: 'Test Gym',
      address: '123 Test St',
      locations: ['East', 'West']
    }
  ]
};

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <TeamRegistrationModal
        showModal={true}
        closeModal={vi.fn()}
        leagueId={1}
        leagueName="Test League"
        league={mockLeague}
        isWaitlist={false}
        {...props}
      />
    </BrowserRouter>
  );
};

describe('TeamRegistrationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with league information', () => {
    renderComponent();

    // Check league name is displayed
    expect(screen.getByText('Test League')).toBeInTheDocument();
    
    // Check league details are displayed
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('East, West')).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2024 - Mar 1, 2024/)).toBeInTheDocument();
    
    // Check cost is displayed in the league info section
    const costLabel = screen.getByText('Cost:');
    expect(costLabel).toBeInTheDocument();
    
    // Check the cost amount is displayed
    const costText = costLabel.parentElement?.textContent;
    expect(costText).toContain('$113.00');
  });

  it('handles team registration with skill level', async () => {
    // Mock skills data
    const mockSkills = [
      { id: 1, name: 'Beginner', description: 'New to the sport', order_index: 1 },
      { id: 2, name: 'Intermediate', description: 'Some experience', order_index: 2 },
      { id: 3, name: 'Advanced', description: 'Competitive player', order_index: 3 }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string): ReturnType<typeof supabase.from> => {
      if (table === 'skills') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: mockSkills, 
              error: null 
            }))
          }))
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'leagues') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { cost: 100 }, 
                error: null 
              }))
            }))
          }))
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'teams') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ 
                    data: [], 
                    error: null 
                  }))
                }))
              }))
            }))
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 1, 
                  name: 'Test Team',
                  active: true,
                  skill_level_id: 2
                }, 
                error: null 
              }))
            }))
          }))
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'users') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    renderComponent();

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.getByText('Team Name *')).toBeInTheDocument();
    });

    // Fill in team name
    const teamNameInput = screen.getByPlaceholderText('Enter your team name');
    fireEvent.change(teamNameInput, { target: { value: 'Test Team' } });

    // Select skill level
    const skillSelect = screen.getByRole('combobox');
    fireEvent.change(skillSelect, { target: { value: '2' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Register Team' });
    fireEvent.click(submitButton);

    // Wait for registration to complete
    await waitFor(() => {
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('teams');
    });
  });

  it('shows error for beginner skill level', async () => {
    // Mock skills data
    const mockSkills = [
      { id: 1, name: 'Beginner', description: 'New to the sport', order_index: 1 },
      { id: 2, name: 'Intermediate', description: 'Some experience', order_index: 2 }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string): ReturnType<typeof supabase.from> => {
      if (table === 'skills') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: mockSkills, 
              error: null 
            }))
          }))
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    renderComponent();

    // Wait for skills to load
    await waitFor(() => {
      expect(screen.getByText('Team Name *')).toBeInTheDocument();
    });

    // Fill in team name
    const teamNameInput = screen.getByPlaceholderText('Enter your team name');
    fireEvent.change(teamNameInput, { target: { value: 'Test Team' } });

    // Select beginner skill level
    const skillSelect = screen.getByRole('combobox');
    fireEvent.change(skillSelect, { target: { value: '1' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Register Team' });
    fireEvent.click(submitButton);

    // Check error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Thank you for your interest!/)).toBeInTheDocument();
      expect(screen.getByText(/our programs are designed for intermediate to elite level players/)).toBeInTheDocument();
    });
  });

  it('handles waitlist registration', () => {
    renderComponent({ isWaitlist: true });

    // Check waitlist-specific content
    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
    expect(screen.getByText(/League's Full \(For Now!\)/)).toBeInTheDocument();
    expect(screen.getByText('Yes, join waitlist')).toBeInTheDocument();
    
    // Team name input should not be present for waitlist
    expect(screen.queryByPlaceholderText('Enter your team name')).not.toBeInTheDocument();
  });
});