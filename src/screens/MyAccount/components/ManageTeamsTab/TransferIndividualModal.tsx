import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { AlertCircle, ArrowRight, Shield, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';

interface TransferIndividualModalProps {
  isOpen: boolean;
  onClose: () => void;
  individual: {
    id: string; // user_id
    name: string;
    email: string;
    league_id: number;
    league_name: string;
  };
  onSuccess: () => void;
}

interface League {
  id: number;
  name: string;
  active: boolean;
}

export function TransferIndividualModal({ isOpen, onClose, individual, onSuccess }: TransferIndividualModalProps) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLeagues, setFetchingLeagues] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleLeagues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchEligibleLeagues = async () => {
    try {
      setFetchingLeagues(true);

      // Find current league's sport and ensure it's individual league
      const { data: currentLeague, error: curErr } = await supabase
        .from('leagues')
        .select('sport_id, team_registration')
        .eq('id', individual.league_id)
        .single();
      if (curErr || !currentLeague) {
        console.error('Error fetching current league:', curErr);
        showToast('Failed to fetch current league info', 'error');
        return;
      }

      // Only individual leagues, same sport, active, exclude current
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, active')
        .eq('active', true)
        .eq('team_registration', false)
        .eq('sport_id', currentLeague.sport_id)
        .neq('id', individual.league_id)
        .order('name');
      if (error) {
        console.error('Error fetching leagues:', error);
        showToast('Failed to fetch available leagues', 'error');
        return;
      }

      setLeagues(data || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setFetchingLeagues(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedLeagueId) {
      showToast('Please select a target league', 'error');
      return;
    }
    if (!session?.access_token) {
      showToast('Authentication required', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://api.ofsl.ca/functions/v1/transfer-individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: individual.id,
          currentLeagueId: String(individual.league_id),
          targetLeagueId: selectedLeagueId,
          reason: transferReason || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed');
      }
      showToast(result.message || 'Individual transferred successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Transfer error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to transfer individual', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedLeague = leagues.find(l => l.id.toString() === selectedLeagueId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 bg-white">
        <CardHeader className="relative bg-white border-b">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Shield className="h-5 w-5 text-blue-600" />
            Transfer Individual to Different League
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 bg-white">
          {/* Current Assignment */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current Assignment</div>
            <div className="font-medium text-gray-900">{individual.name}</div>
            <div className="text-sm text-gray-600 mt-1">
              League: <span className="font-medium">{individual.league_name}</span>
            </div>
          </div>

          {/* Target League Selection */}
          <div className="space-y-2">
            <label htmlFor="target-league" className="block text-sm font-medium text-gray-700">
              Transfer to League * <span className="text-xs text-gray-500">(same sport only)</span>
            </label>
            <select
              id="target-league"
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
              disabled={loading || fetchingLeagues || leagues.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#B20000] focus:border-[#B20000] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {fetchingLeagues
                  ? 'Loading leagues...'
                  : leagues.length === 0
                    ? 'No other individual leagues available for this sport'
                    : 'Select target league'}
              </option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id.toString()}>
                  {league.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Preview */}
          {selectedLeague && (
            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm text-blue-600">Transfer Preview</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium text-gray-900">{individual.league_name}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-blue-700">{selectedLeague.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Reason */}
          <div className="space-y-2">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Transfer Reason (Optional)
            </label>
            <textarea
              id="reason"
              placeholder="Enter reason for transfer (e.g., schedule conflict, skill level adjustment)"
              value={transferReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTransferReason(e.target.value)}
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#B20000] focus:border-[#B20000] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This action will move the individual to another league</li>
                  <li>Payment record will be reassigned to the new league</li>
                  <li>Transfer history will be logged for audit purposes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={loading || !selectedLeagueId} className="bg-[#B20000] hover:bg-[#8A0000]">
              {loading ? 'Transferring...' : 'Transfer Individual'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

