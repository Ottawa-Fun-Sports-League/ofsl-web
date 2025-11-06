import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroBanner } from "../../components/HeroBanner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { BookOpen, Star } from "lucide-react";
import { fetchPageContent } from "../../lib/pageContent";

interface SkillLevel {
  title: string;
  bullets: string[];
  rating: number;
}

export interface PickleballPageContent {
  hero: {
    image: string;
    imageAlt: string;
    containerClassName: string;
    title: string;
    subtitle: string;
    buttons: Array<{ text: string; link: string }>;
  };
  intro: {
    heading: string;
    description: string;
  };
  leagueCardImage: string;
  emptyState: {
    title: string;
    description: string;
  };
  leagueCards: Array<{
    title: string;
    image: string;
    link: string;
    imagePosition?: string; // CSS object-position value, e.g., 'bottom'
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
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    background: string;
  };
}

export const DEFAULT_PICKLEBALL_CONTENT: PickleballPageContent = {
  hero: {
    image: "/pickleball-card.jpg",
    imageAlt: "Pickleball players",
    containerClassName: "h-[500px]",
    title: "Pickleball Programs",
    subtitle:
      "OFSL's pickleball programs are organized to provide participants with a social and organized environment with players of a similar skill level that encourages sportsmanship, exercise, and improving your pickleball game in a supportive community.",
    buttons: [
      {
        text: "View Pickleball Leagues",
        link: "/leagues?sport=Pickleball",
      },
    ],
  },
  intro: {
    heading: "Find a Pickleball Program For You",
    description:
      "OFSL's fall pickleball programs will use different formats for organizing matchups to keep things interesting each week, which will be the case for each fall program. OFSL asks you review the skill definitions carefully to ensure you register for the appropriate program. You can register as a fulltime player (every week), or as a drop in player (subject to availability).",
  },
  leagueCardImage: "/pickleball-card.jpg",
  emptyState: {
    title: "No pickleball leagues available at this time.",
    description: "Check back soon or join our newsletter for updates.",
  },
  leagueCards: [
    {
      title: "Novice",
      image: "/pickleball-novice.jpg",
      link: "/leagues?sport=Pickleball",
      imagePosition: "bottom",
    },
    {
      title: "Strong Beginner",
      image: "/pickleball 02.webp",
      link: "/leagues?sport=Pickleball",
      imagePosition: "top right",
    },
    {
      title: "Intermediate (low and high)",
      image: "/pickleball 03.jpg",
      link: "/leagues?sport=Pickleball",
    },
  ],
  standardsCard: {
    title: "Standards of Play",
    buttonText: "View Rules",
    buttonLink: "/standards-of-play",
  },
  aboutSection: {
    image: "/Pickleball 04.jpg",
    imageAlt: "Pickleball community",
    title: "About our pickleball programs",
    bullets: [
      "Onix Indoor Fuse ball (orange colour)",
      "Capacity: 4 courts with 16 players playing simultaneously.(maximum 20 players in attendance each week)",
      "Quality venue: high quality hardwood floors, bright lighting, high ceilings.",
      "Rotating formats: random partners/opponents, ladder play, and occasional fixedpartner and same-gender play periods.",
    ],
    buttonText: "Register now",
    buttonLink: "/leagues?sport=Pickleball",
  },
  skillLevels: [
    {
      title: "Novice",
      bullets: [
        "May need help understanding of the basic rules and strategy of pickleball",
        "Can serve and return the ball with some success",
        "Can sustain a short rally",
        "Can usually hit 'easy' (high, slow) ball into opponents' court",
        "Can usually hit ‘easy’ (high, slow) ball into opponents’ court",
        "Sometimes hesitates to move forward to the non-volley zone line (comfortable staying closer to the baseline)",
        
      ],
      rating: 1,
    },
    {
      title: "Strong Beginner",
      bullets: [
        "Understands all of the basic rules of pickleball",
        "Can consistently serve and return the ball",
        "Can sustain longer rallies with ‘easy balls’ but has difficulty sustaining rally with lower, harder balls",
        "Comfortable moving forward to non-volley zone line and reaches that position in most rallies",
        "Sometimes makes a mistake early in the rally",
        "Can hit backhands with some control",
        "Can dink easy (slow) balls back and forth a few times",
        "Comfortable attempting the 3rd shot drop",
        "Can volley medium/high balls with some success",
        "Tries to keep balls low",
      ],
      rating: 2,
    },
    {
      title: "Low Intermediate",
      bullets: [
        "Can consistently serve and return the ball with some precision",
        "Can sustain longer rallies, including some fast and low balls",
        "Moves forward to the non-volley zone as soon as possible",
        "Uses backhand as confidently and as often as a forehand",
        "Can sustain a longer dink rally including some fast and low dinks",
        "Attempts the 3rd shot drop and has some success in landing ball in non-volley zone",
        "Can consistently volley medium/high balls to take control of a rally",
        "Keeps most balls low (rarely pops a ball up high)",
      ],
      rating: 3,
    },
    {
      title: "High Intermediate",
      bullets: [
        "Can consistently serve and return with power, and depth",
        "Can sustain rallies with several low and fast balls",
        "Rarely makes a mistake early in the rally",
        "Strong groundstrokes on forehand and backhand side",
        "Can sustain a dink rally with fast and low balls with spin (slice and/or topspin)",
        "Consistently lands the 3rd shot drop into the opponents' non-volley zone with it bouncing low to ground",
        "Can volley 'low' balls into the opponents' non-volley zone",
        "Can sustain a medium-fast volley exchange back and forth with an opponent",
      ],
      rating: 4,
    },
  ],
  partner: {
    logo: "/diabetes-canada-logo-svg-1.png",
    logoAlt: "Diabetes Canada logo",
    text: "Proudly partnering with Diabetes Canada to promote healthier lifestyles through sport and community wellness.",
    linkText: "Learn more",
    linkUrl: "/about-us#diabetes-canada-section",
  },
  cta: {
    title: "Ready to play?",
    subtitle: "Join thousands of athletes in our community.",
    buttonText: "Register now",
    buttonLink: "/leagues?sport=Pickleball",
    background: "linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)",
  },
};

