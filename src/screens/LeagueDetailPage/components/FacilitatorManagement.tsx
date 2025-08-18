import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { User, UserCheck, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getLeagueSchedule } from '../../../lib/volleyball';
import type { WeeklySchedule, Match } from '../../../types/volleyball';

interface FacilitatorManagementProps {
  leagueId: number;
  isAdmin: boolean;
}

interface Facilitator {
  id: string;
  name: string;
  email?: string;
  is_facilitator: boolean;
}

interface MatchAssignment {
  matchId: number;
  facilitatorId: string | null;
  currentFacilitator?: string;
}

export function FacilitatorManagement({ leagueId, isAdmin }: FacilitatorManagementProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule[]>([]);
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [assignments, setAssignments] = useState<MatchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load schedule and facilitators in parallel
      const [scheduleResponse, facilitatorsResponse] = await Promise.all([
        getLeagueSchedule(leagueId),
        loadFacilitators()
      ]);

      setSchedule(scheduleResponse.schedules);
      setFacilitators(facilitatorsResponse);

      // Create initial assignments from current schedule
      const currentWeekSchedule = scheduleResponse.schedules.find(s => s.week_number === selectedWeek);
      if (currentWeekSchedule) {
        const initialAssignments: MatchAssignment[] = [];
        currentWeekSchedule.tiers.forEach(tier => {
          tier.matches.forEach(match => {
            initialAssignments.push({
              matchId: match.id,
              facilitatorId: match.facilitator_id || null,
              currentFacilitator: match.facilitator?.name
            });
          });
        });
        setAssignments(initialAssignments);
      }

    } catch (err) {
      console.error('Error loading facilitator data:', err);
      setError('Failed to load facilitator data');
    } finally {
      setLoading(false);
    }
  }, [leagueId, selectedWeek]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [leagueId, isAdmin, selectedWeek, loadData]);

  const loadFacilitators = async (): Promise<Facilitator[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, is_facilitator')
      .or('is_facilitator.eq.true,is_admin.eq.true')
      .order('name');

    if (error) throw error;
    return data || [];
  };

  const updateAssignment = (matchId: number, facilitatorId: string | null) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.matchId === matchId 
          ? { ...assignment, facilitatorId }
          : assignment
      )
    );
  };

  const autoAssignFacilitators = async () => {
    try {
      setSaving(true);
      setError(null);

      const currentWeekSchedule = schedule.find(s => s.week_number === selectedWeek);
      if (!currentWeekSchedule) return;

      // Get all matches for this week
      const matches: Match[] = [];
      currentWeekSchedule.tiers.forEach(tier => {
        matches.push(...tier.matches);
      });

      // Auto-assign facilitators using round-robin
      const availableFacilitators = facilitators.filter(f => f.is_facilitator);
      if (availableFacilitators.length === 0) {
        setError('No facilitators available for assignment');
        return;
      }

      const newAssignments = matches.map((match, index) => ({
        matchId: match.id,
        facilitatorId: availableFacilitators[index % availableFacilitators.length].id,
        currentFacilitator: match.facilitator?.name
      }));

      setAssignments(newAssignments);

    } catch (err) {
      console.error('Error auto-assigning facilitators:', err);
      setError('Failed to auto-assign facilitators');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignments = async () => {
    try {
      setSaving(true);
      setError(null);

      // Update each match with its assigned facilitator
      const updates = assignments.map(assignment => 
        supabase
          .from('matches')
          .update({ 
            facilitator_id: assignment.facilitatorId,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.matchId)
      );

      await Promise.all(updates);

      // Reload data to show updated assignments
      await loadData();

    } catch (err) {
      console.error('Error saving assignments:', err);
      setError('Failed to save facilitator assignments');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Admin Access Required</h3>
        <p className="text-gray-500">Only administrators can manage facilitator assignments.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        </div>
      </div>
    );
  }

  const currentWeekSchedule = schedule.find(s => s.week_number === selectedWeek);
  const totalWeeks = Math.max(...schedule.map(s => s.week_number), 1);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#6F6F6F]">Facilitator Management</h2>
        
        {/* Week Selection */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-[#6F6F6F]">Week:</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </div>
          
          <Button
            onClick={autoAssignFacilitators}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Auto Assign
          </Button>
          
          <Button
            onClick={saveAssignments}
            disabled={saving}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Facilitators Summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-bold text-[#6F6F6F] mb-3">Available Facilitators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {facilitators.map(facilitator => (
              <div key={facilitator.id} className="flex items-center p-2 bg-gray-50 rounded">
                <User className="h-4 w-4 text-gray-500 mr-2" />
                <div>
                  <div className="font-medium text-sm">{facilitator.name}</div>
                  {facilitator.email && (
                    <div className="text-xs text-gray-500">{facilitator.email}</div>
                  )}
                </div>
                {facilitator.is_facilitator && (
                  <div className="ml-auto">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Facilitator
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Match Assignments */}
      {currentWeekSchedule ? (
        <div className="space-y-6">
          {currentWeekSchedule.tiers.map(tier => (
            <Card key={tier.tier_number}>
              <CardContent className="p-4">
                <h3 className="font-bold text-[#6F6F6F] mb-4">
                  Tier {tier.tier_number} Matches
                </h3>
                
                <div className="space-y-3">
                  {tier.matches.map(match => {
                    const assignment = assignments.find(a => a.matchId === match.id);
                    
                    return (
                      <div key={match.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-2">
                              {match.team_a?.name || 'TBD'} vs {match.team_b?.name || 'TBD'} vs {match.team_c?.name || 'TBD'}
                            </div>
                            <div className="text-xs text-gray-500 space-x-4">
                              <span>📅 {new Date(match.match_date).toLocaleDateString()}</span>
                              {match.time_slot && <span>⏰ {match.time_slot}</span>}
                              {match.court && <span>🏟️ {match.court}</span>}
                              {match.gym?.gym && <span>📍 {match.gym.gym}</span>}
                            </div>
                          </div>
                          
                          <div className="ml-4 min-w-[200px]">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Assigned Facilitator
                            </label>
                            <select
                              value={assignment?.facilitatorId || ''}
                              onChange={(e) => updateAssignment(match.id, e.target.value || null)}
                              className="w-full px-3 py-2 text-sm border rounded-md"
                            >
                              <option value="">Unassigned</option>
                              {facilitators.filter(f => f.is_facilitator).map(facilitator => (
                                <option key={facilitator.id} value={facilitator.id}>
                                  {facilitator.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {match.status === 'completed' && (
                          <div className="mt-2 text-xs text-green-600 font-medium">
                            ✅ Match completed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No matches found for Week {selectedWeek}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}