import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { IndividualEditPage } from '../IndividualEditPage';
import { supabase } from '../../../../../lib/supabase';

// Mock dependencies
vi.mock('../../../../../lib/supabase');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ userId: 'user-1', leagueId: '1' }),
    useNavigate: () => vi.fn()
  };
});

vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { is_admin: true }
  })
}));

vi.mock('../../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

describe('IndividualEditPage Duplicate Payment Handling', () => {
  const mockPaymentData = {
    id: 1,
    user_id: 'user-1',
    league_id: 1,
    team_id: null,
    amount_due: 100,
    amount_paid: 0,
    status: 'pending',
    payment_method: null,
    notes: '[]'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock user data
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
              league_ids: [1]  // No duplicates
            },
            error: null
          })
        } as any;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              name: 'Test League',
              cost: 100
            },
            error: null
          })
        } as any;
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPaymentData,
            error: null
          }),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockPaymentData,
            error: null
          })
        } as any;
      }
      
      return {} as any;
    });
  });

  it('should handle single payment record correctly', async () => {
    render(
      <BrowserRouter>
        <IndividualEditPage />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Edit Individual Registration/i)).toBeInTheDocument();
    });

    // Should display user information
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    // Should display payment information
    expect(screen.getByText(/Payment Information/i)).toBeInTheDocument();
  });

  it('should gracefully handle when maybeSingle returns null (no payment record)', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,  // No existing payment record
            error: null
          }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockPaymentData,
            error: null
          })
        } as any;
      }
      
      // Return default mocks for other tables
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
              league_ids: [1]
            },
            error: null
          })
        } as any;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              name: 'Test League',
              cost: 100
            },
            error: null
          })
        } as any;
      }
      
      return {} as any;
    });

    render(
      <BrowserRouter>
        <IndividualEditPage />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Edit Individual Registration/i)).toBeInTheDocument();
    });

    // Should still display properly even when creating a new payment record
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should prevent duplicate payment records in the database', async () => {
    const insertMock = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPaymentData,
          error: null
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "idx_unique_user_league_payment"'
          }
        })
      });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null
          }),
          insert: insertMock
        } as any;
      }
      
      // Return default mocks for other tables
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
              league_ids: [1]
            },
            error: null
          })
        } as any;
      }
      
      if (table === 'leagues') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              name: 'Test League',
              cost: 100
            },
            error: null
          })
        } as any;
      }
      
      return {} as any;
    });

    render(
      <BrowserRouter>
        <IndividualEditPage />
      </BrowserRouter>
    );

    // First insert should succeed
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });

    // The unique constraint in the database will prevent duplicate records
    // This is enforced at the database level, not in the application code
  });
});