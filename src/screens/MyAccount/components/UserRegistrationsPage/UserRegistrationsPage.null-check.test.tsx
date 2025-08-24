import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserRegistrationsPage } from './UserRegistrationsPage';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';

// Mock dependencies
vi.mock('../../../../contexts/AuthContext');
vi.mock('../../../../lib/supabase');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ userId: 'test-user-123' }),
    useNavigate: () => mockNavigate,
  };
});

const mockShowToast = vi.fn();
vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('UserRegistrationsPage Null Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not crash when userData is null initially', () => {
    // Start with loading state
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'admin-123',
        is_admin: true,
        name: 'Admin User',
        email: 'admin@test.com'
      },
      loading: false,
    } as unknown as ReturnType<typeof supabase.from>);

    // Mock supabase to return null user
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    } as unknown as ReturnType<typeof supabase.from>));

    // Should not throw error
    expect(() => {
      render(
        <BrowserRouter>
          <UserRegistrationsPage />
        </BrowserRouter>
      );
    }).not.toThrow();

    // Should show loading spinner initially (since dataLoaded is false)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should handle userData loading properly', async () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'admin-123',
        is_admin: true,
        name: 'Admin User',
        email: 'admin@test.com'
      },
      loading: false,
    } as unknown as ReturnType<typeof supabase.from>);

    // Mock successful user data fetch
    const mockUserData = {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-456-7890',
      team_ids: [],
      league_ids: []
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      } as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText("Test User's Registrations")).toBeInTheDocument();
    });

    // Should display user email
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it('should display "User not found" when user does not exist', async () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'admin-123',
        is_admin: true,
        name: 'Admin User',
        email: 'admin@test.com'
      },
      loading: false,
    } as unknown as ReturnType<typeof supabase.from>);

    // Mock user not found
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'User not found', code: 'PGRST116' }
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Should show toast and navigate
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('User not found', 'error');
      expect(mockNavigate).toHaveBeenCalledWith('/my-account/users');
    });
  });

  it('should handle user with null name gracefully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'admin-123',
        is_admin: true,
        name: 'Admin User',
        email: 'admin@test.com'
      },
      loading: false,
    } as unknown as ReturnType<typeof supabase.from>);

    // Mock user with null name
    const mockUserData = {
      id: 'test-user-123',
      name: null,  // null name should be handled
      email: 'test@example.com',
      phone: '123-456-7890',
      team_ids: [],
      league_ids: []
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      } as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <UserRegistrationsPage />
      </BrowserRouter>
    );

    // Wait for user data to load
    await waitFor(() => {
      // Should show "Unnamed User" when name is null
      expect(screen.getByText("Unnamed User's Registrations")).toBeInTheDocument();
    });

    // Should still display user email
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });
});