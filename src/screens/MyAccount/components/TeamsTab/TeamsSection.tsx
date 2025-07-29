import { useState } from "react";
import {
  User,
  MapPin,
  Trash2,
  UserPlus,
  Users,
  Crown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { PaymentStatusBadge } from "../../../../components/ui/payment-status-badge";
import { PaymentInstructionsModal } from "./PaymentInstructionsModal";
import { Team, LeaguePayment } from "./types";
import { PaymentStatusSection } from "./components/PaymentStatusSection";
import { calculatePaymentStatus } from "../../../../components/payments/utils";

interface TeamsSectionProps {
  teams: Team[];
  currentUserId?: string;
  leaguePayments: LeaguePayment[];
  unregisteringPayment: number | null;
  leavingTeam: number | null;
  onUnregister: (paymentId: number, leagueName: string) => void;
  onLeaveTeam: (teamId: number, teamName: string) => void;
  onManageTeammates?: (teamId: number, teamName: string) => void;
}

export function TeamsSection({
  teams,
  currentUserId,
  leaguePayments,
  unregisteringPayment,
  leavingTeam,
  onUnregister,
  onLeaveTeam,
  onManageTeammates,
}: TeamsSectionProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-[#6F6F6F] mb-4">My Teams</h3>
      {teams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>You are not currently on any teams.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            // Find the corresponding league payment for this team
            const teamPayment = leaguePayments.find(
              (payment) => payment.team_id === team.id,
            );
            const isCaptain = team.captain_id === currentUserId;

            // Get the league fee - prioritize team.league.cost, then fall back to teamPayment data
            const leagueFee =
              team.league?.cost ||
              teamPayment?.league_cost ||
              teamPayment?.amount_due ||
              0;

            // Calculate correct payment status including HST
            const actualPaymentStatus = teamPayment 
              ? calculatePaymentStatus(
                  teamPayment.amount_due, 
                  teamPayment.amount_paid, 
                  teamPayment.due_date
                )
              : 'pending';


            return (
              <div
                key={team.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-[#6F6F6F] mb-2">
                        {team.name}
                      </h4>
                      <div className="mb-3">
                        {team.league?.id ? (
                          <div>
                            <Link
                              to={`/leagues/${team.league.id}`}
                              className="text-sm text-[#B20000] font-medium hover:text-[#8A0000] hover:underline transition-colors block mb-1"
                            >
                              {team.league.name}
                            </Link>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/leagues/${team.league.id}?tab=schedule`}
                                className="text-xs text-gray-600 hover:text-gray-800 hover:underline transition-colors font-medium"
                              >
                                Schedule
                              </Link>
                              <span className="text-gray-300">•</span>
                              <Link
                                to={`/leagues/${team.league.id}?tab=standings`}
                                className="text-xs text-gray-600 hover:text-gray-800 hover:underline transition-colors font-medium"
                              >
                                Standings
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#B20000] font-medium">
                            {team.league?.name || "Unknown League"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4">
                      <span
                        className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
                          team.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {team.active ? "Active" : "Inactive"}
                      </span>

                      <span
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
                          isCaptain
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {isCaptain && <Crown className="h-3 w-3" />}
                        {isCaptain ? "Captain" : "Player"}
                      </span>

                      {teamPayment && (
                        <PaymentStatusBadge 
                          status={actualPaymentStatus} 
                          size="sm"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span className="text-[#6F6F6F]">
                        Location: {team.league?.location || "TBD"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <span className="text-[#6F6F6F]">
                        Team Size: {team.roster?.length || 0} players
                      </span>
                    </div>
                  </div>
                  
                  {/* Enhanced Payment Status Section */}
                  {(teamPayment || leagueFee > 0) && (
                    <PaymentStatusSection 
                      payment={teamPayment ? {
                        id: teamPayment.id,
                        amount_due: teamPayment.amount_due,
                        amount_paid: teamPayment.amount_paid,
                        status: teamPayment.status,
                        due_date: teamPayment.due_date
                      } : undefined}
                      leagueCost={leagueFee}
                      isCaptain={isCaptain}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-3">
                  <div className="flex items-center gap-3">
                    {onManageTeammates && (
                      <Button
                        onClick={() => onManageTeammates(team.id, team.name)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 w-full sm:w-auto hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900"
                      >
                        {isCaptain ? (
                          <>
                            <UserPlus className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              Manage Teammates
                            </span>
                            <span className="sm:hidden">Manage</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              View Teammates
                            </span>
                            <span className="sm:hidden">View</span>
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Make a payment link for captains with partial or pending payments */}
                    {isCaptain && teamPayment && (actualPaymentStatus === 'partial' || actualPaymentStatus === 'pending') && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="text-sm text-[#B20000] hover:text-[#8A0000] hover:underline transition-colors font-medium"
                      >
                        Make a payment
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isCaptain ? (
                      // Show Delete Registration for captains
                      teamPayment && (
                        <Button
                          onClick={() =>
                            onUnregister(
                              teamPayment.id,
                              teamPayment.league_name,
                            )
                          }
                          disabled={unregisteringPayment === teamPayment.id}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 w-full sm:w-auto"
                        >
                          {unregisteringPayment === teamPayment.id ? (
                            "Removing..."
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                Delete Registration
                              </span>
                              <span className="sm:hidden">Delete</span>
                            </>
                          )}
                        </Button>
                      )
                    ) : (
                      // Show Leave Team for non-captains
                      <Button
                        onClick={() => onLeaveTeam(team.id, team.name)}
                        disabled={leavingTeam === team.id}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 w-full sm:w-auto"
                      >
                        {leavingTeam === team.id ? (
                          "Leaving..."
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Leave Team</span>
                            <span className="sm:hidden">Leave</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Payment Instructions Modal */}
      <PaymentInstructionsModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
}

