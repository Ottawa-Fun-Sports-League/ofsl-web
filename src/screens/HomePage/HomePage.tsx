import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeroBanner } from "../../components/HeroBanner";
import { fetchPageContent } from "../../lib/pageContent";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroButton {
  text: string;
  link: string;
}

export interface HeroSlide {
  image: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  buttons: HeroButton[];
}

export interface HeroCarouselContent {
  containerClassName: string;
  slides: HeroSlide[];
  autoRotateSeconds?: number | null;
}

export interface HomePageContent {
  hero: HeroCarouselContent;
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

const HERO_AUTOROTATE_DEFAULT_SECONDS = 8;

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    image: "/mask-group.png",
    imageAlt: "Volleyball players",
    title: "Welcome to OFSL!",
    subtitle:
      "Ottawa's leading adult volleyball and badminton league—where sportsmanship meets healthy competition from competitive to intermediate levels.",
    buttons: [
      { text: "Womens Elite", link: "/volleyball" },
      { text: "Register Now", link: "/leagues" },
      { text: "Tournaments", link: "/tournaments" },
    ],
  },
  {
    image: "/group-2-1.png",
    imageAlt: "Athletes practicing volleyball skills",
    title: "Fuel Your Competitive Edge",
    subtitle:
      "Level up with our Skills & Drills programs led by former national team athletes and veteran coaches.",
    buttons: [
      { text: "Skills & Drills", link: "/skills-and-drills" },
      { text: "Explore Leagues", link: "/leagues" },
      { text: "Upcoming Events", link: "/tournaments" },
    ],
  },
];

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero: {
    containerClassName: "h-[450px] md:h-[604px]",
    slides: DEFAULT_HERO_SLIDES,
    autoRotateSeconds: HERO_AUTOROTATE_DEFAULT_SECONDS,
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

const HERO_MIN_AUTOROTATE_SECONDS = 3;

type LegacyHeroContent = {
  image?: unknown;
  imageAlt?: unknown;
  title?: unknown;
  subtitle?: unknown;
  buttons?: unknown;
  containerClassName?: unknown;
  autoRotateSeconds?: unknown;
};

type HeroLike = Partial<HeroCarouselContent> & LegacyHeroContent & Record<string, unknown>;

function sanitizeHeroButtons(buttons: unknown): HeroButton[] {
  if (!Array.isArray(buttons)) {
    return [];
  }

  return buttons
    .map((button) => {
      if (!button || typeof button !== "object") {
        return null;
      }

      const { text, link } = button as { text?: unknown; link?: unknown };
      const safeText = typeof text === "string" ? text : "";
      const safeLink = typeof link === "string" ? link : "";

      return { text: safeText, link: safeLink };
    })
    .filter((button): button is HeroButton => button !== null);
}

function cloneDefaultSlide(index: number): HeroSlide {
  const fallbackSlide = DEFAULT_HOME_CONTENT.hero.slides[index] ?? DEFAULT_HOME_CONTENT.hero.slides[0];
  return {
    image: fallbackSlide.image,
    imageAlt: fallbackSlide.imageAlt,
    title: fallbackSlide.title,
    subtitle: fallbackSlide.subtitle,
    buttons: fallbackSlide.buttons.map((button) => ({ ...button })),
  };
}

function normalizeHeroCarousel(hero: unknown): HeroCarouselContent {
  if (!hero || typeof hero !== "object") {
    return {
      ...DEFAULT_HOME_CONTENT.hero,
      slides: DEFAULT_HOME_CONTENT.hero.slides.map((slide) => ({
        ...slide,
        buttons: slide.buttons.map((button) => ({ ...button })),
      })),
    };
  }

  const heroLike = hero as HeroLike;
  const resolvedContainerClassName =
    typeof heroLike.containerClassName === "string" && heroLike.containerClassName.trim().length > 0
      ? heroLike.containerClassName
      : DEFAULT_HOME_CONTENT.hero.containerClassName;

  const resolvedAutoRotate =
    typeof heroLike.autoRotateSeconds === "number" &&
    Number.isFinite(heroLike.autoRotateSeconds) &&
    heroLike.autoRotateSeconds >= HERO_MIN_AUTOROTATE_SECONDS
      ? heroLike.autoRotateSeconds
      : DEFAULT_HOME_CONTENT.hero.autoRotateSeconds ?? HERO_AUTOROTATE_DEFAULT_SECONDS;

  let rawSlides: unknown = heroLike.slides;

  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    rawSlides = [
      {
        image: heroLike.image,
        imageAlt: heroLike.imageAlt,
        title: heroLike.title,
        subtitle: heroLike.subtitle,
        buttons: heroLike.buttons,
      },
    ];
  }

  const normalizedSlides = (rawSlides as unknown[])
    .map((slide, index) => {
      if (!slide || typeof slide !== "object") {
        return cloneDefaultSlide(index);
      }

      const slideRecord = slide as Record<string, unknown>;
      const fallbackSlide = cloneDefaultSlide(index);

      const resolvedImage =
        typeof slideRecord.image === "string" && slideRecord.image.trim().length > 0
          ? slideRecord.image
          : fallbackSlide.image;
      const resolvedImageAlt =
        typeof slideRecord.imageAlt === "string" && slideRecord.imageAlt.trim().length > 0
          ? slideRecord.imageAlt
          : fallbackSlide.imageAlt;
      const resolvedTitle =
        typeof slideRecord.title === "string" && slideRecord.title.trim().length > 0
          ? slideRecord.title
          : fallbackSlide.title;
      const resolvedSubtitle =
        typeof slideRecord.subtitle === "string" && slideRecord.subtitle.trim().length > 0
          ? slideRecord.subtitle
          : fallbackSlide.subtitle;
      const resolvedButtons = sanitizeHeroButtons(slideRecord.buttons ?? fallbackSlide.buttons);

      return {
        image: resolvedImage,
        imageAlt: resolvedImageAlt,
        title: resolvedTitle,
        subtitle: resolvedSubtitle,
        buttons: resolvedButtons,
      };
    })
    .filter((slide): slide is HeroSlide => Boolean(slide));

  const slides = normalizedSlides.length > 0 ? normalizedSlides : DEFAULT_HOME_CONTENT.hero.slides.map(cloneDefaultSlide);

  return {
    containerClassName: resolvedContainerClassName,
    slides,
    autoRotateSeconds: resolvedAutoRotate,
  };
}

