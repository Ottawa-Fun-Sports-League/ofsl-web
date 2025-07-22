import { Link } from 'react-router-dom';
import { Button } from '../../../../../components/ui/button';
import { Calendar, Crown, CreditCard, Users, DollarSign, MapPin, User } from 'lucide-react';
import { getDayName } from '../../../../../lib/leagues';

interface Team {
  id: number;
  name: string;
  day_of_week: number | null;
  location: string | null;
  cost: number | null;
  gym_ids: number[] | null;
  sports?: {
    name: string;
  };
  league?: {
    id: number;
    name: string;
    day_of_week: number | null;
    location: string | null;
    cost: number | null;
    gym_ids: number[] | null;
    sports?: {
      name: string;
    };
  };
}

export default function TeamCard({ team }: { team: Team }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
          <p className="text-sm text-gray-600">{team.league?.sports?.name}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          <Crown className="h-3 w-3" />
          <span>Captain</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{getDayName(team.league?.day_of_week) || 'Day TBD'}</span>
        </div>
        <div className="flex items-center gap-1 text-[#6F6F6F]">
          <MapPin className="h-4 w-4" />
          <span>{team.league?.location || 'TBD'}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>Players</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="h-4 w-4" />
          <span>${team.league?.cost ? (team.league.cost * 1.13).toFixed(2) : 'TBD'}</span>
        </div>
      </div>
      
      <div className="mt-6 flex gap-2">
        <Link to={`/teams/${team.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </Link>
        <Button className="flex-1">
          Join Team
        </Button>
      </div>
    </div>
  );
}