import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeroBanner } from "../../components/HeroBanner";
import { Link } from "react-router-dom";
import { BookOpen, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { SparesSignupCTA } from "../../components/spares/SparesSignupCTA";
import { fetchPageContent } from "../../lib/pageContent";

interface HeroButton {
  text: string;
  link: string;
}

interface SkillLevel {
  title: string;
  bullets: string[];
  rating: number;
}

export interface VolleyballPageContent {
  hero: {
    image: string;
    imageAlt: string;
    containerClassName: string;
    title: string;
    subtitle: string;
    registerButton: HeroButton;
    scheduleButtonText: string;
  };
  intro: {
    heading: string;
    description: string;
  };
  leagueCards: Array<{
    title: string;
    image: string;
    link: string;
  }>;
  standardsCard: {
    title: string;
    buttonText: string;
    buttonLink: string;
  };
  aboutSection: {
    image: string;
    imageAlt: string;
    title: string;
    bullets: string[];
    buttonText: string;
    buttonLink: string;
  };
  skillLevels: SkillLevel[];
  partner: {
    logo: string;
    logoAlt: string;
    text: string;
    linkText: string;
    linkUrl: string;
  };
  spares: {
    heading: string;
    description: string;
    ctaTitle: string;
    ctaDescription: string;
  };
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    background: string;
  };
}

export const DEFAULT_VOLLEYBALL_CONTENT: VolleyballPageContent = {
  hero: {
    image: "/adult-open-play-1920x963.jpg",
    imageAlt: "Volleyball players",
    containerClassName: "h-[500px]",
    title: "Volleyball Leagues",
    subtitle:
      "OFSL's volleyball leagues are organized to provide participants with a structured environment that encourages sportsmanship, physical activity and healthy competition.",
    registerButton: {
      text: "Register Now",
      link: "/leagues?sport=Volleyball",
    },
    scheduleButtonText: "Schedule & Standings",
  },
  intro: {
    heading: "Find a league for you",
    description:
      "OFSL offers a variety of league nights across four divisions: Women’s, Mixed, Men’s, and Elite Women’s. Some divisions will feature referees at the Elite, Competitive, Advanced, and Intermediate levels. For the 2025/26 season, all leagues will follow either a tiered or hybrid format. This system ensures balanced, competitive play by finding the level that best suits their skills and experience.",
  },
  leagueCards: [
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
      image: "/Thursday womens premier.webp",
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
      image: "/sunday evening mixed.jpg",
      link: "/leagues?sport=Volleyball&day=Wednesday",
    },
    {
      title: "Thursday Elite/Comp/Adv League",
      image: "/Thursday mixed02.png",
      link: "/leagues?sport=Volleyball&day=Thursday",
    },
  ],
  standardsCard: {
    title: "Standards of Play",
    buttonText: "View Rules",
    buttonLink: "/standards-of-play",
  },
  aboutSection: {
    image: "/group-2.png",
    imageAlt: "OFSL Community",
    title: "About our volleyball leagues",
    bullets: [
      "Separated by tiers which are updated every week after the games.",
      "Focused on individuals who play at an intermediate to elite skill level.",
      "Gyms and play times may vary between tiers and leagues.",
      "You must be registered to access standings and schedules.",
      "To register a team, captains must create an account under registration and be approved by the league.",
    ],
    buttonText: "Register now",
    buttonLink: "/leagues?sport=Volleyball",
  },
  skillLevels: [
    {
      title: "Elite Level",
      bullets: [
        "Highly skilled players with advanced technical abilities",
        "Fast-paced play with strong team systems required",
        "Competitive club, college, or university experience",
        "All teams are extremely competitive",
      ],
      rating: 4,
    },
    {
      title: "Competitive Level",
      bullets: [
        "Solid foundation skills with competitive experience",
        "Structured team play and strategic positioning",
        "High school, club, or intramural experience",
        "Teams may advance to Elite based on performance",
      ],
      rating: 3,
    },
    {
      title: "Advanced Level",
      bullets: [
        "Strong game understanding and solid technical skills",
        "Organized rotations with moderately competitive pace",
        "Recreational league or school-level experience",
        "Teams can advance to Competitive based on results",
      ],
      rating: 2.5,
    },
    {
      title: "Intermediate Level",
      bullets: [
        "Developing consistency and game awareness skills",
        "Focus on fundamentals: passing, setting, positioning",
        "Great for returning players or limited experience",
        "Promotion to Advanced possible with strong performance",
      ],
      rating: 2,
    },
  ],
  partner: {
    logo: "/diabetes-canada-logo-svg-1.png",
    logoAlt: "Diabetes Canada logo",
    text: "Proudly partnering with Diabetes Canada to promote healthier lifestyles through sport and community wellness.",
    linkText: "Learn more",
    linkUrl: "/about-us#diabetes-canada-section",
  },
  spares: {
    heading: "Need a Substitute Player?",
    description:
      "Join our volleyball spares list to connect with teams that need substitute players. Team captains can contact you when they need an extra player for their games.",
    ctaTitle: "Join Volleyball Spares List",
    ctaDescription:
      "Register as a substitute player for volleyball teams that need extra players. Get notified when captains are looking for spares.",
  },
  cta: {
    title: "Ready to play?",
    subtitle: "Join thousands of athletes in our community.",
    buttonText: "Register now",
    buttonLink: "/leagues?sport=Volleyball",
    background: "linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)",
  },
};

