import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserLeaguePayments, getUserPaymentSummary } from './payments';
import { supabase } from './supabase';
import type { AuthError } from '@supabase/supabase-js';

// Mock the supabase client
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock the logger
vi.mock('./logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserLeaguePayments', () => {
    it('should handle league payments with proper type transformations', async () => {
      const mockUserId = 'user123';
      const mockUser = { id: mockUserId };
      
      // Mock auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      // Mock league_payments query
      const mockPaymentData = [{
        id: 1,
        user_id: mockUserId,
        team_id: 1,
        league_id: 1,
        amount_due: 100,
        amount_paid: 50,
        status: 'partial',
        due_date: '2024-01-01',
        payment_method: 'stripe',
        stripe_order_id: 123,
        notes: 'Test payment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        leagues: { name: 'Test League' },
        teams: { name: 'Test Team' }
      }];

      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPaymentData, error: null })
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'league_payments') {
          return fromMock as unknown as ReturnType<typeof supabase.from>;
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), contains: vi.fn().mockResolvedValue({ data: [], error: null }) } as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await getUserLeaguePayments();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        user_id: mockUserId,
        team_id: 1,
        league_id: 1,
        amount_due: 100,
        amount_paid: 50,
        amount_outstanding: 50,
        status: 'partial',
        due_date: '2024-01-01',
        payment_method: 'stripe',
        stripe_order_id: 123,
        notes: 'Test payment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        league_name: 'Test League',
        team_name: 'Test Team'
      });
    });

    it('should handle teams without payment records and create virtual payments', async () => {
      const mockUserId = 'user123';
      const mockUser = { id: mockUserId };
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      // Mock empty league_payments
      const paymentFromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock teams with leagues
      const mockTeamsData = [{
        id: 2,
        name: 'Virtual Team',
        league_id: 2,
        leagues: {
          id: 2,
          name: 'Virtual League',
          cost: 200
        }
      }];

      const teamsFromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: mockTeamsData, error: null })
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'league_payments') {
          return paymentFromMock as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === 'teams') {
          return teamsFromMock as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await getUserLeaguePayments();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: -2, // Negative team ID
        user_id: mockUserId,
        team_id: 2,
        league_id: 2,
        amount_due: 200,
        amount_paid: 0,
        amount_outstanding: 200,
        status: 'pending',
        league_name: 'Virtual League',
        team_name: 'Virtual Team'
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'No user' } as AuthError
      });

      const result = await getUserLeaguePayments();
      
      expect(result).toEqual([]);
    });
  });

  describe('getUserPaymentSummary', () => {
    it('should calculate payment summary correctly', async () => {
      const mockUser = { id: 'user123' };
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      const mockPayments = [
        { amount_outstanding: 50, amount_paid: 100, status: 'partial' },
        { amount_outstanding: 100, amount_paid: 0, status: 'pending' },
        { amount_outstanding: 0, amount_paid: 200, status: 'paid' },
        { amount_outstanding: 75, amount_paid: 25, status: 'overdue' }
      ];

      const fromMock = {
        select: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
      };

      vi.mocked(supabase.from).mockImplementation(() => fromMock as unknown as ReturnType<typeof supabase.from>);

      const result = await getUserPaymentSummary();

      expect(result).toEqual({
        total_outstanding: 225, // 50 + 100 + 0 + 75
        total_paid: 325, // 100 + 0 + 200 + 25
        pending_payments: 2, // partial + pending
        overdue_payments: 1
      });
    });

    it('should return zeros when no user is authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'No user' } as AuthError
      });

      const result = await getUserPaymentSummary();

      expect(result).toEqual({
        total_outstanding: 0,
        total_paid: 0,
        pending_payments: 0,
        overdue_payments: 0
      });
    });
  });
});