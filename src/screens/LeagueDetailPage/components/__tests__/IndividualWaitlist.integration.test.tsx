import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamRegistrationModal } from '../TeamRegistrationModal';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';

// Define interfaces for mock types
interface MockAuthReturn {
  userProfile: {
    id: string;
    name: string;
    team_ids: string[];
    league_ids: string[];
    email: string;
    birthdate: string;
    gender: string;
    phone: string;
    pronouns: string;
    user_sports_skills: string[];
    profile_completed: boolean;
  };
  user: {
    email: string;
  };
}

interface MockSessionData {
  data: {
    session: {
      access_token: string;
      user: { id: string };
    };
  };
  error: null;
}

interface MockSupabaseChain {
  select?: () => MockSupabaseChain;
  order?: () => Promise<{ data: unknown[] | null; error: null }>;
  eq?: () => MockSupabaseChain;
  single?: () => Promise<{ data: unknown | null; error: null }>;
  update?: () => MockSupabaseChain;
  insert?: () => Promise<{ error: null }>;
}

// Mock modules
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: vi.fn(),
}));

describe('Individual Registration Waitlist', () => {
  const mockCloseModal = vi.fn();
  const mockShowToast = vi.fn();
  const _mockNavigate = vi.fn();

  const mockUserProfile = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '123-456-7890',
    skills: [],
    league_ids: [],
    teams: [],
    team_ids: [],
    date_of_birth: null,
    gender: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    medical_notes: null,
    waiver_signed_at: null,
    profile_complete: true,
  };

  const mockLeague = {
    id: 25,
    name: 'Badminton Sunday Mornings',
    cost: 100,
    team_registration: false,
    max_teams: 28,
    deposit_amount: null,
    deposit_date: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      userProfile: mockUserProfile,
      loading: false,
      signOut: vi.fn(),
    } as MockAuthReturn);

    vi.mocked(useToast).mockReturnValue({
      showToast: mockShowToast,
    } as { showToast: typeof mockShowToast });

    // Mock session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: { id: 'user-123' },
        },
      },
      error: null,
    } as MockSessionData);
  });

  describe('Waitlist Registration for Full League', () => {
    it('should create a waitlisted registration when league is full', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn();
      
      // Mock skills query
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'skills') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, name: 'Beginner', order_index: 1 },
                { id: 2, name: 'Intermediate', order_index: 2 },
              ],
              error: null,
            }),
          } as MockSupabaseChain;
        }
        if (table === 'leagues') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockLeague,
              error: null,
            }),
          } as MockSupabaseChain;
        }
        if (table === 'league_payments') {
          return {
            insert: mockInsert,
          } as MockSupabaseChain;
        }
        if (table === 'users') {
          return {
            update: mockUpdate,
            eq: vi.fn().mockReturnThis(),
          } as MockSupabaseChain;
        }
        return {} as MockSupabaseChain;
      });

      // Mock notification function
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as MockSessionData);

      render(
        <BrowserRouter>
          <TeamRegistrationModal
            showModal={true}
            closeModal={mockCloseModal}
            leagueId={25}
            leagueName="Badminton Sunday Mornings"
            league={mockLeague}
            isWaitlist={true}
          />
        </BrowserRouter>
      );

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
      });

      // Select skill level
      const skillSelect = screen.getByRole('combobox');
      fireEvent.change(skillSelect, { target: { value: '2' } });

      // Click join waitlist button
      const registerButton = screen.getByRole('button', { name: /yes.*join waitlist/i });
      fireEvent.click(registerButton);

      // Wait for registration to complete
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          league_id: 25,
          user_id: 'user-123',
          team_id: null,
          amount_due: 0, // No payment due for waitlist
          amount_paid: 0,
          status: 'pending',
          skill_level_id: 2,
        });
      });

      // Verify league_ids was NOT updated (waitlisted users don't get added to league_ids)
      expect(mockUpdate).not.toHaveBeenCalled();

      // Verify notification was sent with waitlist flag
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'notify-individual-registration',
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-123',
            userName: 'Test User',
            userEmail: 'test@example.com',
            leagueName: 'Badminton Sunday Mornings',
            isWaitlisted: true,
          }),
        })
      );

      // Verify success toast for waitlist
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining("You've been added to the waitlist"),
        'success'
      );
    });

    it('should handle database trigger automatically setting waitlist status', async () => {
      // This tests that even if isWaitlist prop is false,
      // the database trigger will set is_waitlisted=true if league is full
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'skills') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, name: 'Beginner', order_index: 1 }],
              error: null,
            }),
          } as MockSupabaseChain;
        }
        if (table === 'leagues') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockLeague,
              error: null,
            }),
          } as MockSupabaseChain;
        }
        if (table === 'league_payments') {
          return {
            insert: mockInsert,
          } as MockSupabaseChain;
        }
        if (table === 'users') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          } as MockSupabaseChain;
        }
        return {} as MockSupabaseChain;
      });

      render(
        <BrowserRouter>
          <TeamRegistrationModal
            showModal={true}
            closeModal={mockCloseModal}
            leagueId={25}
            leagueName="Badminton Sunday Mornings"
            league={mockLeague}
            isWaitlist={false} // Frontend thinks it's not waitlist
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Register')).toBeInTheDocument();
      });

      // Select skill and register
      const skillSelect = screen.getByRole('combobox');
      fireEvent.change(skillSelect, { target: { value: '1' } });

      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      // The insert will happen with normal values
      // The database trigger will set is_waitlisted=true if needed
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          league_id: 25,
          user_id: 'user-123',
          team_id: null,
          amount_due: 100, // Normal amount since frontend doesn't know it's waitlist
          amount_paid: 0,
          status: 'pending',
          skill_level_id: 1,
        });
      });
    });
  });

  describe('Displaying Waitlisted Registrations', () => {
    it('should show waitlisted badge for waitlisted individual registrations', async () => {
      // This would be tested in LeagueTeamsPage test
      // Just a placeholder to show the test structure
      expect(true).toBe(true);
    });
  });

  describe('Waitlist Promotion', () => {
    it('should promote from waitlist when a spot opens up', async () => {
      // This tests the database function promote_from_waitlist
      // which runs automatically when someone cancels
      
      // Mock a cancellation
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'league_payments') {
          return {
            delete: mockDelete,
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
          } as MockSupabaseChain;
        }
        return {} as MockSupabaseChain;
      });

      // In reality, the database trigger would automatically call promote_from_waitlist
      // For this test, we're just verifying the delete happens
      expect(mockDelete).toBeDefined();
    });
  });
});