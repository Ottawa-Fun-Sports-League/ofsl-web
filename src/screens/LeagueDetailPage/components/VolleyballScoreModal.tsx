import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { X, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  getMatchWithSets, 
  submitMatchScores, 
  validateScoreSubmission,
  checkScorePermissions 
} from '../../../lib/volleyball';
import type { 
  Match, 
  ScoreSubmissionRequest, 
  MatchValidation, 
  ScoreEntryPermissions 
} from '../../../types/volleyball';
import { useAuth } from '../../../contexts/AuthContext';

interface VolleyballScoreModalProps {
  showModal: boolean;
  matchId: number | null;
  closeModal: () => void;
  onScoreSubmitted?: () => void;
}

interface SetScore {
  set_number: number;
  team_a_score: number;
  team_b_score: number;
  team_c_score: number;
}

export function VolleyballScoreModal({ 
  showModal, 
  matchId, 
  closeModal,
  onScoreSubmitted 
}: VolleyballScoreModalProps) {
  const { userProfile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [sets, setSets] = useState<SetScore[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<MatchValidation | null>(null);
  const [permissions, setPermissions] = useState<ScoreEntryPermissions | null>(null);

  useEffect(() => {
    if (showModal && matchId && userProfile) {
      loadMatchData();
      checkPermissions();
    }
  }, [showModal, matchId, userProfile, loadMatchData, checkPermissions]);

  const loadMatchData = useCallback(async () => {
    if (!matchId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const matchData = await getMatchWithSets(matchId);
      setMatch(matchData);
      
      // If match already has sets, load them
      if (matchData.sets && matchData.sets.length > 0) {
        const existingSets = matchData.sets.map(set => ({
          set_number: set.set_number,
          team_a_score: set.team_a_score,
          team_b_score: set.team_b_score,
          team_c_score: set.team_c_score
        }));
        setSets(existingSets);
      } else {
        // Initialize with one empty set
        setSets([{
          set_number: 1,
          team_a_score: 0,
          team_b_score: 0,
          team_c_score: 0
        }]);
      }
      
      setNotes(matchData.notes || '');
    } catch (err) {
      console.error('Error loading match:', err);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const checkPermissions = useCallback(async () => {
    if (!matchId || !userProfile) return;
    
    try {
      const perms = await checkScorePermissions(matchId, userProfile.id);
      setPermissions(perms);
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  }, [matchId, userProfile]);

  const addSet = () => {
    const newSetNumber = sets.length + 1;
    setSets([...sets, {
      set_number: newSetNumber,
      team_a_score: 0,
      team_b_score: 0,
      team_c_score: 0
    }]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return; // Don't allow removing the last set
    
    const newSets = sets.filter((_, i) => i !== index);
    // Renumber the sets
    const renumberedSets = newSets.map((set, i) => ({
      ...set,
      set_number: i + 1
    }));
    setSets(renumberedSets);
  };

  const updateSetScore = (index: number, team: 'team_a_score' | 'team_b_score' | 'team_c_score', value: number) => {
    const newSets = [...sets];
    newSets[index] = {
      ...newSets[index],
      [team]: Math.max(0, value) // Ensure non-negative
    };
    setSets(newSets);
  };

  const validateScores = async () => {
    if (!matchId) return;
    
    try {
      const request: ScoreSubmissionRequest = {
        match_id: matchId,
        sets,
        notes
      };
      
      const validationResult = await validateScoreSubmission(request);
      setValidation(validationResult);
      return validationResult.is_valid;
    } catch (err) {
      console.error('Error validating scores:', err);
      setValidation({
        is_valid: false,
        errors: ['Validation failed'],
        warnings: []
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matchId || !permissions?.can_enter_scores) {
      setError('You do not have permission to enter scores for this match');
      return;
    }

    const isValid = await validateScores();
    if (!isValid) {
      return; // Validation errors will be displayed
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const request: ScoreSubmissionRequest = {
        match_id: matchId,
        sets,
        notes
      };
      
      await submitMatchScores(request);
      
      // Show success and close modal
      if (onScoreSubmitted) {
        onScoreSubmitted();
      }
      closeModal();
      
    } catch (err) {
      console.error('Error submitting scores:', err);
      setError('Failed to submit scores. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSets([]);
    setNotes('');
    setError(null);
    setValidation(null);
    setMatch(null);
    closeModal();
  };

  if (!showModal || !matchId) {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B20000]"></div>
            <span>Loading match data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!permissions?.can_enter_scores) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
          </div>
          <p className="text-gray-700 mb-6">
            {permissions?.reason || 'You do not have permission to enter scores for this match.'}
          </p>
          <div className="flex justify-end">
            <Button onClick={handleClose} className="bg-gray-500 hover:bg-gray-600 text-white">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#6F6F6F]">Enter Set Scores</h2>
              {match && (
                <p className="text-gray-600 mt-1">
                  Tier {match.tier} • {new Date(match.match_date).toLocaleDateString()}
                  {match.time_slot && ` • ${match.time_slot}`}
                </p>
              )}
            </div>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validation && (
            <div className="mb-6">
              {validation.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="font-medium text-red-800">Validation Errors:</span>
                  </div>
                  <ul className="list-disc pl-6 text-red-700">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="font-medium text-yellow-800">Warnings:</span>
                  </div>
                  <ul className="list-disc pl-6 text-yellow-700">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Teams Display */}
          {match && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-bold text-[#6F6F6F] mb-3">Teams</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <span className="font-bold text-[#B20000] block">Position A</span>
                    <span className="text-[#6F6F6F]">{match.team_a?.name || 'TBD'}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-[#B20000] block">Position B</span>
                    <span className="text-[#6F6F6F]">{match.team_b?.name || 'TBD'}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-[#B20000] block">Position C</span>
                    <span className="text-[#6F6F6F]">{match.team_c?.name || 'TBD'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Set Scores Form */}
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#6F6F6F]">Set Scores</h3>
                  <Button
                    type="button"
                    onClick={addSet}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
                    disabled={sets.length >= 5} // Volleyball typically max 5 sets
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Set
                  </Button>
                </div>

                <div className="space-y-4">
                  {sets.map((set, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-[#6F6F6F]">Set {set.set_number}</h4>
                        {sets.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeSet(index)}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm px-2 py-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#6F6F6F] mb-1">
                            Team A Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={set.team_a_score}
                            onChange={(e) => updateSetScore(index, 'team_a_score', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-md text-center text-lg font-medium"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[#6F6F6F] mb-1">
                            Team B Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={set.team_b_score}
                            onChange={(e) => updateSetScore(index, 'team_b_score', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-md text-center text-lg font-medium"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[#6F6F6F] mb-1">
                            Team C Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={set.team_c_score}
                            onChange={(e) => updateSetScore(index, 'team_c_score', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-md text-center text-lg font-medium"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-bold text-[#6F6F6F] mb-3">Match Notes (Optional)</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Enter any additional notes about the match..."
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                onClick={handleClose}
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Button
                type="button"
                onClick={validateScores}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] px-6 py-2"
                disabled={submitting}
              >
                Validate Scores
              </Button>
              
              <Button
                type="submit"
                className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2"
                disabled={submitting || (validation ? !validation.is_valid : false)}
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Scores
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}