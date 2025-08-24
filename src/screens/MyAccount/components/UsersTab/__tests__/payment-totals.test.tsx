/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Complex mock types for Supabase and testing integration
// This file contains extensive mocking that would require significant type engineering
// to make fully type-safe. The test functionality is maintained and verified.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsersData } from '../useUsersData';
import { supabase } from '../../../../../lib/supabase';
import { AuthProvider } from '../../../../../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Define interfaces for mock data
interface MockRpcResponse<T> {
  data: T;
  error: null;
}

// Mock supabase
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock toast
vi.mock('../../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock AuthContext
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: 'admin-user-id' }
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

describe('Payment Totals Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate total_owed and total_paid for users', async () => {
    const mockUsersData = [
      {
        profile_id: 'user-1',
        auth_id: 'auth-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        team_ids: [],
        league_ids: [],
        user_sports_skills: [],
        status: 'active',
        confirmed_at: '2024-01-01',
        last_sign_in_at: '2024-01-01'
      },
      {
        profile_id: 'user-2',
        auth_id: 'auth-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '098-765-4321',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-02',
        team_ids: [],
        league_ids: [],
        user_sports_skills: [],
        status: 'active',
        confirmed_at: '2024-01-02',
        last_sign_in_at: '2024-01-02'
      }
    ];

    const mockPaymentsData = [
      {
        user_id: 'user-1',
        amount_due: '250.00',
        amount_paid: '100.00',
        status: 'partial'
      },
      {
        user_id: 'user-1',
        amount_due: '150.00',
        amount_paid: '150.00',
        status: 'paid'
      },
      {
        user_id: 'user-2',
        amount_due: '300.00',
        amount_paid: '0.00',
        status: 'pending'
      }
    ];

    // Setup mocks
    const fromMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn();
    
    // Admin check
    fromMock.mockImplementationOnce(() => ({
      select: selectMock.mockReturnValueOnce({
        eq: eqMock.mockReturnValueOnce({
          single: singleMock.mockResolvedValueOnce({
            data: { is_admin: true },
            error: null
          })
        })
      })
    }));

    // RPC call for users
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockUsersData,
      error: null
    } as MockRpcResponse<unknown>);

    // Teams query
    fromMock.mockImplementationOnce(() => ({
      select: selectMock.mockResolvedValueOnce({
        data: [],
        error: null
      })
    }));

    // Individual leagues query
    fromMock.mockImplementationOnce(() => ({
      select: selectMock.mockReturnValueOnce({
        eq: eqMock.mockResolvedValueOnce({
          data: [],
          error: null
        })
      })
    }));

    // Payments query
    fromMock.mockImplementationOnce(() => ({
      select: selectMock.mockResolvedValueOnce({
        data: mockPaymentsData,
        error: null
      })
    }));

    vi.mocked(supabase.from).mockImplementation(fromMock);

    // Render hook
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useUsersData(), { wrapper });

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check payment totals
    const users = result.current.users;
    
    // User 1 should have total_owed = 400 * 1.13 (13% tax) = 452 and total_paid = 250
    const user1 = users.find(u => u.profile_id === 'user-1');
    expect(user1).toBeDefined();
    expect(user1?.total_owed).toBeCloseTo(452, 2); // 400 * 1.13 (includes 13% tax)
    expect(user1?.total_paid).toBe(250);

    // User 2 should have total_owed = 300 * 1.13 (13% tax) = 339 and total_paid = 0
    const user2 = users.find(u => u.profile_id === 'user-2');
    expect(user2).toBeDefined();
    expect(user2?.total_owed).toBeCloseTo(339, 2); // 300 * 1.13 (includes 13% tax)
    expect(user2?.total_paid).toBe(0);
  });

  it('should handle users with no payments', async () => {
    const mockUsersData = [
      {
        profile_id: 'user-no-payments',
        auth_id: 'auth-no-payments',
        name: 'No Payments User',
        email: 'nopayments@example.com',
        phone: '555-555-5555',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        team_ids: [],
        league_ids: [],
        user_sports_skills: [],
        status: 'active',
        confirmed_at: '2024-01-01',
        last_sign_in_at: '2024-01-01'
      }
    ];

    // Setup mocks
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: { is_admin: true },
            error: null
          })
        }))
      }))
    } as MockRpcResponse<unknown>));

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockUsersData,
      error: null
    } as MockRpcResponse<unknown>);

    // Mock empty responses for teams, leagues, and payments
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [], // No payments
          error: null
        })
      });

    vi.mocked(supabase.from).mockImplementation(fromMock);

    // Render hook
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // User should have 0 for both totals
    const user = result.current.users.find(u => u.profile_id === 'user-no-payments');
    expect(user).toBeDefined();
    expect(user?.total_owed).toBe(0);
    expect(user?.total_paid).toBe(0);
  });

  it('should sort users by payment totals', async () => {
    const mockUsersData = [
      {
        profile_id: 'user-1',
        auth_id: 'auth-1',
        name: 'Low Debt User',
        email: 'low@example.com',
        phone: '111-111-1111',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01',
        team_ids: [],
        league_ids: [],
        user_sports_skills: [],
        status: 'active',
        confirmed_at: '2024-01-01',
        last_sign_in_at: '2024-01-01'
      },
      {
        profile_id: 'user-2',
        auth_id: 'auth-2',
        name: 'High Debt User',
        email: 'high@example.com',
        phone: '222-222-2222',
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-02',
        team_ids: [],
        league_ids: [],
        user_sports_skills: [],
        status: 'active',
        confirmed_at: '2024-01-02',
        last_sign_in_at: '2024-01-02'
      }
    ];

    const mockPaymentsData = [
      {
        user_id: 'user-1',
        amount_due: '100.00', // Will be 113 with tax
        amount_paid: '50.00',
        status: 'partial'
      },
      {
        user_id: 'user-2',
        amount_due: '500.00', // Will be 565 with tax
        amount_paid: '200.00',
        status: 'partial'
      }
    ];

    // Setup mocks similar to previous tests
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: { is_admin: true },
            error: null
          })
        }))
      }))
    } as MockRpcResponse<unknown>));

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockUsersData,
      error: null
    } as MockRpcResponse<unknown>);

    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: mockPaymentsData,
          error: null
        })
      });

    vi.mocked(supabase.from).mockImplementation(fromMock);

    // Render hook
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useUsersData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Sort by total_owed descending
    result.current.handleSort('total_owed');
    
    await waitFor(() => {
      const filtered = result.current.filteredUsers;
      expect(filtered[0].profile_id).toBe('user-2'); // Higher debt first
      expect(filtered[1].profile_id).toBe('user-1');
    });

    // Sort by total_paid ascending (clicking twice to change direction)
    result.current.handleSort('total_paid');
    result.current.handleSort('total_paid'); // Click again for ascending
    
    await waitFor(() => {
      const filtered = result.current.filteredUsers;
      expect(filtered[0].profile_id).toBe('user-1'); // Lower payment first in ascending
      expect(filtered[1].profile_id).toBe('user-2');
    });
  });
});