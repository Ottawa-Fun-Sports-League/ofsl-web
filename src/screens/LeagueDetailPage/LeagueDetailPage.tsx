import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/rich-text.css";
import {
  getSportIcon,
} from "./utils/leagueUtils";
import {
  fetchLeagueById,
  getDayName,
  formatLeagueDates,
  type League,
} from "../../lib/leagues";
import { logger } from "../../lib/logger";
import {
  useActiveView,
  type ActiveView,
} from "./hooks/useLeagueDetail";
import { NavigationTabs } from "./components/NavigationTabs";
import { LeagueInfo } from "./components/LeagueInfo";
import { LeagueStandings } from "./components/LeagueStandings";

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotsRemaining, setSpotsRemaining] = useState(0);

  // Get initial view from URL search params
  const tabParam = searchParams.get('tab');
  const initialView: ActiveView = tabParam === 'standings' ? 'standings' : 'info';
  
  const { activeView, setActiveView } = useActiveView(initialView);

  useEffect(() => {
    loadLeague();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadLeague = async () => {
    if (!id) {
      setError("League ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const leagueData = await fetchLeagueById(parseInt(id));

      if (!leagueData) {
        setError("League not found");
      } else {
        setLeague(leagueData);
      }
    } catch (err) {
      logger.error("Error loading league", err);
      setError("Failed to load league data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white w-full">
        <div className="max-w-[1280px] mx-auto px-4 py-12">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-[#6F6F6F] mb-6">
          League Not Found
        </h1>
        <p className="text-lg text-[#6F6F6F] mb-8">
          {error ||
            "The league you&apos;re looking for doesn&apos;t exist or has been removed."}
        </p>
        <Link to="/leagues">
          <Button className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-3">
            Back to Leagues
          </Button>
        </Link>
      </div>
    );
  }

  // Transform league data for the LeagueInfo component
  const leagueForInfo = {
    ...league,
    day: getDayName(league.day_of_week),
    hide_day: league.hide_day || false,
    specificLocation: league.gyms[0]?.address || undefined,
    dates: formatLeagueDates(
      league.start_date,
      league.end_date,
      league.hide_day || false,
    ),
    skillLevel: league.skill_names?.[0] || league.skill_name || "Not specified",
    price: league.cost || 0,
    spotsRemaining: spotsRemaining
  };

  const handleSpotsUpdate = (spots: number) => {
    setSpotsRemaining(spots);
  };

  return (
    <div className="bg-white w-full">
      <div className="max-w-[1280px] mx-auto px-4 py-12">
        {/* Back button */}
        <div className="mb-8">
          <Link
            to="/leagues"
            className="flex items-center text-[#B20000] hover:underline"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Leagues
          </Link>
        </div>

        {/* League title */}
        <div className="mb-8">
          <div className="flex items-start mb-2">
            <img
              src={getSportIcon(league.sport_name)}
              alt={league.sport_name || "Sport"}
              className="w-10 h-10 mr-3 flex-shrink-0 mt-1"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-[#6F6F6F] leading-none">
              {league.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <LeagueInfo
              league={leagueForInfo}
              sport={league.sport_name || ""}
              skillLevels={league.skill_names || undefined}
              onSpotsUpdate={handleSpotsUpdate}
            />
          </div>

          {/* Main content area */}
          <div className="md:col-span-3">
            {/* Navigation tabs */}
            <NavigationTabs
              activeView={activeView}
              setActiveView={setActiveView}
              sport={league.sport_name || ""}
              isAdmin={userProfile?.is_admin || false}
            />

            {/* League Info View */}
            {activeView === "info" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#6F6F6F] mb-4">
                    League Description
                  </h2>
                  <div
                    className="text-[#6F6F6F] league-description prose prose-ul:pl-0 prose-li:pl-0 max-w-none prose-headings:text-[#6F6F6F] prose-headings:font-bold"
                    dangerouslySetInnerHTML={{
                      __html: league.description || "No description available.",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Standings View */}
            {activeView === "standings" && (
              <LeagueStandings leagueId={id} />
            )}

          </div>
        </div>
      </div>

    </div>
  );
}

