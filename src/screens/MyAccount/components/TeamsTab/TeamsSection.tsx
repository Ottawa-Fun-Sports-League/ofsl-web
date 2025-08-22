import { useState } from "react";
import { User, MapPin, Trash2, UserPlus, Users, Crown, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { PaymentStatusBadge } from "../../../../components/ui/payment-status-badge";
import { PaymentInstructionsModal } from "./PaymentInstructionsModal";
import { Team, LeaguePayment } from "./types";
import { PaymentStatusSection } from "./components/PaymentStatusSection";
import { LocationPopover } from "../../../../components/ui/LocationPopover";
import { SkillLevelEditModal } from "./SkillLevelEditModal";
import {
  getPrimaryLocation,
  getGymNamesByLocation,
} from "../../../../lib/leagues";

interface IndividualLeague {
  id: number;
  name: string;
  location?: string;
  cost?: number;
  sports?: {
    name: string;
  };
  start_date?: string;
  gym_ids?: number[];
  gyms?: Array<{
    id?: number;
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>;
}

interface TeamsSectionProps {
  teams: Team[];
  individualLeagues?: IndividualLeague[];
  currentUserId?: string;
  leaguePayments: LeaguePayment[];
  unregisteringPayment: number | null;
  leavingTeam: number | null;
  onUnregister: (paymentId: number, leagueName: string) => void;
  onLeaveTeam: (teamId: number, teamName: string) => void;
  onManageTeammates?: (teamId: number, teamName: string) => void;
  onLeaveIndividualLeague?: (leagueId: number, leagueName: string) => void;
  onSkillLevelUpdate?: () => void;
}

export function TeamsSection({
  teams,
  individualLeagues = [],
  currentUserId,
  leaguePayments,
  unregisteringPayment,
  leavingTeam,
  onUnregister,
  onLeaveTeam,
  onManageTeammates,
  onLeaveIndividualLeague,
  onSkillLevelUpdate,
}: TeamsSectionProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editSkillModal, setEditSkillModal] = useState<{
    isOpen: boolean;
    currentSkillId: number | null;
    isTeamRegistration: boolean;
    teamId?: number;
    paymentId?: number;
    teamName: string;
  }>({
    isOpen: false,
    currentSkillId: null,
    isTeamRegistration: true,
    teamName: "",
  });

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-[#6F6F6F] mb-4">My Leagues</h3>
      {teams.length === 0 && individualLeagues.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>You are not currently registered for any leagues.</p>
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

                      {team.skill?.name ? (
                        <button
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                          onClick={() => {
                            setEditSkillModal({
                              isOpen: true,
                              currentSkillId: team.skill?.id || null,
                              isTeamRegistration: true,
                              teamId: team.id,
                              teamName: team.name,
                            });
                          }}
                        >
                          {team.skill.name}
                          <Edit2 className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors animate-pulse"
                          onClick={() => {
                            setEditSkillModal({
                              isOpen: true,
                              currentSkillId: null,
                              isTeamRegistration: true,
                              teamId: team.id,
                              teamName: team.name,
                            });
                          }}
                        >
                          Set Skill Level
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}

                      {teamPayment && (
                        <PaymentStatusBadge
                          status={teamPayment.status}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span className="text-[#6F6F6F]">Location:</span>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const gymLocations = getPrimaryLocation(
                            team.league?.gyms || [],
                          );

                          if (gymLocations.length === 0) {
                            return (
                              <span className="text-sm text-gray-500">TBD</span>
                            );
                          }

                          return gymLocations.map((location, index) => (
                            <LocationPopover
                              key={index}
                              locations={getGymNamesByLocation(
                                team.league?.gyms || [],
                                location,
                              )}
                            >
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                                {location}
                              </span>
                            </LocationPopover>
                          ));
                        })()}
                      </div>
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
                      payment={
                        teamPayment
                          ? {
                              id: teamPayment.id,
                              amount_due: teamPayment.amount_due,
                              amount_paid: teamPayment.amount_paid,
                              status: teamPayment.status,
                              due_date: teamPayment.due_date,
                            }
                          : undefined
                      }
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
                    {isCaptain &&
                      teamPayment &&
                      (teamPayment.status === "partial" ||
                        teamPayment.status === "pending") && (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="text-sm text-[#B20000] hover:text-[#8A0000] hover:underline transition-colors font-medium"
                        >
                          Make a payment
                        </button>
                      )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      // Check if season has started
                      const seasonStarted =
                        team.league?.start_date &&
                        new Date(team.league.start_date) <= new Date();

                      if (seasonStarted && isCaptain) {
                        return (
                          <span className="text-sm text-gray-500 italic">
                            Cannot delete after season starts
                          </span>
                        );
                      }

                      if (isCaptain) {
                        // Show Delete Registration for captains
                        return teamPayment ? (
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
                                  Cancel Registration
                                </span>
                                <span className="sm:hidden">Cancel</span>
                              </>
                            )}
                          </Button>
                        ) : null;
                      }

                      return (
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
                              <span className="hidden sm:inline">
                                Leave Team
                              </span>
                              <span className="sm:hidden">Leave</span>
                            </>
                          )}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Individual League Registrations */}
          {individualLeagues.map((league) => {
            // Find the corresponding payment for this individual league
            const leaguePayment = leaguePayments.find(
              (payment) => payment.league_id === league.id && !payment.team_id,
            );

            const leagueFee = league.cost || leaguePayment?.amount_due || 0;

            return (
              <div
                key={`league-${league.id}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-[#6F6F6F] mb-2">
                        {league.name}
                      </h4>
                      <div className="mb-3">
                        {league.id ? (
                          <div>
                            <Link
                              to={`/leagues/${league.id}`}
                              className="text-sm text-[#B20000] font-medium hover:text-[#8A0000] hover:underline transition-colors block mb-1"
                            >
                              View League Details
                            </Link>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/leagues/${league.id}?tab=schedule`}
                                className="text-xs text-gray-600 hover:text-gray-800 hover:underline transition-colors font-medium"
                              >
                                Schedule
                              </Link>
                              <span className="text-gray-300">•</span>
                              <Link
                                to={`/leagues/${league.id}?tab=standings`}
                                className="text-xs text-gray-600 hover:text-gray-800 hover:underline transition-colors font-medium"
                              >
                                Standings
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#B20000] font-medium">
                            {league.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4">
                      <span className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium ${
                        league.is_waitlisted 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {league.is_waitlisted ? 'Waitlisted' : 'Active'}
                      </span>

                      <span className="bg-purple-100 text-purple-800 flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium">
                        <User className="h-3 w-3" />
                        Individual
                      </span>

                      {leaguePayment?.skill_name ? (
                        <button
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                          onClick={() => {
                            setEditSkillModal({
                              isOpen: true,
                              currentSkillId: leaguePayment.skill_level_id || null,
                              isTeamRegistration: false,
                              paymentId: leaguePayment.id,
                              teamName: league.name,
                            });
                          }}
                        >
                          {leaguePayment.skill_name}
                          <Edit2 className="h-3 w-3" />
                        </button>
                      ) : (
                        leaguePayment && (
                          <button
                            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors animate-pulse"
                            onClick={() => {
                              setEditSkillModal({
                                isOpen: true,
                                currentSkillId: null,
                                isTeamRegistration: false,
                                paymentId: leaguePayment.id,
                                teamName: league.name,
                              });
                            }}
                          >
                            Set Skill Level
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )
                      )}

                      {leaguePayment && (
                        <PaymentStatusBadge
                          status={leaguePayment.status}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span className="text-[#6F6F6F]">Location:</span>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const gymLocations = getPrimaryLocation(
                            league.gyms || [],
                          );

                          if (gymLocations.length === 0) {
                            return (
                              <span className="text-sm text-gray-500">TBD</span>
                            );
                          }

                          return gymLocations.map((location, index) => (
                            <LocationPopover
                              key={index}
                              locations={getGymNamesByLocation(
                                league.gyms || [],
                                location,
                              )}
                            >
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                                {location}
                              </span>
                            </LocationPopover>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <span className="text-[#6F6F6F]">
                        Individual Registration
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Payment Status Section */}
                  {(leaguePayment || leagueFee > 0) && (
                    <PaymentStatusSection
                      payment={
                        leaguePayment
                          ? {
                              id: leaguePayment.id,
                              amount_due: leaguePayment.amount_due,
                              amount_paid: leaguePayment.amount_paid,
                              status: leaguePayment.status,
                              due_date: leaguePayment.due_date,
                            }
                          : undefined
                      }
                      leagueCost={leagueFee}
                      isCaptain={true}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-3">
                  <div className="flex items-center gap-3">
                    {/* Make a payment link for individuals with partial or pending payments */}
                    {leaguePayment &&
                      (leaguePayment.status === "partial" ||
                        leaguePayment.status === "pending") && (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="text-sm text-[#B20000] hover:text-[#8A0000] hover:underline transition-colors font-medium"
                        >
                          Make a payment
                        </button>
                      )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      // Check if season has started
                      const seasonStarted =
                        league.start_date &&
                        new Date(league.start_date) <= new Date();

                      if (seasonStarted) {
                        return (
                          <span className="text-sm text-gray-500 italic">
                            Registration cannot be cancelled after season starts
                          </span>
                        );
                      }

                      // For individual registrations, both active and waitlisted
                      return (
                        <Button
                          onClick={() => {
                            // Always use onLeaveIndividualLeague for individual registrations
                            // The handler will take care of both league_ids and league_payments
                            onLeaveIndividualLeague?.(league.id, league.name);
                          }}
                          disabled={unregisteringPayment === leaguePayment?.id}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 w-full sm:w-auto"
                        >
                          {unregisteringPayment === leaguePayment?.id ? (
                            "Removing..."
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                Cancel Registration
                              </span>
                              <span className="sm:hidden">Cancel</span>
                            </>
                          )}
                        </Button>
                      );
                    })()}
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
      
      {/* Skill Level Edit Modal */}
      <SkillLevelEditModal
        isOpen={editSkillModal.isOpen}
        onClose={() => setEditSkillModal(prev => ({ ...prev, isOpen: false }))}
        currentSkillId={editSkillModal.currentSkillId}
        isTeamRegistration={editSkillModal.isTeamRegistration}
        teamId={editSkillModal.teamId}
        paymentId={editSkillModal.paymentId}
        teamName={editSkillModal.teamName}
        onUpdate={() => {
          // Close the modal
          setEditSkillModal(prev => ({ ...prev, isOpen: false }));
          // Trigger data refresh in parent component
          if (onSkillLevelUpdate) {
            onSkillLevelUpdate();
          }
        }}
      />
    </div>
  );
}
