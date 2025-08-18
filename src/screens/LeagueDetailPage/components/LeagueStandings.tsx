import { useState, useEffect } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { getLeagueStandings } from "../../../lib/volleyball";
import type { TierStandings } from "../../../types/volleyball";

interface LeagueStandingsProps {
  leagueId: number;
}

export function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const [tiers, setTiers] = useState<TierStandings[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        const response = await getLeagueStandings(leagueId);
        setTiers(response.tiers);
        setCurrentWeek(response.current_week);
        setTotalTeams(response.total_teams);
        setLastUpdated(response.last_updated);
        setError(null);
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load standings');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [leagueId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
          League Standings
        </h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
          League Standings
        </h2>
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Error loading standings: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalTeams === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F] mb-6">
          League Standings
        </h2>
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-2">
              No Standings Available
            </h3>
            <p className="text-[#6F6F6F]">
              Standings will be calculated once matches are played and scores are entered.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#6F6F6F]">
          League Standings
        </h2>
        <div className="text-sm text-[#6F6F6F]">
          Week {currentWeek} • {totalTeams} teams
          {lastUpdated && (
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Standings by tier */}
      <div className="space-y-6">
        {tiers.map((tier) => (
          <div key={tier.tier_number} className="">
            <h3 className="text-lg font-semibold text-[#6F6F6F] mb-3">
              Tier {tier.tier_number}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({tier.teams.length} teams)
              </span>
            </h3>
            
            <Card className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-hidden">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "32%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                    </colgroup>
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-[#6F6F6F] rounded-tl-lg">
                          Rank
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-[#6F6F6F]">
                          Team
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-[#6F6F6F]">
                          Captain
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-[#6F6F6F]">
                          Wins
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-[#6F6F6F]">
                          Losses
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-[#6F6F6F]">
                          Points
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-[#6F6F6F] rounded-tr-lg">
                          +/-
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tier.teams.map((standing, index) => {
                        const isLast = index === tier.teams.length - 1;
                        const tierMovement = standing.tier_movement;
                        return (
                          <tr
                            key={standing.id}
                            className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                              isLast ? "last-row" : ""
                            }`}
                          >
                            <td
                              className={`px-2 py-3 text-sm font-medium text-[#6F6F6F] text-center ${
                                isLast ? "rounded-bl-lg" : ""
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                {standing.tier_rank}
                                {tierMovement !== 0 && (
                                  <span className={`ml-1 text-xs ${
                                    tierMovement > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {tierMovement > 0 ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold text-[#6F6F6F]">
                              {standing.team?.name || 'Unknown Team'}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#6F6F6F]">
                              {standing.team?.captain?.name || (
                                <span className="text-gray-400 italic">(hidden)</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-sm text-[#6F6F6F] text-center">
                              {standing.matches_won}
                            </td>
                            <td className="px-2 py-3 text-sm text-[#6F6F6F] text-center">
                              {standing.matches_lost}
                            </td>
                            <td className="px-2 py-3 text-sm text-[#6F6F6F] text-center">
                              {standing.points_for}
                            </td>
                            <td
                              className={`px-2 py-3 text-sm text-center ${
                                standing.point_differential >= 0 ? 'text-green-600' : 'text-red-600'
                              } ${
                                isLast ? "rounded-br-lg" : ""
                              }`}
                            >
                              {standing.point_differential >= 0 ? '+' : ''}{standing.point_differential}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}