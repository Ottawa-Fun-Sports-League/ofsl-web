import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ArrowLeft, DollarSign, Save, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface League {
  id: number;
  name: string;
  sport_name: string;
  location: string;
  cost: number;
  team_registration?: boolean;
}

interface StandingRow {
  id: number;
  team_id: number;
  team_name: string;
  roster_size: number;
  wins: number;
  losses: number;
  points: number;
  point_differential: number;
  manual_wins_adjustment: number;
  manual_losses_adjustment: number;
  manual_points_adjustment: number;
  manual_differential_adjustment: number;
  created_at: string;
  schedule_ranking?: number;
}

function extractTeamRankings(scheduleData: {schedule_data?: {tiers?: Array<{teams?: Record<string, {name: string; ranking: number} | null>}>}} | null): Map<string, number> {
  const teamRankings = new Map<string, number>();
  if (scheduleData?.schedule_data?.tiers) {
    scheduleData.schedule_data.tiers.forEach((tier: {teams?: Record<string, {name: string; ranking: number} | null>}) => {
      if (tier.teams) {
        Object.values(tier.teams).forEach((team: {name: string; ranking: number} | null) => {
          if (team && team.name && team.ranking) {
            teamRankings.set(team.name, team.ranking);
          }
        });
      }
    });
  }
  return teamRankings;
}

