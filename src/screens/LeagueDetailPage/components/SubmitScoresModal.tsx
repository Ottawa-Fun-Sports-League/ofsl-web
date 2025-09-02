import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

interface SubmitScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierData: {
    tier_number: number;
  };
}

export function SubmitScoresModal({
  isOpen,
  onClose,
  tierData,
}: SubmitScoresModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="submit-scores-description">
        <DialogHeader>
          <DialogTitle>Submit Scores - Tier {tierData.tier_number}</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <div className="text-center">
            <p id="submit-scores-description" className="text-gray-600 mb-4">
              This feature is currently being built and will be available soon.
            </p>
            <p className="text-sm text-gray-500">
              Score submission functionality coming in the next release.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}