import { Edit, ArrowRightLeft } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface Team {
  id: number;
  name: string;
  captain_id: string;
  captain_name: string;
  captain_email: string;
  league_id: number;
  league_name: string;
  roster_count: number;
  created_at: string;
  active: boolean;
  skill_level_id?: number | null;
  skill_level_name?: string | null;
}

interface ManageTeamsTableViewProps {
  teams: Team[];
  onEditTeam: (team: Team) => void;
  onTransferTeam?: (team: Team) => void;
}

export function ManageTeamsTableView({ teams, onEditTeam, onTransferTeam }: ManageTeamsTableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left p-4 font-semibold text-[#6F6F6F] text-sm">Team Name</th>
            <th className="text-left p-4 font-semibold text-[#6F6F6F] text-sm">Captain</th>
            <th className="text-left p-4 font-semibold text-[#6F6F6F] text-sm">Email</th>
            <th className="text-left p-4 font-semibold text-[#6F6F6F] text-sm">League</th>
            <th className="text-left p-4 font-semibold text-[#6F6F6F] text-sm">Skill Level</th>
            <th className="text-center p-4 font-semibold text-[#6F6F6F] text-sm">Players</th>
            <th className="text-center p-4 font-semibold text-[#6F6F6F] text-sm">Status</th>
            <th className="text-center p-4 font-semibold text-[#6F6F6F] text-sm">Registered</th>
            <th className="text-right p-4 font-semibold text-[#6F6F6F] text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className={`border-b border-gray-200 hover:bg-gray-50 ${!team.active ? 'opacity-60' : ''}`}>
              <td className="p-4">
                <span className="font-medium text-[#6F6F6F]">{team.name}</span>
              </td>
              <td className="p-4 text-sm text-[#6F6F6F]">
                {team.captain_name}
              </td>
              <td className="p-4 text-sm text-[#6F6F6F]">
                {team.captain_email}
              </td>
              <td className="p-4 text-sm text-[#6F6F6F]">
                {team.league_name}
              </td>
              <td className="p-4">
                {team.skill_level_name ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {team.skill_level_name}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="p-4 text-center text-sm text-[#6F6F6F]">
                {team.roster_count}
              </td>
              <td className="p-4 text-center">
                <span
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
                    team.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {team.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="p-4 text-center text-xs text-gray-500">
                {new Date(team.created_at).toLocaleDateString()}
              </td>
              <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                  {onTransferTeam && (
                    <Button
                      onClick={() => onTransferTeam(team)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1 text-xs hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900"
                      title="Transfer to different league"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span className="hidden lg:inline">Transfer</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => onEditTeam(team)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 text-xs hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900"
                  >
                    <Edit className="h-3 w-3" />
                    <span className="hidden lg:inline">Edit</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}