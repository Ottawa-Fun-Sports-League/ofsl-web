import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../../../components/ui/button";
import { Edit2, Trash2, Copy, Users, Calendar, Trophy } from "lucide-react";
import { LeagueWithTeamCount } from "../types";
import {
  LeagueCard as BaseLeagueCard,
  getLeagueSpotsBadgeColor,
  getLeagueSpotsText,
} from "../../../../../components/leagues/LeagueCard";

interface LeagueCardProps {
  league: LeagueWithTeamCount;
  onDelete: (leagueId: number) => Promise<void>;
  onCopy: (league: LeagueWithTeamCount) => void;
  onManageSchedule?: (leagueId: number) => void;
}

export function LeagueCard({ league, onDelete, onCopy, onManageSchedule }: LeagueCardProps) {
  const navigate = useNavigate();

  const footer = (
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <svg
          className="h-4 w-4 text-[#B20000] mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
        </svg>
        <span
          className={`text-xs font-medium py-0.5 px-2 rounded-full ${getLeagueSpotsBadgeColor(league.spots_remaining)}`}
        >
          {getLeagueSpotsText(league.spots_remaining)}
        </span>
      </div>

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
  );

  return (
    <BaseLeagueCard league={league} footer={footer} />
  );
}
