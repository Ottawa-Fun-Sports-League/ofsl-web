import React from "react";
import { Button } from "../../components/ui/button";
import { HeroBanner } from "../../components/HeroBanner";
import { Link } from "react-router-dom";
import { Calendar, Users, Trophy, Clock } from "lucide-react";

export const TournamentsPage = (): React.ReactElement => {
  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image="/AdobeStock_81167068.jpeg"
          imageAlt="Volleyball tournament"
          containerClassName="h-[500px]"
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">Tournaments</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              OFSL&apos;s volleyball tournaments are designed to offer players a
              fun, competitive, and well-organized experience that promotes
              teamwork, sportsmanship, and a positive atmosphere.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/leagues?type=Tournament" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    View Tournaments
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </HeroBanner>

        {/* Tournament Types Section */}
        <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
          <h2 className="text-3xl font-bold text-center mb-16">
            Find a tournament for you
          </h2>

          {/* About tournaments text */}
          <div className="text-center mb-12">
            <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              Our tournaments are thoughtfully organized to accommodate a
              variety of skill levels, including Competitive, Advanced, and
              Intermediate divisions, ensuring there&apos;s a place for every
              team to compete. With events sometimes scheduled across multiple
              locations, we aim to maximize participation and provide teams with
              greater access to play.
            </p>
          </div>

          {/* Tournament Features Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-gray-50 p-8 rounded-lg">
                <Trophy className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">
                  Multiple Skill Levels
                </h3>
                <p className="text-[#6F6F6F]">
                  Competitive, Advanced, and Intermediate divisions
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gray-50 p-8 rounded-lg">
                <Calendar className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">
                  Saturday Events
                </h3>
                <p className="text-[#6F6F6F]">
                  All tournaments are scheduled on Saturdays
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gray-50 p-8 rounded-lg">
                <Users className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">
                  Multiple Locations
                </h3>
                <p className="text-[#6F6F6F]">
                  Events across different venues to maximize participation
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gray-50 p-8 rounded-lg">
                <Clock className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">
                  Competitive Balance
                </h3>
                <p className="text-[#6F6F6F]">
                  Neck and neck competition throughout the day
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* About our tournaments section with 2 columns */}
        <div className="max-w-[1280px] mx-auto px-4 mb-16 md:mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
            {/* First column with image */}
            <div className="flex items-center justify-center">
              <img
                src="/AdobeStock_564734754.jpeg"
                alt="Tournament Players"
                className="rounded-lg w-full max-w-[400px] h-[400px] object-cover shadow-lg"
              />
            </div>

            {/* Second column with text and button */}
            <div className="flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-[#6F6F6F] mb-6">
                About our tournaments
              </h3>
              <ul className="space-y-3 text-[#6F6F6F] text-base md:text-lg mb-8">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Our tournaments offer Competitive, Advanced, and
                    Intermediate skill levels
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Tournaments are played on Saturdays</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Sign-ups for tournaments are limited to the size of the
                    location
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Some tournaments take place over two different locations,
                    formatted by division
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Teams can expect a tournament that&apos;s neck and neck,
                    ensuring competitive play throughout the day
                  </span>
                </li>
              </ul>
              <Link to="/leagues?type=Tournament" className="self-start">
                <Button
                  variant="outline"
                  className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-[10px] px-6 py-3"
                >
                  View Tournaments
                </Button>
              </Link>
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

        {/* Ready to Play CTA */}
        <div
          className="w-full py-12 md:py-16"
          style={{
            background:
              "linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)",
          }}
        >
          <div className="max-w-[1280px] mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to compete?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Whether you&apos;re striving for high-level competition or simply
              looking to enjoy a well-run event with friends, our tournaments
              offer a dynamic and inclusive experience for all.
            </p>
            <Link to="/leagues?type=Tournament">
              <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5">
                <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                  View Tournaments
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

