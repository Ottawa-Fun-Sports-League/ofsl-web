import { LeagueCard } from './LeagueCard';
import { LeagueWithTeamCount } from '../types';

interface LeaguesListProps {
  leagues: LeagueWithTeamCount[];
  onDelete: (leagueId: number) => Promise<void>;
  onCopy: (league: LeagueWithTeamCount) => void;
}

export function LeaguesList({ leagues, onDelete, onCopy }: LeaguesListProps) {
  if (leagues.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No leagues found</h3>
        <p className="text-[#6F6F6F]">Create your first league to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {leagues.map(league => (
        <LeagueCard
          key={league.id}
          league={league}
          onDelete={onDelete}
          onCopy={onCopy}
        />
      ))}
    </div>
  );
}