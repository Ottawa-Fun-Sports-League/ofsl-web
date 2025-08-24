/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Complex mock types for Supabase and testing integration
// This file contains extensive mocking that would require significant type engineering
// to make fully type-safe. The test functionality is maintained and verified.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamRegistrationModal } from '../TeamRegistrationModal';
import { supabase } from '../../../../lib/supabase';
import { useAuth, type AuthContextType } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';

// Import mock types
import type { MockSessionData, MockSupabaseChain } from '../../../../types/test-mocks';

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

describe('Individual Registration Notification', () => {
  const mockShowToast = vi.fn();
  const mockCloseModal = vi.fn();
  const mockInvoke = vi.fn();

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
    } as unknown as AuthContextType);

    // Mock supabase functions.invoke
    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);

    // Mock getSession
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: { id: 'user-123' },
        },
      },
      error: null,
    } as MockSessionData);

    // Mock skills loading
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'skills') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 2, name: 'Intermediate', description: 'Regular player', order_index: 2 },
              { id: 3, name: 'Advanced', description: 'Experienced player', order_index: 3 },
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
            data: { cost: 100, team_registration: false }, // Individual registration
            error: null,
          }),
        } as MockSupabaseChain;
      }
      if (table === 'users') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as MockSupabaseChain;
      }
      if (table === 'league_payments') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        } as MockSupabaseChain;
      }
      return {} as MockSupabaseChain;
    });
  });

  it('should send notification to info@ofsl.ca when individual registration succeeds', async () => {
    const league = {
      id: 1,
      name: 'Badminton League',
      cost: 100,
      team_registration: false, // Individual registration
    };

    // Mock successful responses for all functions
    mockInvoke.mockResolvedValue({ error: null });

    render(
      <BrowserRouter>
        <TeamRegistrationModal
          showModal={true}
          closeModal={mockCloseModal}
          leagueId={1}
          leagueName="Badminton League"
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

    // Wait for registration to complete
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'send-registration-confirmation',
        expect.objectContaining({
          body: expect.objectContaining({
            isIndividualRegistration: true,
          }),
        })
      );
    });

    // Verify that notify-individual-registration was called
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'notify-individual-registration',
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-123',
            userName: 'Test User',
            userEmail: 'test@example.com',
            userPhone: '123-456-7890',
            leagueName: 'Badminton League',
            amountPaid: 0,
            paymentMethod: 'Pending',
          }),
        })
      );
    });

    // Verify both functions were called
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('should not block registration if notification fails', async () => {
    const league = {
      id: 1,
      name: 'Badminton League',
      cost: 100,
      team_registration: false,
    };

    // Mock notification failure but registration confirmation success
    mockInvoke.mockImplementation((functionName) => {
      if (functionName === 'notify-individual-registration') {
        return Promise.resolve({ error: new Error('Notification failed') });
      }
      return Promise.resolve({ error: null });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <TeamRegistrationModal
          showModal={true}
          closeModal={mockCloseModal}
          leagueId={1}
          leagueName="Badminton League"
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

    // Wait for registration to complete successfully
    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });

    // Verify error was logged but registration succeeded
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to send individual registration notification:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});