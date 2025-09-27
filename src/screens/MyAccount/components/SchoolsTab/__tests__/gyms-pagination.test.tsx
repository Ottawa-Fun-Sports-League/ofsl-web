import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchoolsTab } from '../SchoolsTab';
import { useAuth } from '../../../../../contexts/AuthContext';

// Mock the auth context
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the toast hook
vi.mock('../../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock supabase
vi.mock('../../../../../lib/supabase', () => {
  const gymsData = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    gym: `Gym ${i + 1}`,
    address: `Address ${i + 1}`,
    instructions: `Instructions ${i + 1}`,
    active: true,
    available_days: [1, 2, 3],
    available_sports: [1, 2],
    locations: ['Downtown'],
    facilitator_ids: [],
  }));

  const createChain = (data: unknown[]) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve({ data, error: null }))
    };
    return chain;
  };

  const usersChain = createChain([]);
  const gymsChain = createChain(gymsData);

  return {
    supabase: {
      from: vi.fn((table: string) => (table === 'users' ? usersChain : gymsChain))
    }
  };
});

// Mock fetchSports from leagues lib
vi.mock('../../../../../lib/leagues', () => ({
  fetchSports: vi.fn(() => Promise.resolve([
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' }
  ]))
}));

describe('SchoolsTab Gyms Pagination', () => {
  const mockUserProfile = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    is_admin: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      userProfile: mockUserProfile,
      loading: false
    } as ReturnType<typeof useAuth>);
  });

  it('should render gyms with pagination controls', async () => {
    render(<SchoolsTab />);

    // Wait for gyms to load
    await waitFor(() => {
      expect(screen.getByText('Gym 1')).toBeInTheDocument();
    });

    // Should show pagination controls for 30 gyms
    await waitFor(() => {
      expect(screen.getByText('Show')).toBeInTheDocument();
      expect(screen.getByText('per page')).toBeInTheDocument();
      expect(screen.getByText(/30 schools/)).toBeInTheDocument();
    });
  });

  it('should show first page of gyms by default', async () => {
    render(<SchoolsTab />);

    await waitFor(() => {
      // Should show first 25 gyms (default page size)
      expect(screen.getByText('Gym 1')).toBeInTheDocument();
      expect(screen.getByText('Gym 25')).toBeInTheDocument();
      expect(screen.queryByText('Gym 26')).not.toBeInTheDocument();
    });
  });

  it('should handle page navigation for gyms', async () => {
    render(<SchoolsTab />);

    await waitFor(() => {
      expect(screen.getByText('Gym 1')).toBeInTheDocument();
    });

    // Go to page 2
    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    await waitFor(() => {
      // Should show gyms 26-30 on page 2
      expect(screen.getByText('Gym 26')).toBeInTheDocument();
      expect(screen.getByText('Gym 30')).toBeInTheDocument();
      expect(screen.queryByText('Gym 1')).not.toBeInTheDocument();
    });
  });

  it('should handle page size changes for gyms', async () => {
    render(<SchoolsTab />);

    await waitFor(() => {
      expect(screen.getByText('Gym 25')).toBeInTheDocument();
    });

    // Change page size to 50
    const pageSizeSelect = screen.getByDisplayValue('25');
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });

    await waitFor(() => {
      // Should now show all 30 gyms on first page
      expect(screen.getByText('Gym 30')).toBeInTheDocument();
    });
  });

  it('should maintain pagination when filtering gyms', async () => {
    render(<SchoolsTab />);

    await waitFor(() => {
      expect(screen.getByText('Gym 1')).toBeInTheDocument();
    });

    // Search for gyms (use the first search input)
    const searchInputs = screen.getAllByPlaceholderText(/Search schools/);
    fireEvent.change(searchInputs[0], { target: { value: 'Gym 1' } });

    await waitFor(() => {
      // Should see filtered results (Gym 1, and possibly others with "1" in the name)
      expect(screen.getByText('Gym 1')).toBeInTheDocument();
      // Should show some pagination info indicating filtered results
      expect(screen.getByText(/schools/)).toBeInTheDocument();
    });
  });

  it('should render without errors when no admin privileges', () => {
    vi.mocked(useAuth).mockReturnValue({
      userProfile: { ...mockUserProfile, is_admin: false },
      loading: false
    } as ReturnType<typeof useAuth>);

    const { container } = render(<SchoolsTab />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Access denied. Admin privileges required.')).toBeInTheDocument();
  });

  it('should render component without errors', () => {
    const { container } = render(<SchoolsTab />);
    expect(container).toBeInTheDocument();
  });
});
