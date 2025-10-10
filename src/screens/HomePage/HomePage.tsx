import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeroBanner } from "../../components/HeroBanner";
import { fetchPageContent } from "../../lib/pageContent";

interface HeroButton {
  text: string;
  link: string;
}

export interface HomePageContent {
  hero: {
    image: string;
    imageAlt: string;
    containerClassName: string;
    title: string;
    subtitle: string;
    buttons: HeroButton[];
  };
  partner: {
    logo: string;
    logoAlt: string;
    text: string;
    linkText: string;
    linkUrl: string;
  };
  sponsorBanner: {
    logo: string;
    logoAlt: string;
    title: string;
    description: string;
    primaryLinkText: string;
    primaryLinkUrl: string;
    secondaryText: string;
    secondaryLinkText: string;
    secondaryLinkUrl: string;
  };
  leagueDescription: string;
  popularLeagues: Array<{
    title: string;
    image: string;
    alt: string;
    link: string;
  }>;
  highlightCard: {
    title: string;
    description: string;
    icon: string;
    buttonText: string;
    buttonLink: string;
  };
  featureSections: Array<{
    title: string;
    description: string;
    image: string;
    imageAlt: string;
    linkText: string;
    linkUrl: string;
  }>;
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    background: string;
  };
}

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero: {
    image: "/mask-group.png",
    imageAlt: "Volleyball players",
    containerClassName: "h-[450px] md:h-[604px]",
    title: "Welcome to OFSL!",
    subtitle:
      "Ottawa's leading adult volleyball and badminton league—where sportsmanship meets healthy competition from competitive to intermediate levels.",
    buttons: [
      { text: "Womens Elite", link: "/volleyball" },
      { text: "Register Now", link: "/leagues" },
      { text: "Tournaments", link: "/tournaments" },
    ],
  },
  partner: {
    logo: "/diabetes-canada-logo-svg-1.png",
    logoAlt: "Diabetes Canada logo",
    text: "Proudly partnering with Diabetes Canada to promote healthier lifestyles through sport and community wellness.",
    linkText: "Learn more",
    linkUrl: "https://www.diabetes.ca",
  },
  sponsorBanner: {
    logo: "/popeyes-supplements-logo.png",
    logoAlt: "Popeye's Supplements logo",
    title: "Stack your savings with Popeye's Supplements",
    description:
      "Use our exclusive Popeye's link to save 10% on every regular-priced product, then double down with an extra 10% rebate from OFSL.",
    primaryLinkText: "Shop with 10% off",
    primaryLinkUrl: "https://popeyesonlineorders.com/discount/OFSL20",
    secondaryText: "Email your online receipt to unlock OFSL's additional 10% rebate:",
    secondaryLinkText: "info@ofsl.ca",
    secondaryLinkUrl: "mailto:info@ofsl.ca",
  },
  leagueDescription:
    "Our leagues provide a well-organized structure and experience for those who take their play seriously—but still want to have a good time. Geared toward intermediate to competitive play, it's a great way to stay active, maintain your fitness, and connect with others who share your passion for the games.",
  popularLeagues: [
    {
      title: "Women's Elite Volleyball",
      image: "/womens-elite-card.jpg",
      alt: "Elite womens volleyball",
      link: "/leagues?sport=Volleyball&level=Elite&gender=Female",
    },
    {
      title: "Mixed Volleyball",
      image: "/571North-CR3_0335-Indoor-VB-Header-Featured.jpg",
      alt: "Indoor coed volleyball",
      link: "/leagues?sport=Volleyball&gender=Mixed",
    },
    {
      title: "Advanced Badminton",
      image: "/badminton-card.png",
      alt: "Advanced badminton",
      link: "/leagues?sport=Badminton&level=Advanced",
    },
    {
      title: "Indoor Pickleball",
      image: "/pickleball-card.jpg",
      alt: "Pickleball",
      link: "/pickleball",
    },
    {
      title: "Competitive Badminton",
      image: "/competitive badminton.jpg",
      alt: "Competitive badminton players",
      link: "/leagues?sport=Badminton&level=Competitive",
    },
    {
      title: "Women's Volleyball",
      image: "/Monday Wonems.png",
      alt: "Womens volleyball",
      link: "/leagues?sport=Volleyball&gender=Female",
    },
    {
      title: "Men's Volleyball",
      image: "/mens-volleyball.jpg",
      alt: "Mens volleyball",
      link: "/leagues?sport=Volleyball&gender=Male",
    },
  ],
  highlightCard: {
    title: "Skills and Drills",
    description: "Led by James Battiston, former member of the Canadian Beach National Team.",
    icon: "/rebase-24dp-000000-fill0-wght300-grad0-opsz24-1.svg",
    buttonText: "Learn more",
    buttonLink: "/skills-and-drills",
  },
  featureSections: [
    {
      title: "Skills and drills",
      description:
        "Whether you're just starting out or a seasoned player aiming to refine your fundamentals, elevate your skills with OFSL's Skills & Drills Program, led by James Battiston, former professional volleyball player and Canadian Beach National Team member. Learn from one of the best and take your game to the next level!",
      image: "/group-2-1.png",
      imageAlt: "Skills and drills",
      linkText: "Sign me up",
      linkUrl: "/skills-and-drills",
    },
    {
      title: "About us",
      description:
        "The Ottawa Fun Sports League (OFSL) is dedicated to promoting active living and healthy lifestyles for youth and adults—while keeping fun at the heart of it all. Throughout the year, we organize a variety of tournaments and teams, creating opportunities to connect, compete, and celebrate community through sport.",
      image: "/OFSL wed league winner 2025.png",
      imageAlt: "About us",
      linkText: "More about us",
      linkUrl: "/about-us",
    },
  ],
  cta: {
    title: "Ready to play?",
    subtitle: "Join thousands of athletes in our community.",
    buttonText: "Register now",
    buttonLink: "/leagues",
    background: "linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)",
  },
};

