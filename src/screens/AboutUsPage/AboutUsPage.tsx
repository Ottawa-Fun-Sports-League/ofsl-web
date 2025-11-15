import React, { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";

import { HeroBanner } from "../../components/HeroBanner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { useToast } from "../../components/ui/toast";
import { fetchPageContent } from "../../lib/pageContent";
import { logger } from "../../lib/logger";

type InterestKey = "volleyball" | "badminton" | "basketball" | "pickleball";

export interface StatBlock {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}

export interface AboutUsPageContent {
  hero: {
    image: string;
    imageAlt: string;
    title: string;
    subtitle: string;
  };
  stats: StatBlock[];
  mission: {
    title: string;
    description: string;
    image: string;
    imageAlt: string;
  };
  story: {
    title: string;
    paragraphs: string[];
    image: string;
    imageAlt: string;
  };
  partners: {
    title: string;
    description: string;
  };
  diabetes: {
    image: string;
    imageAlt: string;
    logoImage: string;
    logoAlt: string;
    description: string;
    linkText: string;
    linkHref: string;
  };
  contact: {
    cardTitle: string;
    generalLabel: string;
    generalEmail: string;
    formTitle: string;
    submitButtonText: string;
  };
  newsletter: {
    title: string;
    description: string;
    interestsLabel: string;
    subscribeButtonText: string;
    termsText: string;
    termsLinkText: string;
    termsLinkUrl: string;
  };
}

export const DEFAULT_ABOUT_US_CONTENT: AboutUsPageContent = {
  hero: {
    image: "/AdobeStock_252945543_50.jpeg",
    imageAlt: "Volleyball court with ball",
    title: "About Us",
    subtitle:
      "Founded in 2010, The Ottawa Fun Sports League (OFSL) is a volunteer-run, non-profit organization dedicated to making a meaningful impact in the Ottawa community through sport and recreation.",
  },
  stats: [
    { value: 1800, label: "Weekly players", suffix: "+" },
    { value: 15, label: "Years of operation", suffix: "+" },
    { value: 260, label: "Volleyball teams", suffix: "+" },
    { value: 85, label: "Raised for charities", prefix: "$", suffix: "K+" },
  ],
  mission: {
    title: "Our Mission",
    description:
      "Our mission is to create inclusive, affordable, and enjoyable opportunities for individuals of all ages to stay active, meet new people, and live a healthy lifestyle, while having fun at the same time. We are dedicated to creating a welcoming environment where people of all skill levels can enjoy sports, make connections, and build community.",
    image: "/AdobeStock_80339042.jpeg",
    imageAlt: "OFSL Community in Action",
  },
  story: {
    title: "Our Story",
    paragraphs: [
      "Founded in 2010 by a group of sports enthusiasts who wanted to create more accessible recreational opportunities in Ottawa, OFSL began with just two volleyball courts and 48 players.",
      "Today, we've grown to serve over 2,000 participants across multiple sports including volleyball, badminton, pickleball, and basketball. Our focus has always been on creating a balance of competitive play and inclusive fun that welcomes players of all backgrounds.",
    ],
    image: "/OFSL wed league winner 2025.png",
    imageAlt: "OFSL Community",
  },
  partners: {
    title: "Our Partners",
    description:
      "Partnering with us is a great way to connect with an active, engaged community while supporting local sports and wellness. Together, we can create meaningful experiences and drive mutual growth.",
  },
  diabetes: {
    image:
      "https://www.diabetes.ca/getmedia/8a392c10-ebc4-4b97-977f-efae3259cc54/homepage-resources_1.jpg?width=725&height=483&ext=.jpg",
    imageAlt: "Diabetes Canada Outreach",
    logoImage: "/diabetes-canada-logo-svg-1.png",
    logoAlt: "Diabetes Canada",
    description:
      "Diabetes Canada works tirelessly to advocate for and support Canadians living with diabetes with helpful resources, education, research, and more. We work to help Canadians better manage the disease and avoid long-term complications with comprehensive resources, education, and support.",
    linkText: "Learn more",
    linkHref: "https://www.diabetes.ca",
  },
  contact: {
    cardTitle: "Contact Us",
    generalLabel: "General inquiries",
    generalEmail: "info@ofsl.ca",
    formTitle: "Send Us a Message",
    submitButtonText: "Send Message",
  },
  newsletter: {
    title: "Newsletter",
    description: "Get regular updates about our league.",
    interestsLabel: "I'm interested in:",
    subscribeButtonText: "Subscribe",
    termsText: "I agree to receive email newsletters and accept the",
    termsLinkText: "terms and conditions",
    termsLinkUrl: "#",
  },
};

export const AboutUsPage = (): React.ReactElement => {
  const { showToast } = useToast();

  const [content, setContent] = useState<AboutUsPageContent>(DEFAULT_ABOUT_US_CONTENT);
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<Record<InterestKey, boolean>>({
    volleyball: false,
    badminton: false,
    basketball: false,
    pickleball: false,
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<null | "success" | "error">(null);
  const [counts, setCounts] = useState<number[]>(
    () => DEFAULT_ABOUT_US_CONTENT.stats.map(() => 0),
  );
  const [animationStarted, setAnimationStarted] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    fetchPageContent<AboutUsPageContent>("about-us", DEFAULT_ABOUT_US_CONTENT)
      .then((data) => {
        if (!isMounted) return;
        setContent(data);
      })
      .catch((error) => {
        logger.error("Failed to load About Us content", error as Error);
        if (isMounted) {
          setContent(DEFAULT_ABOUT_US_CONTENT);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCounts(content.stats.map(() => 0));
    setAnimationStarted(false);
  }, [content.stats]);

  const handleContactInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-contact-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(contactForm),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Contact form error:", data);
        setSubmitStatus("error");
        if (data.error === "Too many requests. Please try again later.") {
          showToast("Too many requests. Please try again in an hour.", "error");
        } else if (data.details) {
          showToast(data.details.join(", "), "error");
        } else {
          showToast(data.error || "Failed to send message", "error");
        }
        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
        return;
      }

      setSubmitStatus("success");
      showToast(data.message || "Thank you for your message! We'll get back to you soon.", "success");

      setTimeout(() => {
        setContactForm({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
        setSubmitStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Error sending contact form:", error);
      setSubmitStatus("error");
      showToast("Network error. Please check your connection and try again.", "error");
      setTimeout(() => {
        setSubmitStatus(null);
      }, 5000);
    }
  };

  const handleInterestChange = (sport: InterestKey) => {
    setInterests((prev) => ({
      ...prev,
      [sport]: !prev[sport],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
    setInterests({
      volleyball: false,
      badminton: false,
      basketball: false,
      pickleball: false,
    });
    setAgreeToTerms(false);
    showToast("Thank you for subscribing to our newsletter!", "success");
  };

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !animationStarted) {
        setAnimationStarted(true);
      }
    }, options);

    const currentStatsRef = statsRef.current;
    if (currentStatsRef) {
      observerRef.current.observe(currentStatsRef);
    }

    return () => {
      if (observerRef.current && currentStatsRef) {
        observerRef.current.unobserve(currentStatsRef);
        observerRef.current.disconnect();
      }
    };
  }, [animationStarted]);

  useEffect(() => {
    if (!animationStarted || content.stats.length === 0) return;

    const duration = 2000;
    const interval = 16;
    const steps = duration / interval;

    let currentStep = 0;
    const finalValues = content.stats.map((stat) => stat.value);

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / steps, 1);

      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const newCounts = finalValues.map((value) => Math.round(easedProgress * value));
      setCounts(newCounts);

      if (currentStep >= steps) {
        clearInterval(timer);
        setCounts(finalValues);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [animationStarted, content.stats]);

  return (
    <div className="bg-white w-full">
      <HeroBanner image={content.hero.image} imageAlt={content.hero.imageAlt} containerClassName="h-[250px]">
        <div className="text-center text-white">
          <h1 className="text-5xl mb-4 font-heading">{content.hero.title}</h1>
          <p className="text-xl max-w-2xl mx-auto">{content.hero.subtitle}</p>
        </div>
      </HeroBanner>

      <div ref={statsRef} className="max-w-[1280px] mx-auto px-4 pt-12 md:pt-16 pb-8 md:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 text-center">
          {content.stats.map((stat, index) => {
            const displayValue = counts[index] ?? stat.value;
            return (
              <div key={`${stat.label}-${index}`}>
                <div className="text-[#B20000] text-5xl font-bold mb-2">
                  {stat.prefix ?? ""}
                  {displayValue}
                  {stat.suffix ?? ""}
                </div>
                <p className="text-[#6F6F6F] text-lg">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-6">{content.mission.title}</h2>
            <p className="text-lg text-[#6F6F6F]">{content.mission.description}</p>
          </div>
          <div>
            <img
              src={content.mission.image}
              alt={content.mission.imageAlt}
              className="w-full h-[350px] object-cover rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
          <div>
            <img
              src={content.story.image}
              alt={content.story.imageAlt}
              className="w-full h-[350px] object-cover object-top rounded-lg"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-6">{content.story.title}</h2>
            {content.story.paragraphs.map((paragraph, index) => (
              <p key={index} className={`text-lg text-[#6F6F6F] ${index === 0 ? "mb-6" : ""}`}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <Separator className="mb-20 md:mb-28" />

        <div id="partners-section" className="mb-20 md:mb-28">
          <h2 className="text-3xl font-bold text-[#6F6F6F] mb-8 text-center">{content.partners.title}</h2>
          <p className="text-lg text-[#6F6F6F] max-w-3xl mx-auto text-center">{content.partners.description}</p>
        </div>

        <div id="diabetes-canada-section" className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
          <div className="flex items-center justify-center">
            <img
              src={content.diabetes.image}
              alt={content.diabetes.imageAlt}
              className="w-full h-auto object-cover rounded-lg shadow-lg"
            />
          </div>

          <div className="flex flex-col justify-center">
            <img
              src={content.diabetes.logoImage}
              alt={content.diabetes.logoAlt}
              className="w-[180px] h-auto object-contain mb-6"
            />
            <p className="text-lg text-[#6F6F6F]">
              {content.diabetes.description}{" "}
              <a
                href={content.diabetes.linkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B20000] underline"
              >
                {content.diabetes.linkText}
              </a>
            </p>
          </div>
        </div>

        <div id="contact-section">
          <Card className="bg-[#ffeae5] rounded-lg shadow-none border-none mb-20 md:mb-28">
            <CardContent className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <div className="flex flex-col items-center md:items-start">
                      <Mail className="w-[40px] h-[40px] text-[#B20000] mb-3" />
                      <h2 className="text-xl md:text-2xl font-bold text-[#6F6F6F] mb-4">
                        {content.contact.cardTitle}
                      </h2>
                      <div>
                        <p className="text-[#6F6F6F] font-bold mb-1">{content.contact.generalLabel}</p>
                        <a
                          href={`mailto:${content.contact.generalEmail}`}
                          className="text-[#B20000] hover:underline"
                        >
                          {content.contact.generalEmail}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow" />
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-xl font-bold text-[#6F6F6F] mb-4">{content.contact.formTitle}</h3>

                  {submitStatus === "success" && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                      Thank you for your message! We'll get back to you soon.
                    </div>
                  )}

                  {submitStatus === "error" && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                      There was an error sending your message. Please try again.
                    </div>
                  )}

                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-[#6F6F6F] mb-1">
                          Your Name *
                        </label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          value={contactForm.name}
                          onChange={handleContactInputChange}
                          placeholder="Enter your full name"
                          className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000] bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[#6F6F6F] mb-1">
                          Email Address *
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={contactForm.email}
                          onChange={handleContactInputChange}
                          placeholder="name@email.com"
                          className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000] bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-[#6F6F6F] mb-1">
                        Subject *
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        value={contactForm.subject}
                        onChange={handleContactInputChange}
                        placeholder="What is your message about?"
                        className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000] bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-[#6F6F6F] mb-1">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        value={contactForm.message}
                        onChange={handleContactInputChange}
                        placeholder="Please type your message here..."
                        className="w-full px-4 py-3 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000] focus:outline-none resize-none bg-white"
                        required
                      ></textarea>
                    </div>

                    <Button
                      type="submit"
                      className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base px-8 py-2.5"
                    >
                      {content.contact.submitButtonText}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for optional FAQ section */}
      </div>

      <div id="newsletter-section" className="bg-gray-50 py-16">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="max-w-[600px] mx-auto">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-4 text-center">{content.newsletter.title}</h2>
            <p className="text-lg text-[#6F6F6F] text-center mb-8">{content.newsletter.description}</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                  required
                />
              </div>

              <div>
                <p className="text-[#6F6F6F] mb-3">{content.newsletter.interestsLabel}</p>
                <div className="flex flex-row flex-wrap gap-6">
                  {(
                    [
                      { id: "volleyball", label: "Volleyball" },
                      { id: "badminton", label: "Badminton" },
                      { id: "basketball", label: "Basketball" },
                      { id: "pickleball", label: "Pickleball" },
                    ] as Array<{ id: InterestKey; label: string }>
                  ).map((option) => (
                    <div key={option.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={option.id}
                        checked={interests[option.id]}
                        onChange={() => handleInterestChange(option.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                      />
                      <label htmlFor={option.id} className="ml-2 text-[#6F6F6F]">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
              >
                {content.newsletter.subscribeButtonText}
              </Button>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={() => setAgreeToTerms(!agreeToTerms)}
                    className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    required
                  />
                </div>
                <label htmlFor="terms" className="ml-2 text-sm text-[#6F6F6F]">
                  {content.newsletter.termsText}{" "}
                  <a
                    href={content.newsletter.termsLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B20000] underline"
                  >
                    {content.newsletter.termsLinkText}
                  </a>
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
