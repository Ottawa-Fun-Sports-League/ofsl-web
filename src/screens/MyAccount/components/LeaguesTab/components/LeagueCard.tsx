import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Edit2, Trash2, Copy, Users, Calendar, Trophy } from "lucide-react";
import { LeagueWithTeamCount } from "../types";
import {
  getDayName,
  formatLeagueDates,
  getGymNamesByLocation,
  getPrimaryLocation,
} from "../../../../../lib/leagues";
import { LocationPopover } from "../../../../../components/ui/LocationPopover";

interface LeagueCardProps {
  league: LeagueWithTeamCount;
  onDelete: (leagueId: number) => Promise<void>;
  onCopy: (league: LeagueWithTeamCount) => void;
  onManageSchedule?: (leagueId: number) => void;
}

export function LeagueCard({ league, onDelete, onCopy, onManageSchedule }: LeagueCardProps) {
  const navigate = useNavigate();

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

  return (
    <Card className="overflow-hidden rounded-lg border border-gray-200 flex flex-col h-full">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Card Header */}
        <div className="bg-[#F8F8F8] border-b border-gray-200 p-4 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-[#6F6F6F] line-clamp-2">
              {league.name}
            </h3>
          </div>
          <img
            src={getSportIcon(league.sport_name)}
            alt={`${league.sport_name} icon`}
            className="w-8 h-8 object-contain ml-2"
          />
        </div>

        {/* Card Body */}
        <div className="p-4 flex-grow flex flex-col space-y-4">
          {/* Day & Time */}
          <div className="space-y-1">
            <div className="flex items-center">
              <svg
                className="h-4 w-4 text-[#B20000] mr-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
              </svg>
              <p className="text-sm font-medium text-[#6F6F6F]">
                {getDayName(league.day_of_week)}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-1">
            <div className="flex items-center">
              <svg
                className="h-4 w-4 text-[#B20000] mr-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z" />
              </svg>
              <p className="text-sm font-medium text-[#6F6F6F]">
                {formatLeagueDates(
                  league.start_date,
                  league.end_date,
                  league.hide_day || undefined,
                )}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center flex-wrap">
            <svg
              className="h-4 w-4 text-[#B20000] mr-1.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13C19,5.13 15.87,2 12,2zM7,9c0,-2.76 2.24,-5 5,-5s5,2.24 5,5c0,2.88 -2.88,7.19 -5,9.88C9.92,16.21 7,11.85 7,9z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <p className="text-sm font-medium text-[#6F6F6F] mr-2">Location:</p>
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
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-center">
              <svg
                className="h-4 w-4 text-[#B20000] mr-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
              </svg>
              <p className="text-sm font-medium text-[#6F6F6F]">
                ${league.cost} + HST{" "}
                {league.sport_name === "Volleyball" ? "per team" : "per player"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 text-[#B20000] mr-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
            </svg>
            <span
              className={`text-xs font-medium py-0.5 px-2 rounded-full ${getSpotsBadgeColor(league.spots_remaining)}`}
            >
              {getSpotsText(league.spots_remaining)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/leagues/${league.id}/teams`)}
              className="h-8 w-8 p-0 hover:bg-blue-100 relative"
              title={league.team_registration === false ? "View registered users" : "View registered teams"}
            >
              <Users className="h-4 w-4 text-blue-600" />
              {league.team_count > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {league.team_count}
                </span>
              )}
            </Button>

            {/* Schedule Management Button (Volleyball only) */}
            {league.has_schedule && league.sport_name === 'Volleyball' && onManageSchedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManageSchedule?.(league.id)}
                className="h-8 w-8 p-0 hover:bg-green-100 relative"
                title="Manage schedule"
              >
                <Calendar className="h-4 w-4 text-green-600" />
              </Button>
            )}

            {/* Standings Management Button (Volleyball only - only show if schedule exists) */}
            {league.has_standings && league.has_schedule && league.sport_name === 'Volleyball' && (
              <Link to={`/leagues/${league.id}/standings`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-yellow-100 relative"
                  title="Manage standings"
                >
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </Button>
              </Link>
            )}

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
        </div>
      </CardContent>
    </Card>
  );
}