export function normalizeHomePageContent(content: HomePageContent): HomePageContent {
  const safeContent = content ?? DEFAULT_HOME_CONTENT;
  const heroInput = (safeContent as unknown as { hero?: unknown }).hero;
  return {
    ...safeContent,
    hero: normalizeHeroCarousel(heroInput),
  };
}

function HeroCarousel({ hero }: { hero: HeroCarouselContent }) {
  const resolvedSlides =
    hero.slides && hero.slides.length > 0 ? hero.slides : DEFAULT_HOME_CONTENT.hero.slides;
  const containerClassName =
    typeof hero.containerClassName === "string" && hero.containerClassName.trim().length > 0
      ? hero.containerClassName
      : DEFAULT_HOME_CONTENT.hero.containerClassName;
  const autoRotateSeconds =
    typeof hero.autoRotateSeconds === "number" &&
    Number.isFinite(hero.autoRotateSeconds) &&
    hero.autoRotateSeconds >= HERO_MIN_AUTOROTATE_SECONDS
      ? hero.autoRotateSeconds
      : DEFAULT_HOME_CONTENT.hero.autoRotateSeconds ?? HERO_AUTOROTATE_DEFAULT_SECONDS;
  const autoRotateMs = Math.max(autoRotateSeconds, HERO_MIN_AUTOROTATE_SECONDS) * 1000;

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [resolvedSlides.length]);

  useEffect(() => {
    if (resolvedSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % resolvedSlides.length);
    }, autoRotateMs);

    return () => window.clearInterval(intervalId);
  }, [resolvedSlides.length, autoRotateMs]);

  const stepSlide = (offset: number) => {
    setActiveSlideIndex((prev) => {
      const nextIndex = (prev + offset + resolvedSlides.length) % resolvedSlides.length;
      return nextIndex;
    });
  };

  return (
    <div className={`relative w-full overflow-hidden ${containerClassName}`}>
      {resolvedSlides.map((slide, index) => (
        <div
          key={`${slide.title}-${index}`}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            index === activeSlideIndex ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <HeroBanner
            image={slide.image}
            imageAlt={slide.imageAlt}
            containerClassName="h-full"
          >
          <div className="text-center text-white max-w-[860px] px-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4 md:mb-6 font-heading font-bold">
                {slide.title}
              </h1>
              <p className="text-base md:text-lg lg:text-xl">{slide.subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-12 justify-center">
                {slide.buttons
                  .filter((button) => button.text.trim().length > 0 && button.link.trim().length > 0)
                  .map((button) => (
                    <Link key={`${button.text}-${button.link}`} to={button.link} className="w-full sm:w-auto">
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
        </div>
      ))}

      {resolvedSlides.length > 1 ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-8 left-0 w-32 bg-gradient-to-r from-black/35 via-black/10 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-8 right-0 w-32 bg-gradient-to-l from-black/35 via-black/10 to-transparent"
          />
          <button
            type="button"
            onClick={() => stepSlide(-1)}
            className="absolute left-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
            aria-label="Previous banner"
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => stepSlide(1)}
            className="absolute right-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
            aria-label="Next banner"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
            {resolvedSlides.map((slide, index) => (
              <button
                key={`hero-dot-${slide.title}-${index}`}
                type="button"
                aria-label={`Go to banner ${index + 1}`}
                onClick={() => setActiveSlideIndex(index)}
                className={`h-3 w-3 rounded-full border border-white/70 transition-all ${
                  index === activeSlideIndex ? "scale-110 bg-white" : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export const HomePage = (): React.ReactElement => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [contentStatus, setContentStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const effectiveContent = content ?? DEFAULT_HOME_CONTENT;

  const bannerItems = useMemo(() => {
    const items: Array<{ type: "partner" | "sponsor" }> = [];

    if (
      effectiveContent.sponsorBanner.logo ||
      effectiveContent.sponsorBanner.logoAlt ||
      effectiveContent.sponsorBanner.title ||
      effectiveContent.sponsorBanner.description ||
      effectiveContent.sponsorBanner.primaryLinkText ||
      effectiveContent.sponsorBanner.primaryLinkUrl
    ) {
      items.push({ type: "sponsor" });
    }

    if (
      effectiveContent.partner.logo ||
      effectiveContent.partner.logoAlt ||
      effectiveContent.partner.text ||
      effectiveContent.partner.linkText ||
      effectiveContent.partner.linkUrl
    ) {
      items.push({ type: "partner" });
    }

    return items;
  }, [effectiveContent.partner, effectiveContent.sponsorBanner]);

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
              alt={effectiveContent.partner.logoAlt}
              src={effectiveContent.partner.logo}
            />
            <div className="text-center md:text-left space-y-2 w-full">
              <p className="text-sm leading-6 text-[#6f6f6f] md:text-base md:leading-7">
                {effectiveContent.partner.text}
              </p>
              {effectiveContent.partner.linkUrl && effectiveContent.partner.linkText ? (
                <a
                  href={effectiveContent.partner.linkUrl}
                  className="mt-2 inline-block text-sm font-semibold text-[#b20000] underline md:text-base"
                >
                  {effectiveContent.partner.linkText}
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
            src={effectiveContent.sponsorBanner.logo}
            alt={effectiveContent.sponsorBanner.logoAlt}
            className="h-auto w-[150px] md:w-[180px] object-contain"
          />
          <div className="flex-1 text-center md:text-left space-y-2">
            <p className="text-sm text-[#4B5563] md:text-base leading-6 md:leading-7">
              {effectiveContent.sponsorBanner.description}{" "}
              {effectiveContent.sponsorBanner.primaryLinkUrl && effectiveContent.sponsorBanner.primaryLinkText ? (
                <a
                  href={effectiveContent.sponsorBanner.primaryLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#B20000] underline"
                >
                  {effectiveContent.sponsorBanner.primaryLinkText}
                </a>
              ) : null}
              {effectiveContent.sponsorBanner.secondaryText ? (
                <span className="mt-1 block text-xs text-[#6F6F6F] md:text-sm">
                  {effectiveContent.sponsorBanner.secondaryText}{" "}
                  {effectiveContent.sponsorBanner.secondaryLinkUrl &&
                  effectiveContent.sponsorBanner.secondaryLinkText ? (
                    <a
                      href={effectiveContent.sponsorBanner.secondaryLinkUrl}
                      className="font-semibold text-[#B20000] underline"
                    >
                      {effectiveContent.sponsorBanner.secondaryLinkText}
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
    let isMounted = true;

    fetchPageContent<HomePageContent>("home", DEFAULT_HOME_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        setContent(normalizeHomePageContent(data));
        setContentStatus("ready");
      })
      .catch((error) => {
        if ((error as Error | undefined)?.name === "AbortError") {
          return;
        }
        console.error("Failed to load home page content", error);
        if (!isMounted) return;
        setContent(normalizeHomePageContent(DEFAULT_HOME_CONTENT));
        setContentStatus("error");
      });

    return () => {
        isMounted = false;
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
      {contentStatus === "loading" ? (
        <div className={`${DEFAULT_HOME_CONTENT.hero.containerClassName} relative w-full overflow-hidden bg-gray-200`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />
        </div>
      ) : (
        <HeroCarousel hero={effectiveContent.hero} />
      )}

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
            {effectiveContent.leagueDescription}
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
              {effectiveContent.popularLeagues.map((card, index) => (
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
            {effectiveContent.highlightCard.icon ? (
              <img
                className="w-[60px] h-[60px] md:w-[86px] md:h-[86px] rounded-lg"
                alt=""
                src={effectiveContent.highlightCard.icon}
              />
            ) : null}
            <div className="md:ml-6 flex-1 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                {effectiveContent.highlightCard.title}
              </h2>
              <p className="text-white text-base md:text-lg leading-6 md:leading-7">
                {effectiveContent.highlightCard.description}
              </p>
            </div>
            <Link to={effectiveContent.highlightCard.buttonLink}>
              <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5 w-full md:w-auto">
                <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                  {effectiveContent.highlightCard.buttonText}
                </span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16 md:mb-24">
          {effectiveContent.featureSections.map((section) => (
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
          background: effectiveContent.cta.background,
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{effectiveContent.cta.title}</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">{effectiveContent.cta.subtitle}</p>
          <Link to={effectiveContent.cta.buttonLink}>
            <Button className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5">
              <span className="text-base md:text-lg text-[#b20000] hover:text-white">
                {effectiveContent.cta.buttonText}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
