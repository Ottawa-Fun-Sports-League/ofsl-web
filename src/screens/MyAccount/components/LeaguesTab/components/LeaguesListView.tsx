import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Button } from "../../../../../components/ui/button";
import { Edit2, Trash2, Copy, Users, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { LeagueWithTeamCount } from "../types";
import {
  getDayName,
  formatLeagueDates,
  getGymNamesByLocation,
  getPrimaryLocation,
} from "../../../../../lib/leagues";
import { LocationPopover } from "../../../../../components/ui/LocationPopover";

type SortField = 'name' | 'start_date' | 'spots_remaining' | null;
type SortDirection = 'asc' | 'desc';

interface LeaguesListViewProps {
  leagues: LeagueWithTeamCount[];
  onDelete: (leagueId: number) => Promise<void>;
  onCopy: (league: LeagueWithTeamCount) => void;
}

export function LeaguesListView({ leagues, onDelete, onCopy }: LeaguesListViewProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const getSportIcon = (sport: string | null) => {
    if (!sport) return "";
    switch (sport) {
      case "Volleyball":
        return "/Volleyball.png";
      case "Badminton":
        return "/Badminton.png";
      case "Basketball":
        return "/Basketball.png";
      case "Pickleball":
        return "/pickleball.png";
      default:
        return "";
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeagues = useMemo(() => {
    if (!sortField) return leagues;

    const sorted = [...leagues].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'spots_remaining':
          aValue = a.spots_remaining;
          bValue = b.spots_remaining;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [leagues, sortField, sortDirection]);

  const getSpotsBadgeColor = (spots: number) => {
    if (spots === 0) return "bg-red-100 text-red-800";
    if (spots <= 3) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getSpotsText = (spots: number) => {
    if (spots === 0) return "Full";
    if (spots === 1) return "1 spot left";
    return `${spots} spots left`;
  };

  if (leagues.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No leagues found</h3>
        <p className="text-[#6F6F6F]">Create your first league to get started.</p>
      </div>
    );
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    
    return (
      <th 
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" data-testid="lucide-chevron-up" />
            ) : (
              <ChevronDown className="h-4 w-4" data-testid="lucide-chevron-down" />
            )
          ) : (
            <ChevronsUpDown className="h-4 w-4 text-gray-400" data-testid="lucide-chevrons-up-down" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader field="name">League</SortableHeader>
            <SortableHeader field="start_date">Schedule</SortableHeader>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <SortableHeader field="spots_remaining">Availability</SortableHeader>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teams
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedLeagues.map((league) => (
            <tr key={league.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <img
                    src={getSportIcon(league.sport_name)}
                    alt={`${league.sport_name} icon`}
                    className="w-6 h-6 object-contain mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {league.name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {getDayName(league.day_of_week)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatLeagueDates(
                    league.start_date,
                    league.end_date,
                    league.hide_day || undefined
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const gymLocations = getPrimaryLocation(league.gyms || []);
                    
                    if (gymLocations.length === 0) {
                      return <span className="text-sm text-gray-500">TBD</span>;
                    }
                    
                    return gymLocations.map((location, index) => (
                      <LocationPopover
                        key={index}
                        locations={getGymNamesByLocation(league.gyms || [], location)}
                      >
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                          {location}
                        </span>
                      </LocationPopover>
                    ));
                  })()}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  ${league.cost} + HST
                </div>
                <div className="text-sm text-gray-500">
                  {league.sport_name === "Volleyball" ? "per team" : "per player"}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${getSpotsBadgeColor(
                    league.spots_remaining
                  )}`}
                >
                  {getSpotsText(league.spots_remaining)}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/leagues/${league.id}/teams`)}
                  className="h-8 w-8 p-0 hover:bg-blue-100 relative"
                >
                  <Users className="h-4 w-4 text-blue-600" />
                  {league.team_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {league.team_count}
                    </span>
                  )}
                </Button>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <Link to={`/my-account/leagues/edit/${league.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4 text-[#6F6F6F]" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy(league)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <Copy className="h-4 w-4 text-[#6F6F6F]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(league.id)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
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