export const HomePage = (): React.ReactElement => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [content, setContent] = useState<HomePageContent>(DEFAULT_HOME_CONTENT);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const bannerItems = useMemo(() => {
    const items: Array<{ type: "partner" | "sponsor" }> = [];

    if (
      content.sponsorBanner.logo ||
      content.sponsorBanner.logoAlt ||
      content.sponsorBanner.title ||
      content.sponsorBanner.description ||
      content.sponsorBanner.primaryLinkText ||
      content.sponsorBanner.primaryLinkUrl
    ) {
      items.push({ type: "sponsor" });
    }

    if (
      content.partner.logo ||
      content.partner.logoAlt ||
      content.partner.text ||
      content.partner.linkText ||
      content.partner.linkUrl
    ) {
      items.push({ type: "partner" });
    }

    return items;
  }, [content.partner, content.sponsorBanner]);

  useEffect(() => {
    setActiveBannerIndex(0);
  }, [bannerItems.length]);

  useEffect(() => {
    if (bannerItems.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % bannerItems.length);
    }, 9000);

    return () => window.clearInterval(intervalId);
  }, [bannerItems.length]);

  const BannerCard = ({ itemType }: { itemType: "partner" | "sponsor" }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }, []);

    const baseClassName =
      "w-full rounded-2xl border border-gray-200 bg-white px-5 py-6 shadow-sm transition-all duration-500 ease-out md:px-8 md:py-6 min-h-[200px] flex items-center";
    const animatedState = isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3";

    if (itemType === "partner") {
      return (
        <div className={`${baseClassName} ${animatedState}`}>
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-7 w-full">
            <img
              className="h-auto w-[150px] md:w-[180px] object-contain"
              alt={content.partner.logoAlt}
              src={content.partner.logo}
            />
            <div className="text-center md:text-left space-y-2 w-full">
              <p className="text-sm leading-6 text-[#6f6f6f] md:text-base md:leading-7">
                {content.partner.text}
              </p>
              {content.partner.linkUrl && content.partner.linkText ? (
                <a
                  href={content.partner.linkUrl}
                  className="mt-2 inline-block text-sm font-semibold text-[#b20000] underline md:text-base"
                >
                  {content.partner.linkText}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${baseClassName} ${animatedState}`}>
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-7 w-full">
          <img
            src={content.sponsorBanner.logo}
            alt={content.sponsorBanner.logoAlt}
            className="h-auto w-[150px] md:w-[180px] object-contain"
          />
          <div className="flex-1 text-center md:text-left space-y-2">
            <p className="text-sm text-[#4B5563] md:text-base leading-6 md:leading-7">
              {content.sponsorBanner.description}{" "}
              {content.sponsorBanner.primaryLinkUrl && content.sponsorBanner.primaryLinkText ? (
                <a
                  href={content.sponsorBanner.primaryLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#B20000] underline"
                >
                  {content.sponsorBanner.primaryLinkText}
                </a>
              ) : null}
              {content.sponsorBanner.secondaryText ? (
                <span className="mt-1 block text-xs text-[#6F6F6F] md:text-sm">
                  {content.sponsorBanner.secondaryText}{" "}
                  {content.sponsorBanner.secondaryLinkUrl &&
                  content.sponsorBanner.secondaryLinkText ? (
                    <a
                      href={content.sponsorBanner.secondaryLinkUrl}
                      className="font-semibold text-[#B20000] underline"
                    >
                      {content.sponsorBanner.secondaryLinkText}
                    </a>
                  ) : null}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    setIsDragging(true);
    setHasDragged(false);
    setDragDistance(0);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = "grabbing";

    e.preventDefault();
  };

  const handleMouseLeave = () => {
    if (!isDragging) return;

    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
    }

    if (dragDistance > 5) {
      setHasDragged(true);
      setTimeout(() => {
        setHasDragged(false);
      }, 300);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = x - startX;

    setDragDistance(Math.abs(walk));
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;

    setIsDragging(true);
    setHasDragged(false);
    setDragDistance(0);
    setStartX(e.touches[0].clientX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const x = e.touches[0].clientX - scrollContainerRef.current.offsetLeft;
    const walk = x - startX;

    setDragDistance(Math.abs(walk));
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (dragDistance > 5) {
      setHasDragged(true);
      setTimeout(() => {
        setHasDragged(false);
      }, 300);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.style.cursor = "grab";
        }
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const controller = new AbortController();

    fetchPageContent<HomePageContent>("home", DEFAULT_HOME_CONTENT, controller.signal).then(
      (data) => {
        setContent(data);
      },
    );

    return () => {
      controller.abort();
    };
  }, []);

  const scrollCarousel = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const cardWidth = 280 + 24;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;

    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });

    setTimeout(() => {
      handleScroll();
    }, 300);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const isAtStart = container.scrollLeft <= 0;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;

      setShowLeftButton(!isAtStart);
      setShowRightButton(!isAtEnd);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll();
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
    return undefined;
  }, []);

  return (
    <div className="bg-white w-full">
      <HeroBanner
        image={content.hero.image}
        imageAlt={content.hero.imageAlt}
        containerClassName={content.hero.containerClassName}
      >
        <div className="text-center text-white max-w-[860px] px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4 md:mb-6 font-heading font-bold">
            {content.hero.title}
          </h1>
          <p className="text-base md:text-lg lg:text-xl">{content.hero.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-12 justify-center">
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

      <div className="max-w-[1280px] mx-auto px-4">
        <div className="pt-8 md:pt-12 pb-8 md:pb-12">
          <div className="mx-auto flex max-w-[880px] flex-col items-center gap-5 px-4">
            {bannerItems.length > 0 ? (
              <>
                <BannerCard
                  key={`banner-${bannerItems[activeBannerIndex]?.type ?? "partner"}-${activeBannerIndex}`}
                  itemType={bannerItems[activeBannerIndex]?.type ?? "partner"}
                />
                {bannerItems.length > 1 ? (
                  <div className="flex items-center gap-3">
                    {bannerItems.map((item, index) => (
                      <button
                        key={`${item.type}-${index}`}
                        type="button"
                        onClick={() => setActiveBannerIndex(index)}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          index === activeBannerIndex ? "bg-[#B20000]" : "bg-gray-300"
                        }`}
                        aria-label={`Show ${
                          item.type === "partner" ? "partner highlight" : "sponsor highlight"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="text-center mb-16 md:mb-24">
          <p className="max-w-[1080px] mx-auto font-normal text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7">
            {content.leagueDescription}
          </p>
        </div>
      </div>

      <div className="w-full mb-8 md:mb-12">
        <div className="max-w-[1280px] mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#6F6F6F] mb-8">Popular Leagues</h2>
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin"
              onMouseDown={handleMouseDown}
              onScroll={handleScroll}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                cursor: "grab",
                scrollBehavior: "auto",
                paddingTop: "10px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {content.popularLeagues.map((card, index) => (
                <Link
                  key={`${card.title}-${index}`}
                  to={card.link}
                  className="block transition-transform duration-300 hover:scale-105 hover:shadow-lg rounded-lg flex-shrink-0 w-[280px] md:w-[calc((100%-72px)/4)]"
                  style={{ transformOrigin: "center center" }}
                  onClick={(e) => {
                    if (isDragging || hasDragged) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Card className="border-none overflow-hidden h-full rounded-lg">
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          className="w-full h-[400px] object-cover rounded-t-lg"
                          alt={card.alt}
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

            {showLeftButton && (
              <div
                onClick={() => scrollCarousel("left")}
                className="hidden md:block absolute -left-12 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-lg cursor-pointer hover:bg-gray-50 z-20 transition-all hover:scale-110 border border-gray-200"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#B20000]"
                  >
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </div>
              </div>
            )}

            {showRightButton && (
              <div
                onClick={() => scrollCarousel("right")}
                className="hidden md:block absolute -right-12 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-lg cursor-pointer hover:bg-gray-50 z-20 transition-all hover:scale-110 border border-gray-200"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#B20000]"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4">
        <Card className="bg-[#b20000] rounded-lg mb-16 md:mb-24">
          <CardContent className="flex flex-col md:flex-row items-center p-6 md:p-8 gap-6">
            {content.highlightCard.icon ? (
              <img
                className="w-[60px] h-[60px] md:w-[86px] md:h-[86px] rounded-lg"
                alt=""
                src={content.highlightCard.icon}
              />
            ) : null}
            <div className="md:ml-6 flex-1 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                {content.highlightCard.title}
              </h2>
              <p className="text-white text-base md:text-lg leading-6 md:leading-7">
                {content.highlightCard.description}
              </p>
            </div>
            <Link to={content.highlightCard.buttonLink}>
              <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5 w-full md:w-auto">
                <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                  {content.highlightCard.buttonText}
                </span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16 md:mb-24">
          {content.featureSections.map((section) => (
            <div key={section.title} className="flex flex-col">
              <img
                className="w-full h-[250px] sm:h-[300px] md:h-[438px] object-cover mb-6 md:mb-8 rounded-lg"
                alt={section.imageAlt}
                src={section.image}
              />
              <div>
                <h2 className="font-bold text-[#6f6f6f] text-xl md:text-2xl lg:text-[32px] leading-7 mb-4 md:mb-6">
                  {section.title}
                </h2>
                <p className="text-[#6f6f6f] text-base md:text-lg leading-6 md:leading-7 mb-6 md:mb-8">
                  {section.description}
                </p>
                <Link
                  to={section.linkUrl}
                  className="text-base md:text-lg text-[#b20000] underline font-bold"
                >
                  {section.linkText}
                </Link>
              </div>
            </div>
          ))}
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
            <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5">
              <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                {content.cta.buttonText}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