const renderRatingStars = (rating: number) =>
  Array.from({ length: 4 }, (_, index) => {
    const starIndex = index + 1;
    if (rating >= starIndex) {
      return <Star key={starIndex} className="text-[#b20000] fill-[#b20000]" />;
    }

    if (rating > starIndex - 1 && rating < starIndex) {
      return (
        <div key={starIndex} className="relative">
          <Star className="text-[#b20000]" />
          <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
            <Star className="text-[#b20000] fill-[#b20000]" />
          </div>
        </div>
      );
    }

    return <Star key={starIndex} className="text-[#b20000]" />;
  });

export const VolleyballPage = (): React.ReactElement => {
  const { user } = useAuth();
  const [content, setContent] = useState<VolleyballPageContent>(DEFAULT_VOLLEYBALL_CONTENT);

  useEffect(() => {
    const controller = new AbortController();

    fetchPageContent<VolleyballPageContent>(
      "volleyball",
      DEFAULT_VOLLEYBALL_CONTENT,
      controller.signal,
    ).then((data) => setContent(data));

    return () => controller.abort();
  }, []);

  const scheduleLink = user ? "/my-account/teams" : "/login?redirect=/my-account/teams";

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image={content.hero.image}
          imageAlt={content.hero.imageAlt}
          containerClassName={content.hero.containerClassName}
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">{content.hero.title}</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">{content.hero.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to={content.hero.registerButton.link} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    {content.hero.registerButton.text}
                  </span>
                </Button>
              </Link>
              <Link to={scheduleLink} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                >
                  <span className="text-base md:text-lg text-white">
                    {content.hero.scheduleButtonText}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </HeroBanner>

        <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
          <h2 className="text-3xl font-bold text-center mb-16">{content.intro.heading}</h2>

          <div className="text-center mb-12">
            <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              {content.intro.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {content.leagueCards.map((card) => (
              <Link
                to={card.link}
                key={card.title}
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
                        <h3 className="text-white font-bold text-lg text-center">{card.title}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 mb-16 md:mb-24">
          <Card className="bg-[#b20000] rounded-lg">
            <CardContent className="flex flex-col md:flex-row items-center p-2 md:p-3 gap-3">
              <div className="px-4 py-2">
                <BookOpen className="w-[40px] h-[40px] md:w-[50px] md:h-[60px] text-white" />
              </div>
              <div className="md:ml-3 flex-1 text-center md:text-left">
                <h2 className="text-lg md:text-xl font-bold text-white">{content.standardsCard.title}</h2>
              </div>
              <div className="px-2 md:px-3">
                <Link to={content.standardsCard.buttonLink}>
                  <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[12px] md:px-[20px] py-1.5 md:py-2 w-full md:w-auto">
                    <span className="text-sm md:text-base text-[#b20000] hover:text-white">
                      {content.standardsCard.buttonText}
                    </span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-[91px] grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
            <div className="flex items-center justify-center">
              <img
                src={content.aboutSection.image}
                alt={content.aboutSection.imageAlt}
                className="rounded-lg w-[400px] h-[400px] object-cover object-[center_35%] shadow-lg"
              />
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-[#6F6F6F] mb-6">
                {content.aboutSection.title}
              </h3>
              <ul className="space-y-3 text-[#6F6F6F] text-base md:text-lg mb-8">
                {content.aboutSection.bullets.map((bullet, index) => (
                  <li key={`${bullet}-${index}`} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Link to={content.aboutSection.buttonLink} className="self-start">
                <Button
                  variant="outline"
                  className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-[10px] px-6 py-3"
                >
                  {content.aboutSection.buttonText}
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-[95px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {content.skillLevels.map((level) => (
              <div key={level.title} className="bg-gray-50 p-8 rounded-lg">
                <div className="flex mb-4">{renderRatingStars(level.rating)}</div>
                <h2 className="text-xl font-bold text-[#6F6F6F] mb-4">{level.title}</h2>
                <ul className="space-y-3 text-[#6F6F6F]">
                  {level.bullets.map((bullet, index) => (
                    <li key={`${level.title}-${index}`} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white pt-8 pb-24">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex justify-center">
              <div className="flex flex-col md:flex-row items-center max-w-[800px] gap-6">
                <img
                  className="w-[120px] md:w-[153px] h-auto md:h-[53px] object-contain"
                  alt={content.partner.logoAlt}
                  src={content.partner.logo}
                />
                <div className="text-base md:text-lg text-center md:text-left">
                  <span className="text-[#6f6f6f] leading-6 md:leading-7">{content.partner.text}</span>
                  <Link
                    to={content.partner.linkUrl}
                    className="text-base md:text-lg text-[#b20000] underline ml-2 font-bold"
                  >
                    {content.partner.linkText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 mb-16 md:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-center mb-4">{content.spares.heading}</h2>
            <p className="max-w-3xl mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
              {content.spares.description}
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <SparesSignupCTA
              sportFilter="Volleyball"
              className="shadow-lg"
              title={content.spares.ctaTitle}
              description={content.spares.ctaDescription}
            />
          </div>
        </div>

        <div
          className="w-full py-12 md:py-16"
          style={{
            background: content.cta.background,
          }}
        >
          <div className="max-w-[1280px] mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">{content.cta.title}</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">{content.cta.subtitle}</p>
            <Link to={content.cta.buttonLink}>
              <Button
                variant="outline"
                className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5"
              >
                <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                  {content.cta.buttonText}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
