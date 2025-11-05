import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LeagueEditPage } from '../LeagueEditPage';
import { supabase } from '../../../../lib/supabase';

// Mock AuthContext
const mockAuthContext = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  userProfile: { id: 'test-user-id', name: 'Test User', is_admin: true },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
};

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock dependencies
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('../../../../lib/stripe', () => ({
  getStripeProductByLeagueId: vi.fn().mockResolvedValue(null),
  updateStripeProductLeagueId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../lib/leagues', () => ({
  fetchLeagueById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test League',
    description: 'Test Description',
    league_type: 'regular_season',
    gender: 'Mixed',
    sport_id: 1,
    skill_id: 1,
    skill_ids: [1],
    day_of_week: 1,
    start_date: '2025-01-01',
    end_date: '2025-03-31',
    cost: 250,
    max_teams: 20,
    gym_ids: [1],
    payment_due_date: '2025-08-21',
    deposit_amount: 50,
    deposit_date: '2025-01-15',
    active: true,
    hide_day: false,
    year: '2025',
    created_at: '2024-01-01',
    sport_name: 'Volleyball',
    skill_name: 'Intermediate',
    location: null,
    additional_info: null,
    gyms: [],
    is_draft: false,
    publish_date: null,
  }),
  fetchSports: vi.fn().mockResolvedValue([
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' },
  ]),
  fetchSkills: vi.fn().mockResolvedValue([
    { id: 1, name: 'Intermediate', order_index: 1 },
    { id: 2, name: 'Advanced', order_index: 2 },
  ]),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

describe('League Deposit Fields', () => {
  let mockGymsData: Array<{ id: number; gym: string; address: string; active: boolean }>;
  let mockGameResultsData: Array<{ week_number: number }>;
  let mockScheduleRow: { id: number } | null;
  let mockLeagueUpdateResponse: { data: unknown; error: null };
  let updateMock: Mock;
  let updateEqMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGymsData = [{ id: 1, gym: 'Test Gym', address: '123 Test St', active: true }];
    mockGameResultsData = [];
    mockScheduleRow = null;
    mockLeagueUpdateResponse = { data: [], error: null };
    updateMock = vi.fn();
    updateEqMock = vi.fn();

    const fromMock = supabase.from as unknown as Mock;
    fromMock.mockImplementation((table: string) => {
      if (table === 'gyms') {
        const select = vi.fn().mockReturnThis();
        const eq = vi.fn().mockReturnThis();
        const order = vi.fn().mockImplementation(async () => ({
          data: mockGymsData,
          error: null,
        }));
        return {
          select,
          eq,
          order,
        } as unknown as ReturnType<typeof supabase.from>;
      }

      if (table === 'game_results') {
        const select = vi.fn().mockReturnThis();
        const eq = vi.fn().mockReturnThis();
        const order = vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(async () => ({
            data: mockGameResultsData,
            error: null,
          })),
        });
        return {
          select,
          eq,
          order,
        } as unknown as ReturnType<typeof supabase.from>;
      }

      if (table === 'league_schedules') {
        const select = vi.fn().mockReturnThis();
        const eq = vi.fn().mockReturnThis();
        const maybeSingle = vi.fn().mockImplementation(async () => ({
          data: mockScheduleRow,
          error: null,
        }));
        return {
          select,
          eq,
          maybeSingle,
        } as unknown as ReturnType<typeof supabase.from>;
      }

      if (table === 'leagues') {
        updateEqMock = vi.fn().mockImplementation(async (_column: string, _value: unknown) => {
          // preserve chaining signature (column, value)
          return mockLeagueUpdateResponse;
        });
        updateMock = vi.fn().mockReturnValue({
          eq: updateEqMock,
        });
        return {
          update: updateMock,
        } as unknown as ReturnType<typeof supabase.from>;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
      } as unknown as ReturnType<typeof supabase.from>;
    });
  });

  it('should display deposit fields in the edit form', async () => {
    render(
      <BrowserRouter>
        <LeagueEditPage />
      </BrowserRouter>
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(screen.getAllByText(/Deposit Amount/i).length).toBeGreaterThan(0);
    });

    // Check that deposit fields are rendered by placeholder
    const depositAmountInput = screen.getByPlaceholderText(/0\.00 \(optional\)/i);
    const depositDateInput = screen.getByDisplayValue('2025-01-15');

    expect(depositAmountInput).toBeInTheDocument();
    expect(depositDateInput).toBeInTheDocument();

    // Check that the existing values are loaded
    expect(depositAmountInput).toHaveValue(50);
    expect(depositDateInput).toHaveValue('2025-01-15');
  });

  it('should allow editing deposit fields', async () => {
    render(
      <BrowserRouter>
        <LeagueEditPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Deposit Amount/i).length).toBeGreaterThan(0);
    });

    const depositAmountInput = screen.getByPlaceholderText(/0\.00 \(optional\)/i);
    const depositDateInput = screen.getByDisplayValue('2025-01-15');

    // Change deposit amount
    fireEvent.change(depositAmountInput, { target: { value: '75' } });
    expect(depositAmountInput).toHaveValue(75);

    // Change deposit date
    fireEvent.change(depositDateInput, { target: { value: '2025-02-01' } });
    expect(depositDateInput).toHaveValue('2025-02-01');
  });

  it('should disable deposit date when no deposit amount is set', async () => {
    render(
      <BrowserRouter>
        <LeagueEditPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Deposit Amount/i).length).toBeGreaterThan(0);
    });

    const depositAmountInput = screen.getByPlaceholderText(/0\.00 \(optional\)/i);
    const depositDateInput = screen.getByDisplayValue('2025-01-15');

    // Clear deposit amount
    fireEvent.change(depositAmountInput, { target: { value: '' } });

    // Check that deposit date is disabled
    expect(depositDateInput).toBeDisabled();

    // Set deposit amount
    fireEvent.change(depositAmountInput, { target: { value: '100' } });

    // Check that deposit date is enabled
    expect(depositDateInput).not.toBeDisabled();
  });

  it('should save deposit fields when updating league', async () => {
    render(
      <BrowserRouter>
        <LeagueEditPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Deposit Amount/i).length).toBeGreaterThan(0);
    });

    const depositAmountInput = screen.getByPlaceholderText(/0\.00 \(optional\)/i);
    const depositDateInput = screen.getByDisplayValue('2025-01-15');
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Change deposit fields
    fireEvent.change(depositAmountInput, { target: { value: '100' } });
    fireEvent.change(depositDateInput, { target: { value: '2025-02-15' } });

    // Click save
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deposit_amount: 100,
          deposit_date: '2025-02-15',
        })
      );
      expect(updateEqMock).toHaveBeenCalledWith('id', '1');
    });
  });

  it('should save null deposit fields when cleared', async () => {
    render(
      <BrowserRouter>
        <LeagueEditPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Deposit Amount/i).length).toBeGreaterThan(0);
    });

    const depositAmountInput = screen.getByPlaceholderText(/0\.00 \(optional\)/i);
    const depositDateInput = screen.getByDisplayValue('2025-01-15');
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Clear deposit fields
    fireEvent.change(depositAmountInput, { target: { value: '' } });
    fireEvent.change(depositDateInput, { target: { value: '' } });

    // Click save
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deposit_amount: null,
          deposit_date: null,
        })
      );
      expect(updateEqMock).toHaveBeenCalledWith('id', '1');
    });
  });
});
