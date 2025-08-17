import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { MapPin, Calendar, Clock, DollarSign, Users } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { TeamRegistrationModal } from "./TeamRegistrationModal";
import { PaymentButton } from "../../../components/PaymentButton";
import { formatPrice } from "../../../stripe-config";
import { supabase } from "../../../lib/supabase";
import { getStripeProductByLeagueId } from "../../../lib/stripe";
import { LocationPopover } from "../../../components/ui/LocationPopover";
import {
  getGymNamesByLocation,
  getPrimaryLocation,
  getDayName,
  formatLeagueDates,
} from "../../../lib/leagues";
import { formatLocalDate } from "../../../lib/dateUtils";
import type { League } from "../../../lib/leagues";

// Function to get spots badge color
const getSpotsBadgeColor = (spots: number) => {
  if (spots === 0) return "bg-red-100 text-red-800";
  if (spots <= 3) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
};

// Function to get spots text
const getSpotsText = (spots: number) => {
  if (spots === 0) return "Full";
  if (spots === 1) return "1 spot left";
  return `${spots} spots left`;
};

interface LeagueInfoProps {
  league: League;
  sport: string;
  skillLevels?: string[];
  onSpotsUpdate?: (spots: number) => void;
}

export function LeagueInfo({
  league,
  sport,
  skillLevels,
  onSpotsUpdate,
}: LeagueInfoProps) {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [actualSpotsRemaining, setActualSpotsRemaining] = useState(0);
  const [stripeProduct, setStripeProduct] = useState<{
    id: string;
    price_id: string;
    name: string;
    description: string;
    mode: string;
    price: number;
    currency: string;
    interval: string | null;
    league_id: number | null;
  } | null>(null);
  const { user } = useAuth();
  const [isTeamCaptain, setIsTeamCaptain] = useState(false);
  const [_matchingProduct, setMatchingProduct] = useState<{
    id: string;
    price_id: string;
    name: string;
    description: string;
    mode: string;
    price: number;
    currency: string;
    interval: string | null;
    league_id: number | null;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadActualTeamCount();
    checkIfTeamCaptain();
    loadStripeProduct();
    loadProductInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.id]);

  const loadStripeProduct = async () => {
    try {
      const product = await getStripeProductByLeagueId(league.id);
      setStripeProduct(product);
    } catch (error) {
      console.error("Error loading Stripe product:", error);
    }
  };

  const loadProductInfo = async () => {
    try {
      const product = await getStripeProductByLeagueId(league.id);
      if (product) {
        setMatchingProduct(product);
      }
    } catch (error) {
      console.error("Error loading product info:", error);
    }
  };

  const checkIfTeamCaptain = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id")
        .eq("league_id", league.id)
        .eq("captain_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      setIsTeamCaptain(!!data);
    } catch (error) {
      console.error("Error checking team captain status:", error);
    }
  };

  const loadActualTeamCount = async () => {
    try {
      const { data: teams, error } = await supabase
        .from("teams")
        .select("id")
        .eq("league_id", league.id)
        .eq("active", true);

      if (error) throw error;

      const teamCount = teams?.length || 0;
      const maxTeams = league.max_teams || 20;
      const spotsRemaining = Math.max(0, maxTeams - teamCount);

      setActualSpotsRemaining(spotsRemaining);

      // Notify parent component of the update
      if (onSpotsUpdate) {
        onSpotsUpdate(spotsRemaining);
      }
    } catch (error) {
      console.error("Error loading team count:", error);
    }
  };

  const handleRegisterClick = () => {
    if (!user) {
      // Store the current page URL for redirect after login
      const currentPath = window.location.pathname;
      localStorage.setItem("redirectAfterLogin", currentPath);
      navigate("/login");
      return;
    }

    // User is logged in, show registration modal
    setShowRegistrationModal(true);
  };

  // Only show payment button if there's a valid product and the user is the team captain
  return (
    <>
      <div className="bg-gray-100 rounded-lg p-6 mb-6">
        {/* League Details */}
        <div className="space-y-4 mb-6">
          {/* Day & Time */}
          <div className="flex items-start">
            <Clock className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#6F6F6F]">
                {getDayName(league.day_of_week)}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center flex-wrap">
            <MapPin className="h-4 w-4 text-[#B20000] mr-2 flex-shrink-0" />
            <p className="font-medium text-[#6F6F6F] mr-2">Location:</p>
            <div className="flex flex-wrap gap-1">
              {(() => {
                const gymLocations = getPrimaryLocation(league.gyms || []);

                if (gymLocations.length === 0) {
                  return (
                    <span className="font-medium text-[#6F6F6F]">TBD</span>
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
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                      {location}
                    </span>
                  </LocationPopover>
                ));
              })()}
            </div>
          </div>

          {/* Season Dates */}
          <div className="flex items-start">
            <Calendar className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#6F6F6F]">Season Dates</p>
              <p className="text-sm text-[#6F6F6F]">
                {formatLeagueDates(
                  league.start_date,
                  league.end_date,
                  league.hide_day || false,
                )}
              </p>
            </div>
          </div>

          {/* Skill Level */}
          {skillLevels && skillLevels.length > 0 ? (
            <div className="flex items-start">
              <svg
                className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,13V15H7V13H5M3,13H9V19H3V13Z" />
              </svg>
              <div>
                <p className="font-medium text-[#6F6F6F]">Skill Levels</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {skillLevels.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            league.skill_name && (
              <div className="flex items-start">
                <svg
                  className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,13V15H7V13H5M3,13H9V19H3V13Z" />
                </svg>
                <div>
                  <p className="font-medium text-[#6F6F6F]">Skill Level</p>
                  <p className="text-sm text-[#6F6F6F]">{league.skill_name}</p>
                </div>
              </div>
            )
          )}

          {/* Price */}
          <div className="flex items-start">
            <DollarSign className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#6F6F6F]">League Fee</p>
              {stripeProduct ? (
                <p className="text-sm text-[#6F6F6F]">
                  {formatPrice(stripeProduct.price)} + HST{" "}
                  {sport === "Volleyball" ? "per team" : "per player"}
                </p>
              ) : league.cost ? (
                <p className="text-sm text-[#6F6F6F]">
                  ${league.cost.toFixed(2)} + HST{" "}
                  {sport === "Volleyball" ? "per team" : "per player"}
                </p>
              ) : (
                <p className="text-sm text-[#6F6F6F]">No fee required</p>
              )}
            </div>
          </div>

          {/* Deposit Information */}
          {league.deposit_amount && league.deposit_date && (
            <div className="flex items-start">
              <DollarSign className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-[#6F6F6F]">Deposit Required</p>
                <p className="text-sm text-[#6F6F6F]">
                  ${league.deposit_amount.toFixed(2)} by{" "}
                  {formatLocalDate(league.deposit_date)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Non-refundable deposit to secure your spot
                </p>
              </div>
            </div>
          )}

          {/* Spots Remaining */}
          <div className="flex items-start">
            <Users className="h-4 w-4 text-[#B20000] mr-2 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#6F6F6F]">Availability</p>
              <span
                className={`text-xs font-medium py-1 px-3 rounded-full ${getSpotsBadgeColor(actualSpotsRemaining)}`}
              >
                {getSpotsText(actualSpotsRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Register Button or Payment Button */}
        {stripeProduct && isTeamCaptain ? (
          <PaymentButton
            priceId={stripeProduct.price_id}
            productName={stripeProduct.name}
            price={stripeProduct.price}
            mode={stripeProduct.mode as "payment" | "subscription"}
            metadata={{ leagueId: league.id.toString() }}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] w-full py-3"
            variant="default"
          >
            {actualSpotsRemaining === 0
              ? "Join Waitlist"
              : "Register & Pay Now"}
          </PaymentButton>
        ) : isTeamCaptain ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Payment options not available for this league
            </p>
            <Link to="/my-account/teams">
              <Button
                variant="outline"
                className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-[10px] w-full py-3"
              >
                Manage Your Team
              </Button>
            </Link>
          </div>
        ) : (
          <Button
            onClick={handleRegisterClick}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] w-full py-3"
          >
            {actualSpotsRemaining === 0 ? "Join Waitlist" : "Register"}
          </Button>
        )}
      </div>

      {/* Registration Modal */}
      <TeamRegistrationModal
        showModal={showRegistrationModal}
        closeModal={() => {
          setShowRegistrationModal(false);
          // Reload team count after registration
          loadActualTeamCount();
        }}
        leagueId={league.id}
        leagueName={league.name}
        league={league}
        isWaitlist={actualSpotsRemaining === 0}
      />
    </>
  );
}

