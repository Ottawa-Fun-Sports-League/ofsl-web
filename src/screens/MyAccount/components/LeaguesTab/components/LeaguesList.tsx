import { LeagueCard } from './LeagueCard';
import { LeagueWithTeamCount } from '../types';
import { groupLeaguesByDay, getOrderedDayNames } from '../../../../../lib/leagues';

interface LeaguesListProps {
  leagues: LeagueWithTeamCount[];
  onDelete: (leagueId: number) => Promise<void>;
  onCopy: (league: LeagueWithTeamCount) => void;
  onManageSchedule?: (leagueId: number) => void;
}

export function LeaguesList({ leagues, onDelete, onCopy, onManageSchedule }: LeaguesListProps) {

  if (leagues.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No leagues found</h3>
        <p className="text-[#6F6F6F]">Create your first league to get started.</p>
      </div>
    );
  }

  // Group leagues by day of the week
  const groupedLeagues = groupLeaguesByDay(leagues);
  const orderedDayNames = getOrderedDayNames();
  
  // Only show days that have leagues
  const activeDays = orderedDayNames.filter(dayName => 
    groupedLeagues[dayName] && groupedLeagues[dayName].length > 0
  );

  return (
    <div className="space-y-8">
      {activeDays.map(dayName => (
        <div key={dayName}>
          {/* Day Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#6F6F6F] mb-1">{dayName}</h2>
            <div className="w-12 h-0.5 bg-[#B20000] rounded"></div>
          </div>
          
          {/* League Cards for this Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedLeagues[dayName].map(league => (
              <LeagueCard
                key={league.id}
                league={league}
                onDelete={onDelete}
                onCopy={onCopy}
                onManageSchedule={onManageSchedule}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Leagues without a day specified */}
      {leagues.filter(league => league.day_of_week === null || league.day_of_week === undefined).length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#6F6F6F] mb-1">No Day Specified</h2>
            <div className="w-12 h-0.5 bg-[#B20000] rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues
              .filter(league => league.day_of_week === null || league.day_of_week === undefined)
              .map(league => (
                <LeagueCard
                  key={league.id}
                  league={league}
                  onDelete={onDelete}
                  onCopy={onCopy}
                  onManageSchedule={onManageSchedule}
                  />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}