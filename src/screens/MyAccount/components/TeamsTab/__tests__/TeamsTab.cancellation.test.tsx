import { render, waitFor, fireEvent, screen } from '@testing-library/react';
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
    league_ids: [1, 2],
  },
  refreshUserProfile: vi.fn().mockImplementation(() => {
    // Simulate updating the user profile
    mockAuthContext.userProfile.league_ids = [1]; // Remove league 2
    return Promise.resolve();
  }),
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

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock window.alert
global.alert = vi.fn();

describe('TeamsTab - Cancellation Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock user profile
    mockAuthContext.userProfile.league_ids = [1, 2];
    
    // Mock supabase chain for initial load and updates
    const mockFrom = vi.fn();
    const mockSelect = vi.fn();
    const mockIn = vi.fn();
    const mockContains = vi.fn();
    const mockOrder = vi.fn();
    const mockUpdate = vi.fn();
    const mockEq = vi.fn();
    const mockDelete = vi.fn();
    const mockIs = vi.fn();
    const mockSingle = vi.fn();
    
    // Setup the chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
      in: mockIn,
      contains: mockContains,
      order: mockOrder,
      eq: mockEq,
      is: mockIs,
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      contains: mockContains,
      order: mockOrder,
      single: mockSingle,
    });
    
    mockEq.mockReturnValue({
      single: mockSingle,
      eq: mockEq,
      is: mockIs,
    });
    
    mockSingle.mockResolvedValue({
      data: { league_ids: [1] }, // After cancellation
      error: null,
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    
    mockDelete.mockReturnValue({
      eq: mockEq,
      is: mockIs,
    });
    
    mockIs.mockResolvedValue({
      data: null,
      error: null,
    });
    
    mockIn.mockReturnValue({
      order: mockOrder,
    });
    
    mockContains.mockReturnValue({
      order: mockOrder,
    });
    
    // Initial load returns 2 leagues
    let callCount = 0;
    mockOrder.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call - teams
        return Promise.resolve({ data: [], error: null });
      } else if (callCount === 2) {
        // Second call - initial leagues load with 2 leagues
        return Promise.resolve({
          data: [
            { id: 1, name: 'League 1', gym_ids: [] },
            { id: 2, name: 'League 2', gym_ids: [] },
          ],
          error: null,
        });
      } else {
        // Subsequent calls - after cancellation, only 1 league
        return Promise.resolve({
          data: [
            { id: 1, name: 'League 1', gym_ids: [] },
          ],
          error: null,
        });
      }
    });
    
    (supabase.from as any).mockImplementation(mockFrom);
  });

  it('should update UI immediately after cancelling individual registration', async () => {
    render(
      <BrowserRouter>
        <TeamsTab />
      </BrowserRouter>
    );
    
    // Wait for initial load - should show 2 leagues
    await waitFor(() => {
      expect(screen.getByText('League 1')).toBeInTheDocument();
      expect(screen.getByText('League 2')).toBeInTheDocument();
    });
    
    // Find and click the delete button for League 2
    const deleteButtons = screen.getAllByRole('button', { name: /delete|cancel|leave/i });
    const league2DeleteButton = deleteButtons[1]; // Second delete button
    
    fireEvent.click(league2DeleteButton);
    
    // Confirm the cancellation
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining('League 2')
    );
    
    // Wait for the UI to update - League 2 should be removed
    await waitFor(() => {
      expect(screen.getByText('League 1')).toBeInTheDocument();
      expect(screen.queryByText('League 2')).not.toBeInTheDocument();
    });
    
    // Verify success message
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Successfully cancelled')
    );
    
    // Verify that the database was updated
    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(supabase.from).toHaveBeenCalledWith('league_payments');
    
    // Verify that refresh functions were called
    expect(mockAuthContext.refreshUserProfile).toHaveBeenCalled();
  });
});