export const PickleballPage = (): React.ReactElement => {
  const [content, setContent] = useState<PickleballPageContent>(DEFAULT_PICKLEBALL_CONTENT);

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<PickleballPageContent>("pickleball", DEFAULT_PICKLEBALL_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        const fixed = {
          ...data,
          skillLevels: (data.skillLevels ?? []).map((level) =>
            level.title === "Novice"
              ? {
                  ...level,
                  bullets: [
                    "May need help understanding of the basic rules and strategy of pickleball",
                    "Can serve and return the ball with some success",
                    "Can sustain a short rally",
                    "Can usually hit 'easy' (high, slow) ball into opponents' court",
                    "Sometimes hesitates to move forward to the non-volley zone line (comfortable staying closer to the baseline)",
                  ],
                }
              : level,
          ),
        };
        setContent(fixed);
      })
      .catch((error) => {
        if ((error as Error | undefined)?.name === "AbortError") {
          return;
        }
        console.error("Failed to load pickleball page content", error);
        if (!isMounted) return;
        setContent(DEFAULT_PICKLEBALL_CONTENT);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
              {content.hero.buttons.map((button) => (
                <Link key={button.text} to={button.link} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-[#0d0d0d42] text-white border border-white rounded-[10px] px-[15px] md:px-[25px] py-2.5"
                  >
                    <span className="text-base md:text-lg text-white">{button.text}</span>
                  </Button>
                </Link>
              ))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                className="rounded-lg w-[400px] h-[400px] object-cover object-center shadow-lg"
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
                  {(level.title === "Novice" ? level.bullets.filter((b) => !b.includes("�")) : level.bullets).map((bullet, index) => (
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
