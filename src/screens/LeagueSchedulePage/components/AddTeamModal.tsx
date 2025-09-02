import { useState, useEffect, useCallback } from "react";
import { X, Users, Check, AlertCircle, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { supabase } from "../../../lib/supabase";

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  currentWeek: number;
  tierIndex: number;
  position: string;
  onAddTeam: (teamName: string, tierIndex: number, position: string) => Promise<void>;
}

interface Team {
  id: number;
  name: string;
  captain_id: string;
  captain_name: string | null;
  skill_name: string | null;
  isScheduled?: boolean;
}

export function AddTeamModal({
  isOpen,
  onClose,
  leagueId,
  currentWeek,
  tierIndex,
  position,
  onAddTeam,
}: AddTeamModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen, leagueId, currentWeek]);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, get all registered teams for this league
      const { data: registeredTeams, error: teamsError } = await supabase
        .from("teams")
        .select(
          `
          id,
          name,
          captain_id,
          users:captain_id(name),
          skills:skill_level_id(name)
        `,
        )
        .eq("league_id", parseInt(leagueId))
        .eq("active", true)
        .order("name");

      if (teamsError) throw teamsError;

      // Then, get all teams that are already scheduled for this week
      const { data: scheduledTeams, error: scheduleError } = await supabase
        .from("weekly_schedules")
        .select("team_a_name, team_b_name, team_c_name")
        .eq("league_id", parseInt(leagueId))
        .eq("week_number", currentWeek);

      if (scheduleError) throw scheduleError;

      // Create a set of scheduled team names for quick lookup
      const scheduledTeamNames = new Set<string>();
      scheduledTeams?.forEach((schedule) => {
        if (schedule.team_a_name) scheduledTeamNames.add(schedule.team_a_name);
        if (schedule.team_b_name) scheduledTeamNames.add(schedule.team_b_name);
        if (schedule.team_c_name) scheduledTeamNames.add(schedule.team_c_name);
      });

      // Map teams and mark which ones are already scheduled
      const teamsWithStatus: Team[] = (registeredTeams || []).map((team) => ({
        id: team.id,
        name: team.name,
        captain_id: team.captain_id,
        captain_name: Array.isArray(team.users)
          ? null
          : (team.users as { name: string } | null)?.name || null,
        skill_name: Array.isArray(team.skills)
          ? null
          : (team.skills as { name: string } | null)?.name || null,
        isScheduled: scheduledTeamNames.has(team.name),
      }));

      setTeams(teamsWithStatus);
    } catch (err) {
      console.error("Error loading teams:", err);
      setError("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [leagueId, currentWeek]);

  const handleAddTeam = async (team: Team) => {
    if (team.isScheduled) return;

    setAdding(true);
    try {
      await onAddTeam(team.name, tierIndex, position);
      await loadTeams(); // Reload to update scheduled status
    } catch (err) {
      console.error("Error adding team:", err);
      setError("Failed to add team to schedule");
    } finally {
      setAdding(false);
    }
  };

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.captain_name && team.captain_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Sort teams: unscheduled first, then alphabetically
  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (a.isScheduled !== b.isScheduled) {
      return a.isScheduled ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">
              Add Team to Tier {tierIndex + 1} - Position {position}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
              <p className="mt-2 text-gray-600">Loading teams...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
              <Button onClick={loadTeams} className="mt-4" variant="outline">
                Try Again
              </Button>
            </div>
          ) : sortedTeams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No teams found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTeams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    team.isScheduled
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-white border-gray-300 hover:border-[#B20000] hover:shadow-sm transition-all"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Captain: {team.captain_name || team.captain_id}
                      {team.skill_name && <span className="ml-2">• Skill: {team.skill_name}</span>}
                    </div>
                  </div>

                  {team.isScheduled ? (
                    <div className="flex items-center text-gray-500">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-sm">Scheduled</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleAddTeam(team)}
                      disabled={adding}
                      className="bg-[#B20000] hover:bg-[#8A0000] text-white"
                      size="sm"
                    >
                      {adding ? "Adding..." : "Add"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {teams.filter((t) => !t.isScheduled).length} of {teams.length} teams available
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
