import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { TeamActions } from './TeamActions';
import { TeamInfo } from './TeamInfo';
import { PaymentStatusSection } from './PaymentStatusSection';
import { Team } from '../types';

// Extended Team type for this component with additional properties
type ExtendedTeam = Team & {
    captain_name: string | null;
    league_id: number;
    league?: {
      id: number;
      name: string;
      day_of_week: number | null;
      cost: number | null;
      location: string | null;
      sports?: {
        name: string;
      } | null;
    } | null;
    payment?: {
      id: number;
      amount_due: number;
      amount_paid: number;
      status: string;
      due_date?: string;
    } | null;
};

interface TeamCardProps {
  team: ExtendedTeam;
  currentUserId: string;
  onManageTeam: (team: ExtendedTeam) => void;
  onPayNow?: (paymentId: number) => void;
  showDeleteTeamConfirmation: (team: ExtendedTeam) => void;
  showLeaveTeamConfirmation: (team: ExtendedTeam) => void;
  deletingTeam: number | null;
  unregisteringPayment: number | null;
}

export function TeamCard({ 
  team, 
  currentUserId, 
  onManageTeam, 
  onPayNow,
  showDeleteTeamConfirmation,
  showLeaveTeamConfirmation,
  deletingTeam,
  unregisteringPayment
}: TeamCardProps) {
  const isCaptain = currentUserId === team.captain_id;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
        <div>
          <Link to={`/leagues/${team.league?.id}`}>
            <h3 className="text-xl font-bold text-[#6F6F6F] hover:text-[#B20000] transition-colors mb-1">{team.league?.name || 'Unknown League'}</h3>
          </Link>
          <p className="text-base font-semibold text-[#B20000] mb-3">{team.name}</p>
          
          <TeamInfo 
            team={team} 
            isCaptain={isCaptain} 
            currentUserId={currentUserId}
          />
        </div>

        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
        </div>
      </div>
      
      {/* Location and other details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm text-[#6F6F6F]">
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-[#B20000] flex-shrink-0" />
          <span className="line-clamp-1">{team.league?.location || 'Location TBD'}</span>
        </div>
      </div>
      
      {/* Payment Status Section */}
      <PaymentStatusSection 
        payment={team.payment}
        leagueCost={team.league?.cost}
        isCaptain={isCaptain}
      />
      
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
        {/* Empty div for layout balance */}
        <div></div>
        
        {/* Action Buttons */}
        <TeamActions
          team={team}
          isCaptain={isCaptain}
          onManageTeam={onManageTeam}
          onPayNow={team.payment ? 
            () => onPayNow && onPayNow(team.payment!.id) : 
            undefined}
          showDeleteTeamConfirmation={showDeleteTeamConfirmation}
          showLeaveTeamConfirmation={showLeaveTeamConfirmation}
          deletingTeam={deletingTeam}
          unregisteringPayment={unregisteringPayment}
        />
      </div>
    </div>
  );
}