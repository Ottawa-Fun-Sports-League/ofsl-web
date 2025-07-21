import { Card, CardContent } from '../../../components/ui/card';
import { useLeagueStandings } from '../hooks/useLeagueStandings';

interface LeagueStandingsProps {
  leagueId: string | undefined;
}

export function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const { teams, loading, error } = useLeagueStandings(leagueId);
  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Standings</h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Standings</h2>
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Error loading standings: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Standings</h2>
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-2">No Teams Registered</h3>
            <p className="text-[#6F6F6F]">This league doesn't have any registered teams yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">League Standings</h2>
      
      {/* Note about standings */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Game records and standings will be available once league play begins. 
          Below shows the current registered teams.
        </p>
      </div>
      
      {/* Standings table */}
      <Card className="shadow-md overflow-hidden rounded-lg">
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F] rounded-tl-lg">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#6F6F6F]">Captain</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">Wins</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F]">Losses</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#6F6F6F] rounded-tr-lg">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teams.map((team, index) => (
                  <tr 
                    key={team.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      index === teams.length - 1 ? 'last-row' : ''
                    }`}
                  >
                    <td className={`px-4 py-3 text-sm font-medium text-[#6F6F6F] ${
                      index === teams.length - 1 ? 'rounded-bl-lg' : ''
                    }`}>{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">{team.name}</td>
                    <td className="px-4 py-3 text-sm text-[#6F6F6F]">{team.captain_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">-</td>
                    <td className="px-4 py-3 text-sm text-[#6F6F6F] text-center">-</td>
                    <td className={`px-4 py-3 text-sm text-[#6F6F6F] text-center ${
                      index === teams.length - 1 ? 'rounded-br-lg' : ''
                    }`}>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

