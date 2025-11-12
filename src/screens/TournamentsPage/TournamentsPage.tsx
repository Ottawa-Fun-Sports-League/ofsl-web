import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Calendar, Clock, Flag, Shield, Star, Trophy, Users } from "lucide-react";

import { HeroBanner } from "../../components/HeroBanner";
import { Button } from "../../components/ui/button";
import { fetchPageContent } from "../../lib/pageContent";
import { logger } from "../../lib/logger";

type FeatureIcon =
  | "trophy"
  | "calendar"
  | "users"
  | "clock"
  | "star"
  | "award"
  | "flag"
  | "shield";

export interface TournamentsPageContent {
  hero: {
    image: string;
    imageAlt: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
  };
  intro: string;
  features: Array<{
    icon: FeatureIcon;
    title: string;
    description: string;
  }>;
  about: {
    image: string;
    imageAlt: string;
    title: string;
    paragraphs: string[];
    bullets: string[];
    buttonText: string;
    buttonLink: string;
  };
  callout: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export const DEFAULT_TOURNAMENTS_CONTENT: TournamentsPageContent = {
  hero: {
    image: "/AdobeStock_81167068.jpeg",
    imageAlt: "Volleyball tournament",
    title: "Tournaments",
    subtitle:
      "OFSL's volleyball tournaments are designed to offer players a fun, competitive, and well-organized experience that promotes teamwork, sportsmanship, and a positive atmosphere.",
    ctaText: "View Tournaments",
    ctaLink: "/leagues?type=Tournament",
  },
  intro:
    "Our tournaments are thoughtfully organized to accommodate Competitive, Advanced, and Intermediate divisions, ensuring there is a place for every team to compete. With events scheduled across multiple locations, we maximize participation and provide teams plenty of access to play.",
  features: [
    {
      icon: "trophy",
      title: "Multiple Skill Levels",
      description: "Competitive, Advanced, and Intermediate divisions",
    },
    {
      icon: "calendar",
      title: "Saturday Events",
      description: "All tournaments are scheduled on Saturdays",
    },
    {
      icon: "users",
      title: "Multiple Locations",
      description: "Events across different venues to maximize participation",
    },
    {
      icon: "clock",
      title: "Competitive Balance",
      description: "Neck and neck competition throughout the day",
    },
  ],
  about: {
    image: "/AdobeStock_81167068.jpeg",
    imageAlt: "Tournament players",
    title: "About our tournaments",
    paragraphs: [
      "Our tournaments offer Competitive, Advanced, and Intermediate divisions to meet every team's needs.",
      "Events are played on Saturdays with matches scheduled throughout the day to keep the energy high.",
    ],
    bullets: [
      "Some events take place across multiple locations to accommodate more teams",
      "Teams can expect well-run schedules and competitive matchups",
      "Limited sign-ups ensure high quality play",
    ],
    buttonText: "View Tournaments",
    buttonLink: "/leagues?type=Tournament",
  },
  callout: {
    title: "Ready to compete?",
    description:
      "Whether you're looking for a well-run event with friends or a chance to test your skills, our tournaments deliver a memorable experience.",
    buttonText: "View Tournaments",
    buttonLink: "/leagues?type=Tournament",
  },
};

const featureIconComponents: Record<FeatureIcon, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  calendar: Calendar,
  users: Users,
  clock: Clock,
  star: Star,
  award: Award,
  flag: Flag,
  shield: Shield,
};

export const TournamentsPage = (): React.ReactElement => {
  const [content, setContent] = useState<TournamentsPageContent>(DEFAULT_TOURNAMENTS_CONTENT);

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<TournamentsPageContent>("tournaments", DEFAULT_TOURNAMENTS_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        setContent(data);
      })
      .catch((error) => {
        logger.error("Failed to load tournaments content", error as Error);
        if (isMounted) {
          setContent(DEFAULT_TOURNAMENTS_CONTENT);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image={content.hero.image}
          imageAlt={content.hero.imageAlt}
          containerClassName="h-[500px]"
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">{content.hero.title}</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">{content.hero.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to={content.hero.ctaLink} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    {content.hero.ctaText}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </HeroBanner>

        <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
          <h2 className="text-3xl font-bold text-center mb-16">
            Find a tournament for you
          </h2>

          <div className="text-center mb-12">
            <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              {content.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {content.features.map((feature) => {
              const Icon = featureIconComponents[feature.icon] ?? Trophy;
              return (
                <div key={feature.title} className="text-center">
                  <div className="bg-gray-50 p-8 rounded-lg h-full">
                    <Icon className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-[#6F6F6F]">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 pb-16 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <img
                className="w-full rounded-2xl"
                alt={content.about.imageAlt}
                src={content.about.image}
              />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#6F6F6F] mb-6">
                {content.about.title}
              </h3>
              {content.about.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-[#6F6F6F] text-base md:text-lg leading-6 md:leading-7 mb-4">
                  {paragraph}
                </p>
              ))}
              <ul className="list-disc list-inside text-[#6F6F6F] mb-6 space-y-2">
                {content.about.bullets.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
              <Link to={content.about.buttonLink} className="inline-block">
                <Button className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-[25px] py-2.5">
                  {content.about.buttonText}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-[#FDF4F4] py-16">
          <div className="max-w-[1280px] mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-4">
              {content.callout.title}
            </h2>
            <p className="text-[#6F6F6F] text-base md:text-lg leading-6 md:leading-7 mb-6 max-w-3xl mx-auto">
              {content.callout.description}
            </p>
            <Link to={content.callout.buttonLink}>
              <Button className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-[25px] py-2.5">
                {content.callout.buttonText}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { FeatureIcon };
