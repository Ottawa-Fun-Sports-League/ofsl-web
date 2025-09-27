import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroBanner } from "../../components/HeroBanner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { LoadingSpinner } from "../../components/ui/loading-spinner";
import {
  fetchLeagues,
  LeagueWithTeamCount,
  groupLeaguesByDay,
  getOrderedDayNames,
  GroupedLeagues,
  formatLeagueDates,
  getPrimaryLocation,
} from "../../lib/leagues";
import { Calendar, DollarSign, MapPin, Users } from "lucide-react";

export const PickleballPage = (): React.ReactElement => {
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeagues = async () => {
      try {
        setLoading(true);
        const allLeagues = await fetchLeagues();
        const pickleballLeagues = allLeagues.filter((league) =>
          league.sport_name?.toLowerCase().includes("pickleball"),
        );
        setLeagues(pickleballLeagues);
      } catch (err) {
        console.error("Error loading pickleball leagues:", err);
        setError("Failed to load pickleball leagues");
      } finally {
        setLoading(false);
      }
    };

    loadLeagues();
  }, []);

  const groupedLeagues: GroupedLeagues = groupLeaguesByDay(leagues);
  const orderedDayNames = getOrderedDayNames();
  const activeDays = orderedDayNames.filter(
    (dayName) => groupedLeagues[dayName] && groupedLeagues[dayName].length > 0,
  );

  const getSpotsText = (spots: number) => {
    if (spots === 0) return "Full";
    if (spots === 1) return "1 spot left";
    return `${spots} spots left`;
  };

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image="/pickleball-card.jpg"
          imageAlt="Pickleball players"
          containerClassName="h-[500px]"
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">Pickleball Leagues</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              Serve, rally, and score with OFSL pickleball. Join competitive and social doubles play
              across Ottawa&apos;s top facilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/leagues?sport=Pickleball" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">View Pickleball Leagues</span>
                </Button>
              </Link>
            </div>
          </div>
        </HeroBanner>

        <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
          <h2 className="text-3xl font-bold text-center mb-16">Find a pickleball league</h2>

          <div className="text-center mb-12">
            <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              OFSL pickleball leagues feature doubles play with an emphasis on fun, fair matchups, and
              community. Whether you&apos;re building up your dink game or chasing tournament-level rallies,
              our leagues deliver great competition in a welcoming environment.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-3"
              >
                Try Again
              </Button>
            </div>
          ) : activeDays.length > 0 ? (
            <div className="space-y-12">
              {activeDays.map((dayName) => (
                <div key={dayName}>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">{dayName}</h3>
                    <div className="w-16 h-1 bg-[#B20000] rounded" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {groupedLeagues[dayName]?.map((league) => (
                      <Link
                        key={league.id}
                        to={`/leagues/${league.id}`}
                        className="block transition-transform duration-300 hover:scale-105 hover:shadow-lg rounded-lg"
                      >
                        <Card className="border-none overflow-hidden h-full rounded-lg">
                          <CardContent className="p-0">
                            <div className="relative">
                              <img
                                className="w-full h-[300px] object-cover rounded-t-lg"
                                alt={league.name}
                                src="/pickleball-card.jpg"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-4">
                                <h3 className="text-white font-bold text-lg text-center mb-2">{league.name}</h3>

                                <div className="space-y-1 text-sm text-white/90">
                                  <div className="flex items-center justify-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>
                                      {formatLeagueDates(
                                        league.start_date,
                                        league.end_date,
                                        league.hide_day || false,
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    <div className="flex flex-wrap gap-1">
                                      {(() => {
                                        const gymLocations = getPrimaryLocation(league.gyms || []);
                                        if (gymLocations.length === 0) {
                                          return <span>TBD</span>;
                                        }
                                        return gymLocations.join(", ");
                                      })()}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-col items-start text-xs">
                                      <div className="flex items-center">
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        <span>{league.cost !== null ? `$${league.cost}` : 'Cost TBD'}</span>
                                      </div>
                                      <span className="ml-4 text-[10px] uppercase text-white/70">
                                        {league.team_registration === false ? 'per player' : 'per team'}
                                      </span>
                                    </div>
                                    <div className="flex items-center">
                                      <Users className="h-3 w-3 mr-1" />
                                      <span
                                        className={`text-xs py-0.5 px-1 rounded ${
                                          league.spots_remaining === 0
                                            ? 'bg-red-600'
                                            : league.spots_remaining <= 3
                                            ? 'bg-orange-600'
                                            : 'bg-green-600'
                                        }`}
                                      >
                                        {getSpotsText(league.spots_remaining)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#6F6F6F] text-lg">No pickleball leagues available at this time.</p>
              <p className="text-[#6F6F6F]">Check back soon or join our newsletter for updates.</p>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
};
