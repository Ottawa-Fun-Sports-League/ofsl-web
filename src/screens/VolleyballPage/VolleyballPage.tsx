import React from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeroBanner } from "../../components/HeroBanner";
import { Link } from "react-router-dom";
import { BookOpen, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export const VolleyballPage = (): React.ReactElement => {
  const { user } = useAuth();

  // League card data
  const leagueCards = [
    {
      title: "Tuesday Women's Elite",
      image: "/womens-elite-card.jpg",
      link: "/leagues?sport=Volleyball&day=Tuesday&level=Elite",
    },
    {
      title: "Sunday Mixed League",
      image: "/Sunday Day Mixed.jpg",
      link: "/leagues?sport=Volleyball&day=Sunday&gender=Mixed",
    },
    {
      title: "OFSL Men's League",
      image: "/monday mens.jpg",
      link: "/leagues?sport=Volleyball&gender=Male",
    },
    {
      title: "OFSL Women's League",
      image: "/Monday Wonems.png",
      link: "/leagues?sport=Volleyball&gender=Female",
    },
    {
      title: "Monday Mixed League",
      image: "/Thursday elits 2.jpg",
      link: "/leagues?sport=Volleyball&day=Monday",
    },
    {
      title: "Tuesday Mixed League",
      image: "/Thursday Mixed.jpg",
      link: "/leagues?sport=Volleyball&day=Tuesday",
    },
    {
      title: "Wednesday Mixed League",
      image: "/Thursday womens premier.webp",
      link: "/leagues?sport=Volleyball&day=Wednesday",
    },
    {
      title: "Thursday Mixed League",
      image: "/sunday evening mixed.jpg",
      link: "/leagues?sport=Volleyball&day=Thursday",
    },
  ];

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image="/adult-open-play-1920x963.jpg"
          imageAlt="Volleyball players"
          containerClassName="h-[500px]"
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">Volleyball Leagues</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              OFSL&apos;s volleyball leagues are organized to provide
              participants with a structured environment that encourages
              sportsmanship, physical activity and healthy competition.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/leagues?sport=Volleyball" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    Register Now
                  </span>
                </Button>
              </Link>
              <Link
                to={
                  user
                    ? "/my-account/teams"
                    : "/login?redirect=/my-account/teams"
                }
                className="w-full sm:w-auto"
              >
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    Schedule & Standings
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </HeroBanner>

        {/* League Types Section - Reduced bottom padding */}
        <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
          <h2 className="text-3xl font-bold text-center mb-16">
            Find a league for you
          </h2>

          {/* Added text about volleyball divisions */}
          <div className="text-center mb-12">
            <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              OFSL offers a variety of league nights across four divisions:
              Women’s, Mixed, Men’s, and Elite Women’s. Some divisions will
              feature referees at the Elite, Competitive, Advanced, and
              Intermediate levels. For the 2025/26 season, all leagues will
              follow either a tiered or hybrid format. This system ensures
              balanced, competitive play by finding the level that best suits
              their skills and experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {leagueCards.map((card, index) => (
              <Link
                to={card.link}
                key={index}
                className="block transition-transform duration-300 hover:scale-105 hover:shadow-lg rounded-lg"
              >
                <Card className="border-none overflow-hidden h-full rounded-lg">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        className="w-full h-[300px] object-cover rounded-t-lg"
                        alt={card.title}
                        src={card.image}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 h-[90px] flex items-center justify-center px-4">
                        <h3 className="text-white font-bold text-lg text-center">
                          {card.title}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Standards of Play section - Reduced top margin */}
        <div className="max-w-[1280px] mx-auto px-4 mb-16 md:mb-24">
          <Card className="bg-[#b20000] rounded-lg">
            <CardContent className="flex flex-col md:flex-row items-center p-2 md:p-3 gap-3">
              <div className="px-4 py-2">
                <BookOpen className="w-[40px] h-[40px] md:w-[50px] md:h-[60px] text-white" />
              </div>
              <div className="md:ml-3 flex-1 text-center md:text-left">
                <h2 className="text-lg md:text-xl font-bold text-white">
                  Standards of Play
                </h2>
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

          {/* About our volleyball leagues section with 2 columns - Increased padding to 91px */}
          <div className="mt-[91px] grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
            {/* First column with image */}
            <div className="flex items-center justify-center">
              <img
                src="/group-2.png"
                alt="OFSL Community"
                className="rounded-lg w-[400px] h-[400px] object-cover object-[center_35%] shadow-lg"
              />
            </div>

            {/* Second column with text and button */}
            <div className="flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-[#6F6F6F] mb-6">
                About our volleyball leagues
              </h3>
              <ul className="space-y-3 text-[#6F6F6F] text-base md:text-lg mb-8">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Separated by tiers which are updated every week after the
                    games.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Focused on individuals who play at an intermediate to elite
                    skill level.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Gyms and play times may vary between tiers and leagues.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    You must be registered to access standings and schedules.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    To register a team, captains must create an account under
                    registration and be approved by the league.
                  </span>
                </li>
              </ul>
              <Link to="/leagues?sport=Volleyball" className="self-start">
                <Button
                  variant="outline"
                  className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-[10px] px-6 py-3"
                >
                  Register now
                </Button>
              </Link>
            </div>
          </div>

          {/* Skill Levels section - 4 columns - Increased padding to 95px */}
          <div className="mt-[95px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Elite Level */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="flex mb-4">
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
              </div>
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">
                Elite Level
              </h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Highly skilled players with advanced technical abilities
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Fast-paced play with strong team systems required</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Competitive club, college, or university experience
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>All teams are extremely competitive</span>
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
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">
                Competitive Level
              </h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Solid foundation skills with competitive experience
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Structured team play and strategic positioning</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>High school, club, or intramural experience</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Teams may advance to Elite based on performance</span>
                </li>
              </ul>
            </div>

            {/* Advanced Level - Updated to have 2.5 stars */}
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
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">
                Advanced Level
              </h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Strong game understanding and solid technical skills
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Organized rotations with moderately competitive pace
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Recreational league or school-level experience</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Teams can advance to Competitive based on results</span>
                </li>
              </ul>
            </div>

            {/* Intermediate Level - Updated to have 2 stars */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="flex mb-4">
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000] fill-[#b20000]" />
                <Star className="text-[#b20000]" />
                <Star className="text-[#b20000]" />
              </div>
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">
                Intermediate Level
              </h2>
              <ul className="space-y-3 text-[#6F6F6F]">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Developing consistency and game awareness skills</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Focus on fundamentals: passing, setting, positioning
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Great for returning players or limited experience</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Promotion to Advanced possible with strong performance
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Diabetes Canada partnership section - With increased bottom padding */}
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
                  <Link
                    to="/about-us#diabetes-canada-section"
                    className="text-base md:text-lg text-[#b20000] underline ml-2 font-bold"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ready to Play CTA - Full width section */}
        <div
          className="w-full py-12 md:py-16"
          style={{
            background:
              "linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)",
          }}
        >
          <div className="max-w-[1280px] mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to play?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of athletes in our community.
            </p>
            <Link to="/leagues?sport=Volleyball">
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
