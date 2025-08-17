import { render, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeamsTab } from '../TeamsTab';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../../../../../lib/supabase';

// Mock AuthContext
const mockAuthContext = {
  user: { id: 'test-user-123', email: 'test@example.com' },
  userProfile: {
    id: 'profile-123',
    auth_id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    team_ids: [],
    league_ids: [1],
  },
  refreshUserProfile: vi.fn(),
  signInWithGoogle: vi.fn(),
  setIsNewUser: vi.fn(),
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  isNewUser: false,
  emailVerified: true,
  profileComplete: true,
  signUp: vi.fn(),
  checkProfileCompletion: vi.fn(),
  session: null,
  setUserProfile: vi.fn(),
};

vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock supabase
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the payments lib
vi.mock('../../../../../lib/payments', () => ({
  getUserLeaguePayments: vi.fn().mockResolvedValue([]),
}));

describe('TeamsTab - Registration Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock supabase responses
    const fromMock = vi.fn();
    const selectMock = vi.fn();
    const inMock = vi.fn();
    const containsMock = vi.fn();
    const orderMock = vi.fn();
    
    fromMock.mockReturnValue({
      select: selectMock,
      in: inMock,
      contains: containsMock,
      order: orderMock,
    });
    
    selectMock.mockReturnValue({
      in: inMock,
      contains: containsMock,
      order: orderMock,
    });
    
    inMock.mockReturnValue({
      order: orderMock,
    });
    
    containsMock.mockReturnValue({
      order: orderMock,
    });
    
    orderMock.mockResolvedValue({
      data: [],
      error: null,
    });
    
    (supabase.from as any).mockImplementation(fromMock);
  });

  it('should refresh data when registration_completed flag is set', async () => {
    // Set the registration completed flag
    sessionStorage.setItem('registration_completed', 'true');
    
    render(
      <BrowserRouter>
        <TeamsTab />
      </BrowserRouter>
    );
    
    // Wait for the effect to run
    await waitFor(() => {
      // Check that the flag was removed
      expect(sessionStorage.getItem('registration_completed')).toBeNull();
    });
    
    // Verify that refresh functions were called
    expect(mockAuthContext.refreshUserProfile).toHaveBeenCalled();
    
    // Verify that supabase queries were made to fetch updated data
    expect(supabase.from).toHaveBeenCalledWith('teams');
    expect(supabase.from).toHaveBeenCalledWith('leagues');
  });

  it('should not refresh data when registration_completed flag is not set', async () => {
    // Ensure the flag is not set
    sessionStorage.removeItem('registration_completed');
    
    render(
      <BrowserRouter>
        <TeamsTab />
      </BrowserRouter>
    );
    
    // Wait a bit to ensure effects have run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // refreshUserProfile should only be called once from initial load, not from the refresh effect
    expect(mockAuthContext.refreshUserProfile).not.toHaveBeenCalled();
  });
});