export function LeagueStandingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const formatDiff = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [editedStandings, setEditedStandings] = useState<{ [key: string]: StandingRow }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isWeek2Completed, setIsWeek2Completed] = useState(false);

  // Check if user is admin
  const isAdmin = userProfile?.is_admin === true;

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    if (leagueId) {
      loadLeagueData();
      loadStandings();
      checkWeek2Completion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, isAdmin]);

  const loadLeagueData = async () => {
    if (!leagueId) return;

    try {
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          location,
          cost,
          team_registration,
          sports:sport_id(name)
        `)
        .eq('id', parseInt(leagueId))
        .single();

      if (error) throw error;

      setLeague({
        id: data.id,
        name: data.name,
        sport_name: data.sports && Array.isArray(data.sports) && data.sports.length > 0 
          ? data.sports[0].name 
          : (data.sports && typeof data.sports === 'object' && 'name' in data.sports 
            ? (data.sports as { name: string }).name 
            : ''),
        location: data.location || '',
        cost: data.cost || 0,
        team_registration: data.team_registration
      });
    } catch (error) {
      console.error('Error loading league data:', error);
    }
  };

  const loadStandings = async () => {
    if (!leagueId) return;
    
    setLoading(true);
    try {
      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          roster,
          created_at
        `)
        .eq('league_id', parseInt(leagueId))
        .eq('active', true);


      if (teamsError) throw teamsError;

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('league_schedules')
        .select('schedule_data')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        console.warn('Error loading schedule data:', scheduleError);
      }

      const teamRankings = extractTeamRankings(scheduleData);


      let standingsData = null;
      try {
        const { data, error: standingsError } = await supabase
          .from('standings')
          .select('*')
          .eq('league_id', parseInt(leagueId));


        if (standingsError) {
          if (standingsError.code === '42P01') {
            // Table doesn't exist - this is OK, we'll just use default values
          } else {
            console.warn('Error loading standings data:', standingsError);
          }
        } else {
          standingsData = data;
        }
      } catch (err) {
        // Could not access standings table, using defaults
      }

      const standingsMap = new Map();
      (standingsData || []).forEach(standing => {
        standingsMap.set(standing.team_id, standing);
      });

      const formattedStandings = (teamsData || []).map(team => {
        const standing = standingsMap.get(team.id);
        return {
          id: standing?.id || 0,
          team_id: team.id,
          team_name: team.name,
          roster_size: team.roster?.length || 0,
          wins: standing?.wins || 0,
          losses: standing?.losses || 0,
          points: standing?.points || 0,
          point_differential: standing?.point_differential || 0,
          manual_wins_adjustment: standing?.manual_wins_adjustment || 0,
          manual_losses_adjustment: standing?.manual_losses_adjustment || 0,
          manual_points_adjustment: standing?.manual_points_adjustment || 0,
          manual_differential_adjustment: standing?.manual_differential_adjustment || 0,
          created_at: team.created_at,
          schedule_ranking: teamRankings.get(team.name)
        };
      });


      const hasValidPositions = standingsData && standingsData.length > 0 && 
        standingsData.some(s => s.current_position && s.current_position > 0);

      const sortedStandings = hasValidPositions 
        ? formattedStandings.sort((a, b) => {
            const aStanding = standingsMap.get(a.team_id);
            const bStanding = standingsMap.get(b.team_id);
            return (aStanding?.current_position || 999) - (bStanding?.current_position || 999);
          })
        : formattedStandings.sort((a, b) => {
            if (a.schedule_ranking && b.schedule_ranking) {
              return a.schedule_ranking - b.schedule_ranking;
            }
            if (a.schedule_ranking && !b.schedule_ranking) return -1;
            if (!a.schedule_ranking && b.schedule_ranking) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });

      setStandings(sortedStandings);
      setEditedStandings({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleFieldChange = (standing: StandingRow, field: string, value: string) => {
    const numValue = value === '' || value === '-' ? 0 : parseInt(value) || 0;

    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();

    const existingEdits = editedStandings[editKey] || standing;
    const updatedStanding = {
      ...existingEdits,
      [field]: numValue
    };

    const newEditedStandings = {
      ...editedStandings,
      [editKey]: updatedStanding
    };

    setEditedStandings(newEditedStandings);
    setHasChanges(true);
  };

  const getDisplayValue = (standing: StandingRow, field: keyof StandingRow) => {
    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
    if (editedStandings[editKey]) {
      return editedStandings[editKey][field];
    }
    return standing[field];
  };

  const getTotalValue = (standing: StandingRow, baseField: string, adjustmentField: string) => {
    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
    const edited = editedStandings[editKey];
    const base = edited ? edited[baseField as keyof StandingRow] as number : standing[baseField as keyof StandingRow] as number;
    const adjustment = edited ? edited[adjustmentField as keyof StandingRow] as number : standing[adjustmentField as keyof StandingRow] as number;
    
    return (base || 0) + (adjustment || 0);
  };

  const checkWeek2Completion = async () => {
    if (!leagueId) return;

    try {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('is_completed')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', 2);

      if (error) {
        console.warn('Error checking week 2 completion:', error);
        return;
      }

      const week2Completed = data && data.length > 0 && data.some(tier => tier.is_completed);
      setIsWeek2Completed(week2Completed);
    } catch (error) {
      console.warn('Error checking week 2 completion:', error);
    }
  };

  const handleEnterEditMode = () => setIsEditMode(true);
  
  const handleExitEditMode = () => {
    setIsEditMode(false);
    setEditedStandings({});
    setHasChanges(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [editKey, standing] of Object.entries(editedStandings)) {
        try {
          if (editKey.startsWith('team_')) {
            const { error } = await supabase
              .from('standings')
              .insert({
                league_id: parseInt(leagueId!),
                team_id: standing.team_id,
                wins: standing.wins,
                losses: standing.losses,
                points: standing.points,
                point_differential: standing.point_differential,
                manual_wins_adjustment: standing.manual_wins_adjustment,
                manual_losses_adjustment: standing.manual_losses_adjustment,
                manual_points_adjustment: standing.manual_points_adjustment,
                manual_differential_adjustment: standing.manual_differential_adjustment,
              });

            if (error) {
              if (error.code === '42P01') {
                alert('Standings table does not exist. Please apply the database migration first.');
                return;
              }
              throw error;
            }
          } else {
            const standingId = parseInt(editKey);
            const { error } = await supabase
              .from('standings')
              .update({
                wins: standing.wins,
                losses: standing.losses,
                points: standing.points,
                point_differential: standing.point_differential,
                manual_wins_adjustment: standing.manual_wins_adjustment,
                manual_losses_adjustment: standing.manual_losses_adjustment,
                manual_points_adjustment: standing.manual_points_adjustment,
                manual_differential_adjustment: standing.manual_differential_adjustment,
              })
              .eq('id', standingId);

            if (error) throw error;
          }
        } catch (err) {
          console.error('Error saving individual standing:', err);
          throw err;
        }
      }

      const { data: currentStandings } = await supabase
        .from('standings')
        .select('id, team_id, current_position, teams!inner(name)')
        .eq('league_id', parseInt(leagueId!));

      const needsInitialPositions = currentStandings && 
        currentStandings.some(s => !s.current_position || s.current_position <= 0);

      if (needsInitialPositions) {
        
        const { data: scheduleData } = await supabase
          .from('league_schedules')
          .select('schedule_data')
          .eq('league_id', parseInt(leagueId!))
          .maybeSingle();

        const teamRankings = extractTeamRankings(scheduleData);

        for (const standing of currentStandings) {
          const teamName = (standing as any).teams.name;
          const initialPosition = teamRankings.get(teamName) || 999;
          
          if (!standing.current_position || standing.current_position <= 0) {
            await supabase
              .from('standings')
              .update({ current_position: initialPosition })
              .eq('id', standing.id);
          }
        }
      }

      const { error: recalcError } = await supabase.rpc('recalculate_standings_positions', {
        p_league_id: parseInt(leagueId!)
      });

      if (recalcError) {
        console.error('Error recalculating positions:', recalcError);
        alert('Standings saved but positions could not be recalculated. Please refresh the page.');
      }

      await loadStandings();
      
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving standings:', error);
      alert('Failed to save standings adjustments');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', parseInt(leagueId!))
        .eq('active', true);

      if (teamsError) throw teamsError;

      if (!teamsData || teamsData.length === 0) {
        alert('No teams found for this league');
        return;
      }

      for (const team of teamsData) {
        const { error: upsertError } = await supabase
          .from('standings')
          .upsert({
            league_id: parseInt(leagueId!),
            team_id: team.id,
            wins: 0,
            losses: 0,
            points: 0,
            point_differential: 0,
            manual_wins_adjustment: 0,
            manual_losses_adjustment: 0,
            manual_points_adjustment: 0,
            manual_differential_adjustment: 0
          }, {
            onConflict: 'league_id,team_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error upserting standings for team:', team.name, upsertError);
          throw upsertError;
        }
      }

      
      await loadStandings();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing standings data:', error);
      alert('Failed to clear standings data: ' + (error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-[#B20000] hover:underline mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[#6F6F6F] mb-2">
                  {league?.name} - Standings Management
                </h1>
                <p className="text-[#6F6F6F] mb-2">
                  Sport: {league?.sport_name} | Location: {league?.location}
                </p>
                {league?.cost && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-[#B20000] mr-1.5" />
                    <p className="text-sm font-medium text-[#6F6F6F]">
                      ${league.cost} + HST {league?.sport_name === "Volleyball" ? "per team" : "per player"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Navigation Links */}
            {isAdmin && league?.id && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <Link
                  to={`/my-account/leagues/edit/${league.id}`}
                  className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                >
                  Edit league
                </Link>
                <span className="text-gray-400 text-sm">|</span>
                <Link
                  to={`/leagues/${league.id}/teams`}
                  className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                >
                  Manage teams
                </Link>
                {league?.sport_name === 'Volleyball' && (
                  <>
                    <span className="text-gray-400 text-sm">|</span>
                    <Link
                      to={`/leagues/${league.id}/schedule`}
                      className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                    >
                      Manage schedule
                    </Link>
                  </>
                )}
                <span className="text-gray-400 text-sm">|</span>
                <span className="text-gray-400 text-sm whitespace-nowrap cursor-default">
                  Manage standings
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {!isEditMode ? (
              <Button
                onClick={handleEnterEditMode}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Standings
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={handleExitEditMode}
                  variant="outline"
                  className="flex items-center gap-2 ml-2"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
          
          {!isEditMode && (
            <Button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing || isWeek2Completed}
              variant="outline"
              className={`flex items-center gap-2 ${
                isWeek2Completed 
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                  : 'border-red-300 text-red-600 hover:bg-red-50'
              }`}
              title={isWeek2Completed ? 'Clear Data is only available during seeding rounds (before week 2 completion)' : 'Reset all standings data to zero'}
            >
              <Trash2 className="h-4 w-4" />
              {clearing ? 'Clearing...' : 'Clear Data'}
            </Button>
          )}
        </div>

        <Card className="shadow-md overflow-hidden rounded-lg">
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-hidden">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">
                      Team
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">
                      Wins
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">
                      Losses
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] bg-red-50">
                      Points
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] rounded-tr-lg">
                      +/-
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {standings.map((standing, index) => {
                    const totalWins = getTotalValue(standing, 'wins', 'manual_wins_adjustment');
                    const totalLosses = getTotalValue(standing, 'losses', 'manual_losses_adjustment');
                    const totalPoints = getTotalValue(standing, 'points', 'manual_points_adjustment');
                    const totalDifferential = getTotalValue(standing, 'point_differential', 'manual_differential_adjustment');
                    const editKey = standing.id === 0 ? `team_${standing.team_id}` : standing.id.toString();
                    const isEdited = !!editedStandings[editKey];

                    return (
                      <tr
                        key={standing.id === 0 ? `team_${standing.team_id}` : standing.id}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                          index === standings.length - 1 ? "last-row" : ""
                        } ${isEdited ? "ring-2 ring-yellow-400 ring-opacity-50" : ""}`}
                      >
                        <td
                          className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${
                            index === standings.length - 1 ? "rounded-bl-lg" : ""
                          }`}
                        >
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">
                          {standing.team_name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={totalWins}
                              onChange={(e) => {
                                const newTotal = parseInt(e.target.value) || 0;
                                const base = getDisplayValue(standing, 'wins') as number;
                                const adjustment = newTotal - base;
                                handleFieldChange(standing, 'manual_wins_adjustment', adjustment.toString());
                              }}
                              className="w-16 h-8 text-center text-sm mx-auto"
                              min="0"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[#6F6F6F]">{totalWins}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={totalLosses}
                              onChange={(e) => {
                                const newTotal = parseInt(e.target.value) || 0;
                                const base = getDisplayValue(standing, 'losses') as number;
                                const adjustment = newTotal - base;
                                handleFieldChange(standing, 'manual_losses_adjustment', adjustment.toString());
                              }}
                              className="w-16 h-8 text-center text-sm mx-auto"
                              min="0"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[#6F6F6F]">{totalLosses}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center bg-red-50">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={totalPoints}
                              onChange={(e) => {
                                const newTotal = parseInt(e.target.value) || 0;
                                const base = getDisplayValue(standing, 'points') as number;
                                const adjustment = newTotal - base;
                                handleFieldChange(standing, 'manual_points_adjustment', adjustment.toString());
                              }}
                              className="w-16 h-8 text-center text-sm mx-auto"
                              min="0"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[#6F6F6F]">{totalPoints}</span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-center ${
                            index === standings.length - 1 ? "rounded-br-lg" : ""
                          }`}
                        >
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={totalDifferential}
                              onChange={(e) => {
                                const newTotal = parseInt(e.target.value) || 0;
                                const base = getDisplayValue(standing, 'point_differential') as number;
                                const adjustment = newTotal - base;
                                handleFieldChange(standing, 'manual_differential_adjustment', adjustment.toString());
                              }}
                              className="w-16 h-8 text-center text-sm mx-auto"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[#6F6F6F]">{formatDiff(totalDifferential)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <Trash2 className="h-6 w-6 text-red-600 mr-3" />
                  <h2 className="text-xl font-bold text-[#6F6F6F]">Clear Standings Data</h2>
                </div>
                <p className="text-[#6F6F6F] mb-6">
                  This will reset all wins, losses, points, and point differentials to zero for all teams in this league. 
                  Team positions and manual adjustments will be preserved.
                </p>
                {isWeek2Completed ? (
                  <p className="text-sm text-red-600 mb-6">
                    <strong>Season Active:</strong> Clear Data is only available during seeding rounds (before week 2 completion).
                  </p>
                ) : (
                  <p className="text-sm text-red-600 mb-6">
                    <strong>Warning:</strong> This action cannot be undone.
                  </p>
                )}
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => setShowClearConfirm(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleClearData}
                    disabled={clearing || isWeek2Completed}
                    className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {clearing ? 'Clearing...' : 'Clear Data'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
