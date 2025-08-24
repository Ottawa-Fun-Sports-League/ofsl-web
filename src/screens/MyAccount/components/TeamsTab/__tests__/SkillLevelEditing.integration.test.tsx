import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamsSection } from '../TeamsSection';
import { SkillLevelEditModal } from '../SkillLevelEditModal';
import { MissingSkillLevelPrompt } from '../MissingSkillLevelPrompt';
import { supabase } from '../../../../../lib/supabase';

// Mock dependencies
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../../../components/ui/toast', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

describe('Skill Level Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SkillLevelEditModal', () => {
    it('should update team skill level successfully', async () => {
      const _mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockOnUpdate = vi.fn();
      const mockOnClose = vi.fn();

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      render(
        <SkillLevelEditModal
          isOpen={true}
          onClose={mockOnClose}
          currentSkillId={1}
          isTeamRegistration={true}
          teamId={123}
          teamName="Test Team"
          onUpdate={mockOnUpdate}
        />
      );

      // Select a different skill level
      const intermediateOption = screen.getByText('Intermediate');
      fireEvent.click(intermediateOption);

      // Click update button
      const updateButton = screen.getByText('Update Skill Level');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(2, 'Intermediate');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should update individual registration skill level successfully', async () => {
      const mockOnUpdate = vi.fn();
      const mockOnClose = vi.fn();

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      render(
        <SkillLevelEditModal
          isOpen={true}
          onClose={mockOnClose}
          currentSkillId={null}
          isTeamRegistration={false}
          paymentId={456}
          teamName="Test League"
          onUpdate={mockOnUpdate}
        />
      );

      // Select a skill level
      const beginnerOption = screen.getByText('Beginner');
      fireEvent.click(beginnerOption);

      // Click update button
      const updateButton = screen.getByText('Update Skill Level');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(1, 'Beginner');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should disable update button when no skill level is selected', async () => {
      const { container: _container } = render(
        <SkillLevelEditModal
          isOpen={true}
          onClose={vi.fn()}
          currentSkillId={null}
          isTeamRegistration={true}
          teamId={123}
          teamName="Test Team"
          onUpdate={vi.fn()}
        />
      );

      // Check that update button is disabled when no skill level is selected
      const updateButton = screen.getByText('Update Skill Level');
      expect(updateButton).toBeDisabled();
      
      // Select a skill level
      const beginnerOption = screen.getByText('Beginner');
      fireEvent.click(beginnerOption);
      
      // Now the button should be enabled
      expect(updateButton).not.toBeDisabled();
    });

    it('should be disabled when selected skill is same as current', () => {
      render(
        <SkillLevelEditModal
          isOpen={true}
          onClose={vi.fn()}
          currentSkillId={2}
          isTeamRegistration={true}
          teamId={123}
          teamName="Test Team"
          onUpdate={vi.fn()}
        />
      );

      // Select the current skill level
      const intermediateOption = screen.getByText('Intermediate');
      fireEvent.click(intermediateOption);

      // Check update button is disabled
      const updateButton = screen.getByText('Update Skill Level');
      expect(updateButton).toBeDisabled();
    });
  });

  describe('MissingSkillLevelPrompt', () => {
    it('should prompt for missing skill levels sequentially', async () => {
      const mockOnComplete = vi.fn();
      const missingRegistrations = [
        { paymentId: 1, leagueName: 'League 1', isTeam: false },
        { paymentId: 2, leagueName: 'League 2', isTeam: false },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      render(
        <MissingSkillLevelPrompt
          missingSkillRegistrations={missingRegistrations}
          onComplete={mockOnComplete}
        />
      );

      // Check first registration is shown
      expect(screen.getByText(/League 1/)).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 registration/)).toBeInTheDocument();

      // Select a skill level and update
      const beginnerOption = screen.getByText('Beginner');
      fireEvent.click(beginnerOption);

      const updateButton = screen.getByText('Set Skill Level');
      fireEvent.click(updateButton);

      // Wait for second registration to appear
      await waitFor(() => {
        expect(screen.getByText(/League 2/)).toBeInTheDocument();
        expect(screen.getByText(/2 of 2 registration/)).toBeInTheDocument();
      });
    });

    it('should require skill level selection (no skip option)', async () => {
      const mockOnComplete = vi.fn();
      const missingRegistrations = [
        { paymentId: 1, leagueName: 'League 1', isTeam: false },
      ];

      render(
        <MissingSkillLevelPrompt
          missingSkillRegistrations={missingRegistrations}
          onComplete={mockOnComplete}
        />
      );

      // Verify skip button doesn't exist
      expect(screen.queryByText('Skip for Now')).not.toBeInTheDocument();
      
      // Verify user must select a skill level
      const setButton = screen.getByText('Set Skill Level');
      expect(setButton).toBeDisabled(); // Disabled until a skill is selected
      
      // Select a skill level
      const beginnerOption = screen.getByText('Beginner');
      fireEvent.click(beginnerOption);
      
      // Now the button should be enabled
      expect(setButton).not.toBeDisabled();
    });

    it('should handle team registration skill level updates', async () => {
      const mockOnComplete = vi.fn();
      const missingRegistrations = [
        { paymentId: 1, leagueName: 'Team 1', isTeam: true, teamId: 123 },
      ];

      const _mockUpdate = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      render(
        <MissingSkillLevelPrompt
          missingSkillRegistrations={missingRegistrations}
          onComplete={mockOnComplete}
        />
      );

      // Select a skill level and update  
      const advancedOptions = screen.getAllByText('Advanced');
      // Click on the label text, not the description
      fireEvent.click(advancedOptions[0]);

      const updateButton = screen.getByText('Set Skill Level');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  describe('TeamsSection Skill Level Chips', () => {
    it('should show clickable skill level chip for teams with skill level', () => {
      const teams = [
        {
          id: 1,
          name: 'Test Team',
          captain_id: 'user1',
          roster: ['user1'],
          active: true,
          skill: { id: 2, name: 'Intermediate' },
          league: { id: 1, name: 'Test League' },
        },
      ];

      render(
        <BrowserRouter>
          <TeamsSection
            teams={teams}
            currentUserId="user1"
            leaguePayments={[]}
            unregisteringPayment={null}
            leavingTeam={null}
            onUnregister={vi.fn()}
            onLeaveTeam={vi.fn()}
          />
        </BrowserRouter>
      );

      const skillChip = screen.getByText('Intermediate');
      expect(skillChip.closest('button')).toBeInTheDocument();
      expect(skillChip.closest('button')).toHaveClass('hover:bg-yellow-200');
    });

    it('should show "Set Skill Level" button for teams without skill level', () => {
      const teams = [
        {
          id: 1,
          name: 'Test Team',
          captain_id: 'user1',
          roster: ['user1'],
          active: true,
          skill: null,
          league: { id: 1, name: 'Test League' },
        },
      ];

      render(
        <BrowserRouter>
          <TeamsSection
            teams={teams}
            currentUserId="user1"
            leaguePayments={[{ id: 1, team_id: 1, league_name: 'Test League', team_name: 'Test Team', amount_due: 100, amount_paid: 0, status: 'pending', due_date: '2025-01-01', payment_method: null }]}
            unregisteringPayment={null}
            leavingTeam={null}
            onUnregister={vi.fn()}
            onLeaveTeam={vi.fn()}
          />
        </BrowserRouter>
      );

      const setSkillButton = screen.getByText('Set Skill Level');
      expect(setSkillButton.closest('button')).toBeInTheDocument();
      expect(setSkillButton.closest('button')).toHaveClass('animate-pulse');
    });

    it('should show skill level chip for individual registrations with skill level', () => {
      const individualLeagues = [
        {
          id: 1,
          name: 'Test League',
          cost: 100,
        },
      ];

      const leaguePayments = [
        {
          id: 1,
          team_id: null,
          league_id: 1,
          league_name: 'Test League',
          team_name: '',
          amount_due: 100,
          amount_paid: 0,
          status: 'pending' as const,
          due_date: '2025-01-01',
          payment_method: null,
          skill_level_id: 3,
          skill_name: 'Advanced',
        },
      ];

      render(
        <BrowserRouter>
          <TeamsSection
            teams={[]}
            individualLeagues={individualLeagues}
            currentUserId="user1"
            leaguePayments={leaguePayments}
            unregisteringPayment={null}
            leavingTeam={null}
            onUnregister={vi.fn()}
            onLeaveTeam={vi.fn()}
          />
        </BrowserRouter>
      );

      const skillChip = screen.getByText('Advanced');
      expect(skillChip.closest('button')).toBeInTheDocument();
    });
  });
});