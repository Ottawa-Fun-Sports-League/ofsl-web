import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamRegistrationModal } from '../TeamRegistrationModal';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';

// Mock dependencies
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe('TeamRegistrationModal', () => {
  const mockShowToast = vi.fn();
  const mockCloseModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useToast).mockReturnValue({
      showToast: mockShowToast,
    });

    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'user-123',
        name: 'Test User',
        team_ids: [],
        league_ids: [],
        email: 'test@example.com',
        birthdate: '1990-01-01',
        gender: 'Male',
        phone: '123-456-7890',
        pronouns: 'he/him',
        user_sports_skills: ['volleyball', 'badminton'],
        profile_completed: true,
      },
      user: {
        email: 'test@example.com',
      },
    } as any);

    // Mock skills loading
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'skills') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, name: 'Beginner', description: 'New to the sport', order_index: 1 },
              { id: 2, name: 'Intermediate', description: 'Regular player', order_index: 2 },
              { id: 3, name: 'Advanced', description: 'Experienced player', order_index: 3 },
            ],
            error: null,
          }),
        } as any;
      }
      return {} as any;
    });
  });

  describe('Duplicate Registration Error Handling', () => {
    it('should show user-friendly error for duplicate individual registration', async () => {
      const league = {
        id: 1,
        name: 'Test League',
        cost: 100,
        team_registration: false, // Individual registration
      };

      // Mock league data fetch
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'skills') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 2, name: 'Intermediate', description: 'Regular player', order_index: 2 },
              ],
              error: null,
            }),
          } as any;
        }
        if (table === 'leagues') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { cost: 100, team_registration: false },
              error: null,
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        if (table === 'league_payments') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "idx_unique_user_league_payment"',
              },
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <BrowserRouter>
          <TeamRegistrationModal
            showModal={true}
            closeModal={mockCloseModal}
            leagueId={1}
            leagueName="Test League"
            league={league}
          />
        </BrowserRouter>
      );

      // Wait for skills to load
      await waitFor(() => {
        expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
      });

      // Select skill level
      const skillSelect = screen.getByRole('combobox');
      fireEvent.change(skillSelect, { target: { value: '2' } });

      // Submit form
      const registerButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(registerButton);

      // Wait for error message
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'You have already registered for this league. Please check your registrations in the My Account page.',
          'error'
        );
      });
    });

    it('should show user-friendly error for duplicate team registration', async () => {
      const league = {
        id: 1,
        name: 'Test League',
        cost: 100,
        team_registration: true, // Team registration
      };

      // Mock league data fetch
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'skills') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 2, name: 'Intermediate', description: 'Regular player', order_index: 2 },
              ],
              error: null,
            }),
          } as any;
        }
        if (table === 'leagues') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { cost: 100, team_registration: true },
              error: null,
            }),
          } as any;
        }
        if (table === 'teams') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint',
              },
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <BrowserRouter>
          <TeamRegistrationModal
            showModal={true}
            closeModal={mockCloseModal}
            leagueId={1}
            leagueName="Test League"
            league={league}
          />
        </BrowserRouter>
      );

      // Wait for skills to load
      await waitFor(() => {
        expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
      });

      // Enter team name
      const teamNameInput = screen.getByPlaceholderText('Enter your team name');
      fireEvent.change(teamNameInput, { target: { value: 'Test Team' } });

      // Select skill level
      const skillSelect = screen.getByRole('combobox');
      fireEvent.change(skillSelect, { target: { value: '2' } });

      // Submit form
      const registerButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(registerButton);

      // Wait for error message
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'You have already registered a team for this league. Please check your teams in the My Account page.',
          'error'
        );
      });
    });

    it('should handle generic database errors gracefully', async () => {
      const league = {
        id: 1,
        name: 'Test League',
        cost: 100,
        team_registration: false,
      };

      // Mock league data fetch with generic error
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'skills') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 2, name: 'Intermediate', description: 'Regular player', order_index: 2 },
              ],
              error: null,
            }),
          } as any;
        }
        if (table === 'leagues') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { cost: 100, team_registration: false },
              error: null,
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        if (table === 'league_payments') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: {
                message: 'Database connection error',
              },
            }),
          } as any;
        }
        return {} as any;
      });

      render(
        <BrowserRouter>
          <TeamRegistrationModal
            showModal={true}
            closeModal={mockCloseModal}
            leagueId={1}
            leagueName="Test League"
            league={league}
          />
        </BrowserRouter>
      );

      // Wait for skills to load
      await waitFor(() => {
        expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
      });

      // Select skill level
      const skillSelect = screen.getByRole('combobox');
      fireEvent.change(skillSelect, { target: { value: '2' } });

      // Submit form
      const registerButton = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(registerButton);

      // Wait for error message
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Database connection error',
          'error'
        );
      });
    });
  });
});