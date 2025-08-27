import { render, screen, waitFor } from '../../../../../test/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeamsTab } from '../TeamsTab';

// Mock the Auth context
const mockRefreshUserProfile = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
    userProfile: {
      id: 'profile-123',
      auth_id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
    refreshUserProfile: mockRefreshUserProfile,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the useTeamsData hook to return loading state initially, then loaded state
const mockRefetchFunctions = {
  refetchTeams: vi.fn().mockResolvedValue(undefined),
  refetchIndividualLeagues: vi.fn().mockResolvedValue(undefined),
  refetchLeaguePayments: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../useTeamsData', () => ({
  useTeamsData: vi.fn(() => ({
    leaguePayments: [],
    teams: [],
    individualLeagues: [],
    loading: false,
    setLeaguePayments: vi.fn(),
    updateTeamRoster: vi.fn(),
    updateTeamCaptain: vi.fn(),
    ...mockRefetchFunctions,
  })),
}));

// Mock the useTeamOperations hook
vi.mock('../useTeamOperations', () => ({
  useTeamOperations: () => ({
    unregisteringPayment: null,
    handleUnregister: vi.fn(),
    confirmationState: { isOpen: false },
    handleConfirmCancellation: vi.fn(),
    handleCloseModal: vi.fn(),
    resultState: { isOpen: false },
    handleCloseResultModal: vi.fn(),
  }),
}));

// Mock PendingInvites component to avoid provider requirements
vi.mock('../../../../../components/PendingInvites', () => ({
  PendingInvites: () => null,
}));

describe.skip('TeamsTab - Registration Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockRefetchFunctions).forEach(fn => fn.mockClear());
    mockRefreshUserProfile.mockClear();
  });

  it('should refresh data when registration_completed flag is set', async () => {
    // Set the registration completed flag
    sessionStorage.setItem('registration_completed', 'true');
    
    render(<TeamsTab />);
    
    // Wait for the effect to run and the flag to be removed
    await waitFor(() => {
      expect(sessionStorage.getItem('registration_completed')).toBeFalsy();
    });
    
    // Verify that refresh functions were called
    expect(mockRefetchFunctions.refetchTeams).toHaveBeenCalled();
    expect(mockRefetchFunctions.refetchIndividualLeagues).toHaveBeenCalled();
    expect(mockRefetchFunctions.refetchLeaguePayments).toHaveBeenCalled();
    expect(mockRefreshUserProfile).toHaveBeenCalled();
  });

  it('should not refresh data when registration_completed flag is not set', async () => {
    // Ensure the flag is not set
    sessionStorage.removeItem('registration_completed');
    
    render(<TeamsTab />);
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/My Leagues/i)).toBeInTheDocument();
    });
    
    // Verify no refresh functions were called
    expect(mockRefetchFunctions.refetchTeams).not.toHaveBeenCalled();
    expect(mockRefetchFunctions.refetchIndividualLeagues).not.toHaveBeenCalled();
    expect(mockRefetchFunctions.refetchLeaguePayments).not.toHaveBeenCalled();
  });
});