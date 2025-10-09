import { ReactNode } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { LocationPopover } from "../ui/LocationPopover";
import {
  LeagueWithTeamCount,
  formatLeagueDates,
  getDayName,
  getGymNamesByLocation,
  getPrimaryLocation,
  getEffectiveLeagueCost,
  isEarlyBirdActive,
  isLeagueDraftForPublic,
  hasPublishDatePassed,
} from "../../lib/leagues";
import { getSportIcon } from "../../screens/LeagueDetailPage/utils/leagueUtils";

export const getLeagueUnitLabel = (league: { team_registration?: boolean | null }) =>
  league.team_registration === false ? "per player" : "per team";

interface LeagueCardProps {
  league: LeagueWithTeamCount;
  footer?: ReactNode;
  showEarlyBirdNotice?: boolean;
  className?: string;
  footerClassName?: string;
  adminView?: boolean;
}

export function LeagueCard({
  league,
  footer,
  showEarlyBirdNotice = false,
  className = "",
  footerClassName = "",
  adminView = false,
}: LeagueCardProps) {
  const dayLabel =
    league.day_of_week === null || league.day_of_week === undefined
      ? "TBD"
      : getDayName(league.day_of_week) || "TBD";

  const primaryLocations = getPrimaryLocation(league.gyms || []);
  const hasLocations = primaryLocations.length > 0;

  const perUnitLabel = getLeagueUnitLabel(league);
  const effectiveCost = getEffectiveLeagueCost(league);
  const priceLabel =
    effectiveCost !== null
      ? `$${effectiveCost} + HST ${perUnitLabel}`
      : `Pricing TBD (${perUnitLabel})`;

  const sportIcon = getSportIcon(league.sport_name);
  const earlyBirdActive = showEarlyBirdNotice && isEarlyBirdActive(league);
  const publishDate = league.publish_date ? new Date(league.publish_date) : null;
  const hasValidPublishDate = publishDate !== null && !Number.isNaN(publishDate.getTime());
  const isDraftHidden = isLeagueDraftForPublic(league);
  const isScheduledPublish = hasValidPublishDate && !hasPublishDatePassed(league.publish_date);
  const adminStatusLabel = (() => {
    if (!adminView) return null;
    if (isDraftHidden && isScheduledPublish && publishDate) {
      return `Publishes ${publishDate.toLocaleString("en-CA", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
    if (isDraftHidden) {
      return "draft";
    }
    return null;
  })();

  return (
    <Card
      className={`overflow-hidden rounded-lg border border-gray-200 flex flex-col h-full ${className}`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        <div className="bg-[#F8F8F8] border-b border-gray-200 p-4 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-[#6F6F6F] line-clamp-2">{league.name}</h3>
            {adminStatusLabel ? (
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className="text-xs font-semibold text-[#B20000] bg-[#FFE5E5] border border-[#FFC5C5]"
                >
                  {adminStatusLabel}
                </Badge>
              </div>
            ) : null}
          </div>
          {sportIcon ? (
            <img
              src={sportIcon}
              alt={`${league.sport_name ?? ""} icon`}
              className="w-8 h-8 object-contain ml-2"
            />
          ) : null}
        </div>

        <div className="p-4 flex-grow flex flex-col space-y-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm font-medium text-[#6F6F6F]">
              <svg
                className="h-4 w-4 text-[#B20000] mr-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
              </svg>
              {dayLabel}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm font-medium text-[#6F6F6F]">
              <svg
                className="h-4 w-4 text-[#B20000] mr-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z" />
              </svg>
              {formatLeagueDates(league.start_date, league.end_date, league.hide_day || undefined)}
            </div>
          </div>

          <div className="flex items-center flex-wrap">
            <svg
              className="h-4 w-4 text-[#B20000] mr-1.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13C19,5.13 15.87,2 12,2zM7,9c0,-2.76 2.24,-5 5,-5s5,2.24 5,5c0,2.88 -2.88,7.19 -5,9.88C9.92,16.21 7,11.85 7,9z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <p className="text-sm font-medium text-[#6F6F6F] mr-2">Location:</p>
            <div className="flex flex-wrap gap-1">
              {hasLocations ? (
                primaryLocations.map((location, index) => (
                  <LocationPopover
                    key={`${location}-${index}`}
                    locations={getGymNamesByLocation(league.gyms || [], location)}
                  >
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                      {location}
                    </span>
                  </LocationPopover>
                ))
              ) : (
                <span className="text-sm text-gray-500">TBD</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm font-medium text-[#6F6F6F]">
              <svg
                className="h-4 w-4 text-[#B20000] mr-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
              </svg>
              {priceLabel}
            </div>
            {earlyBirdActive && league.early_bird_due_date && (
              <p className="text-xs text-green-700">
                Early bird until{" "}
                {new Date(`${league.early_bird_due_date}T00:00:00`).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {footer ? (
          <div className={`mt-auto p-4 pt-4 border-t border-gray-200 ${footerClassName}`}>
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export const getLeagueSpotsBadgeColor = (spots: number) => {
  if (spots === 0) return "bg-red-100 text-red-800";
  if (spots <= 3) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
};

export const getLeagueSpotsText = (spots: number) => {
  if (spots === 0) return "Full";
  if (spots === 1) return "1 spot left";
  return `${spots} spots left`;
};
