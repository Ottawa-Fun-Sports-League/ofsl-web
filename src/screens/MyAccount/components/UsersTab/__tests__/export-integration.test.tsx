import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersTab } from '../UsersTab';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../../../contexts/AuthContext';
import React from 'react';

// Mock the supabase client
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

// Mock AuthContext with admin user
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { 
      id: 'admin-user-id',
      is_admin: true,
      email: 'admin@example.com'
    }
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock DOM methods for CSV export
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('CSV Export Integration', () => {
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockLink: HTMLAnchorElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup DOM mocks for CSV download
    mockClick = vi.fn();
    mockLink = {
      setAttribute: vi.fn(),
      click: mockClick,
      style: { visibility: '' }
    } as unknown as HTMLAnchorElement;
    
    mockCreateElement = vi.fn(() => mockLink);
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    
    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    // Setup successful data fetch mocks
    const { supabase } = await import('../../../../../lib/supabase');
    
    // Mock successful admin check
    const fromMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({
      data: { is_admin: true },
      error: null
    });

    fromMock.mockImplementation(() => ({
      select: selectMock.mockImplementation(() => ({
        eq: eqMock.mockImplementation(() => ({
          single: singleMock
        }))
      }))
    }));

    // Mock successful RPC call for users
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
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
          last_sign_in_at: '2024-01-15'
        },
        {
          profile_id: 'user-2',
          auth_id: 'auth-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '098-765-4321',
          is_admin: false,
          is_facilitator: true,
          date_created: '2024-01-02',
          team_ids: [],
          league_ids: [],
          user_sports_skills: [],
          status: 'active',
          confirmed_at: '2024-01-02',
          last_sign_in_at: '2024-01-20'
        }
      ],
      error: null
    });

    // Setup additional mocks for teams, leagues, and payments
    fromMock
      .mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
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
          data: [],
          error: null
        })
      });

    vi.mocked(supabase.from).mockImplementation(fromMock);
  });

  it('should open export modal when Export CSV button is clicked', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    );

    render(<UsersTab />, { wrapper });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Access denied/)).not.toBeInTheDocument();
    });

    // Find and click Export CSV button
    const exportButton = await screen.findByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Export Users to CSV')).toBeInTheDocument();
      expect(screen.getByText(/Select the columns you want to include/)).toBeInTheDocument();
      expect(screen.getByText(/2 users will be exported/)).toBeInTheDocument();
    });
  });

  it('should export CSV with selected columns', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    );

    render(<UsersTab />, { wrapper });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Access denied/)).not.toBeInTheDocument();
    });

    // Open export modal
    const exportButton = await screen.findByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Export Users to CSV')).toBeInTheDocument();
    });

    // Deselect some columns
    const phoneCheckbox = screen.getByLabelText('Phone');
    const adminCheckbox = screen.getByLabelText('Admin');
    fireEvent.click(phoneCheckbox);
    fireEvent.click(adminCheckbox);

    // Click Export button in modal
    const modalExportButton = screen.getByRole('button', { name: /Export \(\d+ columns?\)/i });
    fireEvent.click(modalExportButton);

    // Verify CSV download was triggered
    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Export Users to CSV')).not.toBeInTheDocument();
    });
  });

  it('should allow selecting and deselecting all columns', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    );

    render(<UsersTab />, { wrapper });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Access denied/)).not.toBeInTheDocument();
    });

    // Open export modal
    const exportButton = await screen.findByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportButton);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Export Users to CSV')).toBeInTheDocument();
    });

    // Click Deselect All
    const deselectAllButton = screen.getByRole('button', { name: 'Deselect All' });
    fireEvent.click(deselectAllButton);

    // Export button should show 0 columns and be disabled
    const exportBtn = screen.getByRole('button', { name: /Export \(0 columns?\)/i });
    expect(exportBtn).toBeDisabled();

    // Click Select All
    const selectAllButton = screen.getByRole('button', { name: 'Select All' });
    fireEvent.click(selectAllButton);

    // Export button should show all columns and be enabled
    const exportBtnEnabled = screen.getByRole('button', { name: /Export \(13 columns\)/i });
    expect(exportBtnEnabled).not.toBeDisabled();
  });
});