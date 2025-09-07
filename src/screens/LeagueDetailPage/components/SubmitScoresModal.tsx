import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import type { WeeklyScheduleTier } from '../../LeagueSchedulePage/types';
import { Scorecard3Teams6Sets } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard3Teams6Sets';

interface SubmitScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyTier: WeeklyScheduleTier;
}

export function SubmitScoresModal({ isOpen, onClose, weeklyTier }: SubmitScoresModalProps) {
  const teamNames = {
    A: (weeklyTier as any).team_a_name || '',
    B: (weeklyTier as any).team_b_name || '',
    C: (weeklyTier as any).team_c_name || '',
  } as const;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="submit-scores-description">
        <DialogHeader>
          <DialogTitle>Submit Scores - Tier {weeklyTier.tier_number}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {weeklyTier.format !== '3-teams-6-sets' ? (
            <div className="text-sm text-gray-700">
              Score submission for this format is not available yet. Please check back after the scorecard is built.
            </div>
          ) : (
            <Scorecard3Teams6Sets
              teamNames={teamNames as any}
              onSubmit={() => {
                // TODO: integrate persistence when backend is ready
                onClose();
              }}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
