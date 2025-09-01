import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { supabase } from '../../../lib/supabase';

interface AddPlayoffWeeksModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  currentPlayoffWeeks: number;
  onPlayoffWeeksAdded: (weeksAdded: number) => void;
}

export function AddPlayoffWeeksModal({ 
  isOpen, 
  onClose, 
  leagueId, 
  currentPlayoffWeeks, 
  onPlayoffWeeksAdded 
}: AddPlayoffWeeksModalProps) {
  const [playoffWeeks, setPlayoffWeeks] = useState(currentPlayoffWeeks); // Use the actual current value (0 by default)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update input when modal opens with current playoff weeks
  useEffect(() => {
    if (isOpen) {
      setPlayoffWeeks(currentPlayoffWeeks);
      setError(null);
    }
  }, [isOpen, currentPlayoffWeeks]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (playoffWeeks < 0 || playoffWeeks > 8) {
      setError('Please enter a number between 0 and 8');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Get current league info
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('start_date, end_date, playoff_weeks')
        .eq('id', parseInt(leagueId))
        .single();

      if (leagueError) {
        throw new Error(`Failed to load league data: ${leagueError.message}`);
      }

      if (!leagueData.start_date || !leagueData.end_date) {
        throw new Error('League must have start and end dates before adding playoff weeks');
      }

      // Calculate regular season weeks
      const start = new Date(leagueData.start_date + 'T00:00:00');
      const end = new Date(leagueData.end_date + 'T00:00:00');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

      // Update league with playoff weeks count
      const { error: updateError } = await supabase
        .from('leagues')
        .update({ playoff_weeks: playoffWeeks })
        .eq('id', parseInt(leagueId));

      if (updateError) {
        throw new Error(`Failed to update league: ${updateError.message}`);
      }

      // Smart playoff week management - preserve existing data when possible
      const newPlayoffStart = regularSeasonWeeks + 1;
      const newPlayoffEnd = regularSeasonWeeks + playoffWeeks;
      const oldPlayoffEnd = regularSeasonWeeks + currentPlayoffWeeks;

      // Handle different scenarios based on whether we're increasing or decreasing weeks
      if (playoffWeeks === 0) {
        // REMOVING all playoff weeks
        console.log(`Removing all playoff weeks (was ${currentPlayoffWeeks})`);
        
        const { error: deleteError } = await supabase
          .from('weekly_schedules')
          .delete()
          .eq('league_id', parseInt(leagueId))
          .gt('week_number', regularSeasonWeeks);

        if (deleteError && !deleteError.message.includes('No rows found')) {
          throw new Error(`Failed to remove all playoff weeks: ${deleteError.message}`);
        }
        
      } else if (playoffWeeks > currentPlayoffWeeks) {
        // INCREASING playoff weeks - only add the new weeks
        console.log(`Increasing playoff weeks from ${currentPlayoffWeeks} to ${playoffWeeks}`);
        
        // Get tier structure for new weeks
        const { data: tierStructure } = await supabase
          .from('weekly_schedules')
          .select('tier_number, location, time_slot, court, format')
          .eq('league_id', parseInt(leagueId))
          .eq('week_number', regularSeasonWeeks) // Try last regular season week
          .order('tier_number', { ascending: true });

        let tiersToUse = tierStructure;
        
        // Fallback to week 1 if needed
        if (!tiersToUse || tiersToUse.length === 0) {
          const { data: week1Tiers } = await supabase
            .from('weekly_schedules')
            .select('tier_number, location, time_slot, court, format')
            .eq('league_id', parseInt(leagueId))
            .eq('week_number', 1)
            .order('tier_number', { ascending: true });
          
          tiersToUse = week1Tiers;
        }

        if (!tiersToUse || tiersToUse.length === 0) {
          throw new Error('No tier structure found in regular season to copy for playoffs');
        }

        // Only create the NEW playoff weeks (not touching existing ones)
        const playoffRows = [];
        for (let weekNum = oldPlayoffEnd + 1; weekNum <= newPlayoffEnd; weekNum++) {
          for (const tier of tiersToUse) {
            playoffRows.push({
              league_id: parseInt(leagueId),
              week_number: weekNum,
              tier_number: tier.tier_number,
              location: tier.location || 'TBD',
              time_slot: tier.time_slot || 'TBD', 
              court: tier.court || 'TBD',
              format: tier.format || '3-teams-6-sets',
              is_playoff: true,
              no_games: false
            });
          }
        }

        if (playoffRows.length > 0) {
          const { error: playoffError } = await supabase
            .from('weekly_schedules')
            .insert(playoffRows);

          if (playoffError) {
            throw new Error(`Failed to add new playoff weeks: ${playoffError.message}`);
          }
        }

      } else if (playoffWeeks < currentPlayoffWeeks) {
        // DECREASING playoff weeks - only remove the excess weeks
        console.log(`Decreasing playoff weeks from ${currentPlayoffWeeks} to ${playoffWeeks}`);
        
        const { error: deleteError } = await supabase
          .from('weekly_schedules')
          .delete()
          .eq('league_id', parseInt(leagueId))
          .gt('week_number', newPlayoffEnd);

        if (deleteError && !deleteError.message.includes('No rows found')) {
          throw new Error(`Failed to remove excess playoff weeks: ${deleteError.message}`);
        }

      } else if (currentPlayoffWeeks === 0) {
        // ADDING playoff weeks for the first time
        console.log(`Adding ${playoffWeeks} playoff weeks for the first time`);
        
        // Get tier structure
        const { data: tierStructure } = await supabase
          .from('weekly_schedules')
          .select('tier_number, location, time_slot, court, format')
          .eq('league_id', parseInt(leagueId))
          .eq('week_number', regularSeasonWeeks)
          .order('tier_number', { ascending: true });

        let tiersToUse = tierStructure;
        
        if (!tiersToUse || tiersToUse.length === 0) {
          const { data: week1Tiers } = await supabase
            .from('weekly_schedules')
            .select('tier_number, location, time_slot, court, format')
            .eq('league_id', parseInt(leagueId))
            .eq('week_number', 1)
            .order('tier_number', { ascending: true });
          
          tiersToUse = week1Tiers;
        }

        if (!tiersToUse || tiersToUse.length === 0) {
          throw new Error('No tier structure found in regular season to copy for playoffs');
        }

        // Create all playoff weeks
        const playoffRows = [];
        for (let weekNum = newPlayoffStart; weekNum <= newPlayoffEnd; weekNum++) {
          for (const tier of tiersToUse) {
            playoffRows.push({
              league_id: parseInt(leagueId),
              week_number: weekNum,
              tier_number: tier.tier_number,
              location: tier.location || 'TBD',
              time_slot: tier.time_slot || 'TBD', 
              court: tier.court || 'TBD',
              format: tier.format || '3-teams-6-sets',
              is_playoff: true,
              no_games: false
            });
          }
        }

        if (playoffRows.length > 0) {
          const { error: playoffError } = await supabase
            .from('weekly_schedules')
            .insert(playoffRows);

          if (playoffError) {
            throw new Error(`Failed to create playoff weeks: ${playoffError.message}`);
          }
        }
      }
      // If playoffWeeks === currentPlayoffWeeks and currentPlayoffWeeks > 0, do nothing (no change)

      // Success!
      onPlayoffWeeksAdded(playoffWeeks);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 relative">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#6F6F6F]">
              {currentPlayoffWeeks > 0 ? 'Edit Playoff Weeks' : 'Add Playoff Weeks'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Number of Playoff Weeks
              </label>
              <Input
                type="number"
                min="0"
                max="8"
                value={playoffWeeks}
                onChange={(e) => setPlayoffWeeks(parseInt(e.target.value) || 0)}
                className="w-full"
                placeholder="Enter number of playoff weeks (0-8)"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-[#B20000] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-[#B20000]">
                    <strong>Note:</strong> {playoffWeeks === 0 ? 
                      'Setting to 0 will remove all playoff weeks and their data.' : 
                      'Playoff weeks will be added after your regular season ends.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#B20000] hover:bg-[#8A0000] text-white"
            >
              {saving ? (
                playoffWeeks === 0 ? 'Removing...' : 
                currentPlayoffWeeks > 0 ? 'Updating...' : 'Adding...'
              ) : (
                playoffWeeks === 0 ? 'Remove All Playoff Weeks' :
                currentPlayoffWeeks > 0 ? `Update to ${playoffWeeks} Week${playoffWeeks !== 1 ? 's' : ''}` : 
                `Add ${playoffWeeks} Week${playoffWeeks !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}