import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaiversTab } from '../WaiversTab';
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
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: [
            {
              id: 1,
              title: 'Test Waiver',
              content: 'Test content',
              version: 1,
              is_active: true,
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
              created_by: 'admin',
              updated_by: 'admin'
            }
          ], 
          error: null 
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: Array.from({ length: 30 }, (_, i) => ({
              id: i + 1,
              user_id: `user-${i + 1}`,
              waiver_id: 1,
              accepted_at: new Date(2024, 0, i + 1).toISOString(),
              ip_address: '127.0.0.1',
              user_agent: 'Test Agent',
              user: {
                name: `User ${i + 1}`,
                email: `user${i + 1}@example.com`
              }
            })), 
            error: null 
          }))
        }))
      }))
    }))
  }
}));

describe('WaiversTab Pagination', () => {
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

  it('should render waiver acceptances with pagination when data exists', async () => {
    render(<WaiversTab />);

    await waitFor(() => {
      expect(screen.getByText('Manage Waivers')).toBeInTheDocument();
    });

    // Click "View Acceptances" button (there are two buttons with Users icon)
    const viewAcceptancesButtons = screen.getAllByRole('button');
    const usersButton = viewAcceptancesButtons.find(button => 
      button.textContent?.includes('View Acceptances') || 
      button.querySelector('svg.lucide-users')
    );
    
    if (usersButton) {
      fireEvent.click(usersButton);

      await waitFor(() => {
        expect(screen.getByText('Waiver Acceptances: Test Waiver')).toBeInTheDocument();
      });

      // Should see pagination controls for 30 acceptances
      await waitFor(() => {
        expect(screen.getByText('Show')).toBeInTheDocument();
        expect(screen.getByText('per page')).toBeInTheDocument();
        expect(screen.getByText(/30 acceptances/)).toBeInTheDocument();
      });
    }
  });

  it('should show first page of acceptances by default', async () => {
    render(<WaiversTab />);

    await waitFor(() => {
      const usersButtons = screen.getAllByRole('button');
      const usersButton = usersButtons.find(button => 
        button.querySelector('svg.lucide-users')
      );
      
      if (usersButton) {
        fireEvent.click(usersButton);
      }
    });

    await waitFor(() => {
      // Should show first 25 users (default page size)
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 25')).toBeInTheDocument();
      expect(screen.queryByText('User 26')).not.toBeInTheDocument();
    });
  });

  it('should handle pagination navigation', async () => {
    render(<WaiversTab />);

    await waitFor(() => {
      const usersButtons = screen.getAllByRole('button');
      const usersButton = usersButtons.find(button => 
        button.querySelector('svg.lucide-users')
      );
      
      if (usersButton) {
        fireEvent.click(usersButton);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    // Go to page 2 
    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    await waitFor(() => {
      // Should show users 26-30 on page 2
      expect(screen.getByText('User 26')).toBeInTheDocument();
      expect(screen.getByText('User 30')).toBeInTheDocument();
      expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    });
  });

  it('should render without errors', () => {
    const { container } = render(<WaiversTab />);
    expect(container).toBeInTheDocument();
  });
});