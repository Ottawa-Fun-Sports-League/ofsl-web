import { Crown, Users, Calendar, DollarSign } from 'lucide-react';
import { getDayName } from '../../../../../lib/leagues';
import { StatusBadge } from './StatusBadge';

interface TeamInfoProps {
  team: {
    captain_id: string;
    captain_name: string | null;
    roster: string[];
    league?: {
      day_of_week: number | null;
      cost: number | null;
      sports?: {
        name: string;
      } | null;
    } | null;
    payment?: {
      amount_paid: number;
      amount_due: number;
      status: string;
    };
  };
  isCaptain: boolean;
  currentUserId: string;
}

export function TeamInfo({ team, currentUserId }: TeamInfoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-4">
      {/* Team Size */}
      <div className="flex items-center gap-2" title="Players">
        <Users className="h-5 w-5 text-blue-500" />
        <p className="text-[#6F6F6F]">{team.roster?.length || 0} players</p>
      </div>

      {/* Captain */}
      <div className="flex items-center gap-2" title="Captain">
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
          <Crown className="h-4 w-4" />
          <span>Captain</span>
        </div>
        <p className="text-[#6F6F6F]">{team.captain_id === currentUserId ? 'You' : (team.captain_name || 'Unknown')}</p>
      </div>

      {/* Day */}
      <div className="flex items-center gap-2" title="Day">
        <Calendar className="h-5 w-5 text-green-500" />
        <p className="text-[#6F6F6F]">{getDayName(team.league?.day_of_week ?? null) || 'Day TBD'}</p>
      </div>

      {/* Payment Info */}
      <div className="flex items-center gap-2" title="Payment">
        <DollarSign className="h-5 w-5 text-purple-500" />
        {team.payment ? (
          <div className="flex items-center gap-2">
            <p className="text-[#6F6F6F]">
              ${team.payment.amount_paid.toFixed(2)} / ${(team.payment.amount_due * 1.13).toFixed(2)}
            </p>
            <StatusBadge status={team.payment.status} />
          </div>
        ) : (
          <p className="text-[#6F6F6F]">
            ${team.league?.cost ? (parseFloat(team.league.cost.toString()) * 1.13).toFixed(2) : '0.00'}
          </p>
        )}
      </div>
    </div>
  );
}