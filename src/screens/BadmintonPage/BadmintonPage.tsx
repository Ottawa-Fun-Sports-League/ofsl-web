import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeroBanner } from "../../components/HeroBanner";
import { Link } from "react-router-dom";
import { BookOpen, Star, MapPin, Calendar, DollarSign, Users } from "lucide-react";
import { 
  fetchLeagues,
  LeagueWithTeamCount,
  groupLeaguesByDay,
  getOrderedDayNames,
  GroupedLeagues,
  formatLeagueDates,
  getPrimaryLocation
} from "../../lib/leagues";
import { LoadingSpinner } from "../../components/ui/loading-spinner";

export const BadmintonPage = (): React.ReactElement => {
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBadmintonLeagues = async () => {
      try {
        setLoading(true);
        const allLeagues = await fetchLeagues();
        // Filter for badminton leagues only
        const badmintonLeagues = allLeagues.filter(league => 
          league.sport_name?.toLowerCase().includes('badminton')
        );
        setLeagues(badmintonLeagues);
      } catch (err) {
        console.error('Error loading badminton leagues:', err);
        setError('Failed to load badminton leagues');
      } finally {
        setLoading(false);
      }
    };

    loadBadmintonLeagues();
  }, []);

  // Group badminton leagues by day of the week
  const groupedLeagues: GroupedLeagues = groupLeaguesByDay(leagues);
  const orderedDayNames = getOrderedDayNames();

  // Only show days that have leagues
  const activeDays = orderedDayNames.filter(dayName => 
    groupedLeagues[dayName] && groupedLeagues[dayName].length > 0
  );

  // Function to get spots text
  const getSpotsText = (spots: number) => {
    if (spots === 0) return "Full";
    if (spots === 1) return "1 spot left";
    return `${spots} spots left`;
  };

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image="/AdobeStock_283705208.jpeg"
          imageAlt="Badminton players"
          containerClassName="h-[500px]"
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">Badminton Leagues</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              OFSL&apos;s badminton leagues offer high-caliber play for a range of skill levels, from competitive to advanced. Enjoy fast-paced action and elevate your game in a supportive and inclusive community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/leagues?sport=Badminton" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    Register Now
                  </span>
                </Button>
              </Link>
              
            </div>
          </div>
        </HeroBanner>

        {/* League Types Section */}
        <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
          <h2 className="text-3xl font-bold text-center mb-16">
            Find a league for you
          </h2>
          
          {/* About badminton leagues text */}
          <div className="text-center mb-12">
            <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              OFSL&apos;s badminton leagues feature doubles play across competitive and advanced skill levels. Designed to deliver exciting matchups in a fun and inclusive environment, our leagues offer the perfect balance of challenge and community. Whether you&apos;re looking to sharpen your skills or compete at a higher level, there&apos;s a spot for you.

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
              {activeDays.map(dayName => (
                <div key={dayName}>
                  {/* Day Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-[#6F6F6F] mb-2">{dayName}</h3>
                    <div className="w-16 h-1 bg-[#B20000] rounded"></div>
                  </div>
                  
                  {/* League Cards for this Day */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                    {groupedLeagues[dayName].map(league => (
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
                                src="/badminton-card.png"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-4">
                                <h3 className="text-white font-bold text-lg text-center mb-2">
                                  {league.name}
                                </h3>
                                
                                {/* League Info Overlay */}
                                <div className="space-y-1 text-sm text-white/90">
                                  {/* Dates */}
                                  <div className="flex items-center justify-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>{formatLeagueDates(league.start_date, league.end_date, league.hide_day || false)}</span>
                                  </div>
                                  
                                  {/* Location */}
                                  <div className="flex items-center justify-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    <div className="flex flex-wrap gap-1">
                                      {(() => {
                                        const gymLocations = getPrimaryLocation(league.gyms || []);
                                        if (gymLocations.length === 0) {
                                          return <span>TBD</span>;
                                        }
                                        return gymLocations.join(', ');
                                      })()}
                                    </div>
                                  </div>
                                  
                                  {/* Price and Spots */}
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      <span>${league.cost}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Users className="h-3 w-3 mr-1" />
                                      <span className={`text-xs py-0.5 px-1 rounded ${league.spots_remaining === 0 ? 'bg-red-600' : league.spots_remaining <= 3 ? 'bg-orange-600' : 'bg-green-600'}`}>
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
              <p className="text-[#6F6F6F] text-lg">No badminton leagues available at this time.</p>
              <p className="text-[#6F6F6F]">Check back soon for upcoming leagues!</p>
            </div>
          )}
        </div>
        
        {/* Standards of Play section */}
        <div className="max-w-[1280px] mx-auto px-4 mb-16 md:mb-24">
          <Card className="bg-[#b20000] rounded-lg">
            <CardContent className="flex flex-col md:flex-row items-center p-2 md:p-3 gap-3">
              <div className="px-4 py-2">
                <BookOpen className="w-[40px] h-[40px] md:w-[50px] md:h-[60px] text-white" />
              </div>
              <div className="md:ml-3 flex-1 text-center md:text-left">
                <h2 className="text-lg md:text-xl font-bold text-white">Standards of Play</h2>
              </div>
              <div className="px-2 md:px-3">
                <Link to="/standards-of-play">
                  <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[12px] md:px-[20px] py-1.5 md:py-2 w-full md:w-auto">
                    <span className="text-sm md:text-base text-[#b20000] hover:text-white">
                      View Rules
                    </span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          {/* About our badminton leagues section with 2 columns */}
          <div className="mt-[91px] grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
            {/* First column with image */}
            <div className="flex items-center justify-center">
              <img 
                src="/AdobeStock_286739717.jpeg" 
                alt="Badminton Players" 
                className="rounded-lg w-[400px] h-[400px] object-cover object-center shadow-lg"
              />
            </div>
            
            {/* Second column with text and button */}
            <div className="flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-[#6F6F6F] mb-6">About our badminton leagues</h3>
              <ul className="space-y-3 text-[#6F6F6F] text-base md:text-lg mb-8">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Doubles format offered across competitive and advanced skill levels.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Tailored for players seeking challenging yet enjoyable match play.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Professional-grade shuttlecocks provided at select locations.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Multiple courts ensure smooth scheduling and quality playing conditions.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Individual registration available — we&apos;ll recommend an evening that matches your skill level
.</span>
                </li>
              </ul>
              <Link to="/leagues?sport=Badminton" className="self-start">
                <Button variant="outline" className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-[10px] px-6 py-3">
                  Register now
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Skill Levels section - 4 columns */}
          <div className="mt-[95px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Elite Level */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="flex mb-4">
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
              </div>
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">Elite Level</h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Tournament-level play with advanced techniques and strategies.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Consistent power and precision in all shots.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Excellent court coverage and anticipation skills.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Strong tactical awareness and game management.</span>
                </li>
              </ul>
            </div>
            
            {/* Competitive Level */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="flex mb-4">
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000]" />
              </div>
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">Competitive Level</h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Strong fundamental skills with developing advanced techniques.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Good court positioning and shot selection.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Consistent rallies with occasional power shots.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Understanding of basic tactics and game flow.</span>
                </li>
              </ul>
            </div>
            
            {/* Advanced Level */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="flex mb-4">
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <div className="relative">
                  <Star className="text-[#b20000]" />
                  <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
                    <Star className="text-[#b20000] fill-[#b20000]" />
                  </div>
                </div>
                <Star className="text-[#b20000]" />
              </div>
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">Advanced Level</h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Solid technique in all basic strokes and serves.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Good footwork and court movement.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Ability to maintain longer rallies with control.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Basic understanding of doubles positioning.</span>
                </li>
              </ul>
            </div>
            
            {/* Intermediate Level */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="flex mb-4">
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000]" />
                <Star className="text-[#b20000]" />
              </div>
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">Intermediate Level</h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Comfortable with basic strokes and serves.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Developing consistency in shot placement.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Learning proper footwork and court positioning.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Eager to improve and learn new techniques.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Diabetes Canada partnership section */}
        <div className="bg-white pt-8 pb-24">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex justify-center">
              <div className="flex flex-col md:flex-row items-center max-w-[800px] gap-6">
                <img
                  className="w-[120px] md:w-[153px] h-auto md:h-[53px] object-contain"
                  alt="Diabetes Canada logo"
                  src="/diabetes-canada-logo-svg-1.png"
                />
                <div className="text-base md:text-lg text-center md:text-left">
                  <span className="text-[#6f6f6f] leading-6 md:leading-7">
                    Proudly partnering with Diabetes Canada to promote healthier
                    lifestyles through sport and community wellness.
                  </span>
                  <Link to="/about-us#diabetes-canada-section" className="text-base md:text-lg text-[#b20000] underline ml-2 font-bold">
                    Learn more
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ready to Play CTA - Full width section */}
        <div className="w-full py-12 md:py-16" style={{ background: 'linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)' }}>
          <div className="max-w-[1280px] mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to play?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our badminton community and experience competitive play at your skill level.
            </p>
            <Link to="/leagues?sport=Badminton">
              <Button
                variant="outline"
                className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5"
              >
                <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                  Register now
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};