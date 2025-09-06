import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import type { WeeklyScheduleTier } from '../types';
import { Scorecard3Teams6Sets } from '../../MyAccount/components/ScorecardsFormatsTab/components/Scorecard3Teams6Sets';

interface SubmitScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyTier: WeeklyScheduleTier | null;
}

export function SubmitScoresModal({ isOpen, onClose, weeklyTier }: SubmitScoresModalProps) {
  if (!weeklyTier) return null;

  const teamNames = {
    A: (weeklyTier as any).team_a_name || '',
    B: (weeklyTier as any).team_b_name || '',
    C: (weeklyTier as any).team_c_name || '',
  } as const;

  const title = `Submit Scores - Tier ${weeklyTier.tier_number ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="submit-scores-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Scorecard3Teams6Sets
            teamNames={teamNames as any}
            onSubmit={() => {
              // TODO: integrate API to persist scores
              onClose();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
