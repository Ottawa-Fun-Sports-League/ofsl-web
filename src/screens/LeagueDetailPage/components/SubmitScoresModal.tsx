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
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

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

  const [pointsOffset, setPointsOffset] = useState<number>(0);
  const [isTopTier, setIsTopTier] = useState<boolean>(false);
  const [resultsLabel, setResultsLabel] = useState<string>('Weekly Summary');

  useEffect(() => {
    const fetchMaxTier = async () => {
      try {
        const leagueId = (weeklyTier as any).league_id as number | undefined;
        const week = (weeklyTier as any).week_number as number | undefined;
        if (!leagueId || !week) {
          setPointsOffset(0);
          setIsTopTier((weeklyTier.tier_number || 1) === 1);
          setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''}`);
          return;
        }
        const { data, error } = await supabase
          .from('weekly_schedules')
          .select('tier_number')
          .eq('league_id', leagueId)
          .eq('week_number', week);
        if (error) throw error;
        const maxTier = Math.max(
          weeklyTier.tier_number || 1,
          ...((data || []).map(r => (r as any).tier_number as number) || [1])
        );
        const offset = Math.max(0, (maxTier - (weeklyTier.tier_number || 1)));
        setPointsOffset(offset);
        setIsTopTier((weeklyTier.tier_number || 1) === 1);

        // Compute results label date
        const { data: leagueRow } = await supabase
          .from('leagues')
          .select('start_date')
          .eq('id', leagueId)
          .single();
        if (leagueRow?.start_date) {
          const start = new Date(leagueRow.start_date + 'T00:00:00');
          const weekDate = new Date(start);
          weekDate.setDate(start.getDate() + ((week ?? 1) - 1) * 7);
          const formatted = weekDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''} - ${formatted}`);
        } else {
          setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''}`);
        }
      } catch {
        setPointsOffset(0);
        setIsTopTier((weeklyTier.tier_number || 1) === 1);
        setResultsLabel(`Results Week ${weeklyTier.tier_number ?? ''}`);
      }
    };
    fetchMaxTier();
  }, [weeklyTier]);

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
              isTopTier={isTopTier}
              pointsTierOffset={pointsOffset}
              tierNumber={weeklyTier.tier_number}
              resultsLabel={resultsLabel}
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
