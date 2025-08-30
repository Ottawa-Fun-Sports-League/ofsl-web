import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/toast';

interface GameResult {
  team_a_score: number;
  team_b_score: number;
  team_c_score: number;
}

interface SubmitScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierData: {
    id: number;
    tier_number: number;
    team_a_name: string | null;
    team_b_name: string | null;
    team_c_name: string | null;
    league_id: number;
    week_number: number;
  };
  onScoresSubmitted: () => void;
}

export function SubmitScoresModal({
  isOpen,
  onClose,
  tierData,
  onScoresSubmitted,
}: SubmitScoresModalProps) {
  const { showToast } = useToast();
  const [scores, setScores] = useState<GameResult>({
    team_a_score: 0,
    team_b_score: 0,
    team_c_score: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreChange = (team: keyof GameResult, value: string) => {
    const numValue = parseInt(value) || 0;
    setScores(prev => ({
      ...prev,
      [team]: Math.max(0, numValue),
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Check if all teams are present
      if (!tierData.team_a_name || !tierData.team_b_name || !tierData.team_c_name) {
        showToast('Cannot submit scores: Not all teams are assigned', 'error');
        return;
      }

      // First, check if a game result already exists
      const { data: existingResult, error: checkError } = await supabase
        .from('game_results')
        .select('id')
        .eq('weekly_schedule_id', tierData.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingResult) {
        // Update existing result
        const { error: updateError } = await supabase
          .from('game_results')
          .update({
            team_a_score: scores.team_a_score,
            team_b_score: scores.team_b_score,
            team_c_score: scores.team_c_score,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResult.id);

        if (updateError) throw updateError;
      } else {
        // Create new result
        const { error: insertError } = await supabase
          .from('game_results')
          .insert({
            weekly_schedule_id: tierData.id,
            league_id: tierData.league_id,
            week_number: tierData.week_number,
            tier_number: tierData.tier_number,
            team_a_score: scores.team_a_score,
            team_b_score: scores.team_b_score,
            team_c_score: scores.team_c_score,
          });

        if (insertError) throw insertError;
      }

      // Mark the weekly schedule as completed
      const { error: updateScheduleError } = await supabase
        .from('weekly_schedules')
        .update({ is_completed: true })
        .eq('id', tierData.id);

      if (updateScheduleError) throw updateScheduleError;

      showToast('Scores submitted successfully!', 'success');
      onScoresSubmitted();
      onClose();
      
      // Reset scores
      setScores({
        team_a_score: 0,
        team_b_score: 0,
        team_c_score: 0,
      });
    } catch (error) {
      console.error('Error submitting scores:', error);
      showToast('Failed to submit scores. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Scores - Tier {tierData.tier_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team A Score */}
          <div className="space-y-2">
            <label htmlFor="team-a-score" className="text-sm font-medium text-gray-700">
              Team A: {tierData.team_a_name || 'TBD'}
            </label>
            <Input
              id="team-a-score"
              type="number"
              min="0"
              value={scores.team_a_score}
              onChange={(e) => handleScoreChange('team_a_score', e.target.value)}
              disabled={!tierData.team_a_name || isSubmitting}
              placeholder="Enter score"
            />
          </div>

          {/* Team B Score */}
          <div className="space-y-2">
            <label htmlFor="team-b-score" className="text-sm font-medium text-gray-700">
              Team B: {tierData.team_b_name || 'TBD'}
            </label>
            <Input
              id="team-b-score"
              type="number"
              min="0"
              value={scores.team_b_score}
              onChange={(e) => handleScoreChange('team_b_score', e.target.value)}
              disabled={!tierData.team_b_name || isSubmitting}
              placeholder="Enter score"
            />
          </div>

          {/* Team C Score */}
          <div className="space-y-2">
            <label htmlFor="team-c-score" className="text-sm font-medium text-gray-700">
              Team C: {tierData.team_c_name || 'TBD'}
            </label>
            <Input
              id="team-c-score"
              type="number"
              min="0"
              value={scores.team_c_score}
              onChange={(e) => handleScoreChange('team_c_score', e.target.value)}
              disabled={!tierData.team_c_name || isSubmitting}
              placeholder="Enter score"
            />
          </div>

          {/* Info text */}
          <p className="text-sm text-gray-500">
            Enter the final scores for each team. These scores will be used to update standings and rankings.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !tierData.team_a_name ||
              !tierData.team_b_name ||
              !tierData.team_c_name
            }
          >
            {isSubmitting ? 'Submitting...' : 'Submit Scores'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}