import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LeaguesTab } from '../LeaguesTab';

// Mock dependencies
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: '1', is_admin: true },
  })
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock('./hooks/useLeaguesData', () => ({
  useLeaguesData: () => ({
    leagues: [
      { 
        id: 1, 
        name: 'Test League', 
        sport_name: 'Volleyball',
        location: 'Central',
        teams_count: 5,
        status: 'active',
        is_archived: false
      }
    ],
    archivedLeagues: [],
    loading: false,
    loadData: vi.fn()
  })
}));

vi.mock('./hooks/useLeagueActions', () => ({
  useLeagueActions: () => ({
    saving: false,
    handleDeleteLeague: vi.fn(),
    handleCopyLeague: vi.fn()
  })
}));

vi.mock('../../../../lib/leagues', async () => {
  const actual = await vi.importActual('../../../../lib/leagues');
  return {
    ...actual,
    fetchSports: () => Promise.resolve([{ id: 1, name: 'Volleyball' }]),
    fetchSkills: () => Promise.resolve([{ id: 1, name: 'Beginner' }])
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('LeaguesTab - View Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should save view preference to localStorage when toggled', async () => {
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test League')).toBeInTheDocument();
    });

    // Find and click the List view button
    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);

    // Check that localStorage was called with the correct key and value
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'viewPreference:myaccount-leagues',
      'list'
    );
  });

  it('should restore view preference from localStorage on mount', async () => {
    // Set localStorage to return 'list' view
    localStorageMock.getItem.mockReturnValue('list');

    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test League')).toBeInTheDocument();
    });

    // Check that localStorage was queried
    expect(localStorageMock.getItem).toHaveBeenCalledWith('viewPreference:myaccount-leagues');

    // The list view button should be active (have specific styling)
    const listButton = screen.getByRole('button', { name: /list/i });
    expect(listButton).toHaveClass('bg-white', 'shadow-sm');
  });

  it('should persist view preference across component unmount/remount', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test League')).toBeInTheDocument();
    });

    // Switch to list view
    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);

    // Unmount component
    unmount();

    // Mock localStorage to return the saved preference
    localStorageMock.getItem.mockReturnValue('list');

    // Remount component
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

    // Wait for component to load again
    await waitFor(() => {
      expect(screen.getByText('Test League')).toBeInTheDocument();
    });

    // The list view should still be active
    const newListButton = screen.getByRole('button', { name: /list/i });
    expect(newListButton).toHaveClass('bg-white', 'shadow-sm');
  });
});
