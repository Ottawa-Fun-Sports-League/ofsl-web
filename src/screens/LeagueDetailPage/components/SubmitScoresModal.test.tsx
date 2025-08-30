import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SubmitScoresModal } from './SubmitScoresModal';
import { supabase } from '../../../lib/supabase';

// Mock the toast hook
const mockShowToast = vi.fn();
vi.mock('../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('SubmitScoresModal', () => {
  const mockOnClose = vi.fn();
  const mockOnScoresSubmitted = vi.fn();

  const defaultTierData = {
    id: 1,
    tier_number: 1,
    team_a_name: 'Team Alpha',
    team_b_name: 'Team Beta',
    team_c_name: 'Team Charlie',
    league_id: 100,
    week_number: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal with team names', () => {
    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    expect(screen.getByText('Submit Scores - Tier 1')).toBeInTheDocument();
    expect(screen.getByText('Team A: Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team B: Team Beta')).toBeInTheDocument();
    expect(screen.getByText('Team C: Team Charlie')).toBeInTheDocument();
  });

  it('allows entering scores for each team', () => {
    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const teamAInput = screen.getByLabelText('Team A: Team Alpha');
    const teamBInput = screen.getByLabelText('Team B: Team Beta');
    const teamCInput = screen.getByLabelText('Team C: Team Charlie');

    fireEvent.change(teamAInput, { target: { value: '21' } });
    fireEvent.change(teamBInput, { target: { value: '19' } });
    fireEvent.change(teamCInput, { target: { value: '15' } });

    expect(teamAInput).toHaveValue(21);
    expect(teamBInput).toHaveValue(19);
    expect(teamCInput).toHaveValue(15);
  });

  it('disables inputs and submit button when teams are not assigned', () => {
    const incompleteTierData = {
      ...defaultTierData,
      team_b_name: null,
      team_c_name: null,
    };

    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={incompleteTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const teamBInput = screen.getByLabelText('Team B: TBD');
    const teamCInput = screen.getByLabelText('Team C: TBD');
    const submitButton = screen.getByRole('button', { name: 'Submit Scores' });

    expect(teamBInput).toBeDisabled();
    expect(teamCInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('submits scores successfully for new game results', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ error: { code: 'PGRST116' } })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    }));

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const teamAInput = screen.getByLabelText('Team A: Team Alpha');
    const teamBInput = screen.getByLabelText('Team B: Team Beta');
    const teamCInput = screen.getByLabelText('Team C: Team Charlie');
    const submitButton = screen.getByRole('button', { name: 'Submit Scores' });

    fireEvent.change(teamAInput, { target: { value: '21' } });
    fireEvent.change(teamBInput, { target: { value: '19' } });
    fireEvent.change(teamCInput, { target: { value: '15' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('game_results');
      expect(mockFrom).toHaveBeenCalledWith('weekly_schedules');
      expect(mockShowToast).toHaveBeenCalledWith('Scores submitted successfully!', 'success');
      expect(mockOnScoresSubmitted).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('updates existing game results', async () => {
    const existingResultId = 123;
    const mockFrom = vi.fn((table) => {
      if (table === 'game_results') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: existingResultId },
                error: null 
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
      if (table === 'weekly_schedules') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Submit Scores' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Scores submitted successfully!', 'success');
      expect(mockOnScoresSubmitted).toHaveBeenCalled();
    });
  });

  it('shows error when submission fails', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ error: new Error('Database error') })),
        })),
      })),
    }));

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Submit Scores' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to submit scores. Please try again.', 'error');
      expect(mockOnScoresSubmitted).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('prevents negative scores', () => {
    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const teamAInput = screen.getByLabelText('Team A: Team Alpha');
    
    fireEvent.change(teamAInput, { target: { value: '-5' } });
    
    // Score should be 0 (prevented from going negative)
    expect(teamAInput).toHaveValue(0);
  });

  it('closes modal when cancel button is clicked', () => {
    render(
      <SubmitScoresModal
        isOpen={true}
        onClose={mockOnClose}
        tierData={defaultTierData}
        onScoresSubmitted={mockOnScoresSubmitted}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});