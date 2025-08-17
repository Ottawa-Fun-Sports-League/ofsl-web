import React, { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { HeroBanner } from "../../components/HeroBanner";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Mail } from "lucide-react";

// Stats final values - moved outside component to avoid dependency warnings
const statsData = [
  { value: 1800, label: "Weekly players", suffix: "+" },
  { value: 15, label: "Years of operation", suffix: "+" },
  { value: 260, label: "Volleyball teams", suffix: "+" },
  { value: 85, label: "Raised for charities", suffix: "K+" },
];

export const AboutUsPage = (): React.ReactElement => {
  // Newsletter form state
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState({
    volleyball: false,
    badminton: false,
    basketball: false,
    pickleball: false,
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<null | "success" | "error">(
    null,
  );

  // FAQ accordion state - commented out section
  // const [openFaq, setOpenFaq] = useState<number | null>(null);

  // FAQ data - commented out section
  // const faqItems = [
  //   {
  //     question: "How do I register for a league?",
  //     answer: "To register for a league, create an account on our website and navigate to the 'Leagues' page. Select the league you're interested in and follow the registration steps. Team captains must register their teams, while individual players can sign up as free agents to be placed on a team."
  //   },
  //   {
  //     question: "What skill levels are available?",
  //     answer: "We offer leagues at various skill levels including Elite, Competitive, Advanced, Intermediate, and Recreational. Each level has specific skill requirements to ensure fair and enjoyable gameplay for all participants. Check the specific league descriptions for detailed skill level expectations."
  //   },
  //   {
  //     question: "What is the refund policy?",
  //     answer: "Full refunds are available up to 14 days before the season starts. Within 14 days of the season start, a 50% refund is offered. Once the season begins, no refunds will be issued. In case of injury with medical documentation, prorated refunds may be considered on a case-by-case basis."
  //   },
  //   {
  //     question: "How long does a typical season run?",
  //     answer: "Most of our leagues run for 10-12 weeks per season. We typically offer three seasons throughout the year: Fall (September-December), Winter (January-April), and Summer (May-August). Check the specific league page for exact dates and duration."
  //   },
  //   {
  //     question: "What happens if I need to miss a game?",
  //     answer: "If you know in advance that you'll miss a game, please notify your team captain and the league coordinator. For team sports, we encourage finding a substitute player of similar skill level. Some leagues have specific attendance policies that may affect playoff eligibility."
  //   },
  //   {
  //     question: "Are there playoffs at the end of the season?",
  //     answer: "Yes, most leagues conclude with playoffs for teams that qualify. Playoff formats vary by league, but typically the top 4-8 teams make the playoffs based on regular season standings. Some leagues may have attendance requirements to be eligible for playoffs."
  //   },
  //   {
  //     question: "What COVID-19 protocols are in place?",
  //     answer: "We follow all local health guidelines regarding COVID-19. Our protocols are updated regularly based on the latest public health recommendations. Currently, we encourage proper hygiene and ask participants to stay home if feeling unwell. Please check our website or contact us for the most up-to-date information."
  //   }
  // ];

  // Handle toggling FAQ items - commented out section
  // const toggleFaq = (index: number) => {
  //   setOpenFaq(openFaq === index ? null : index);
  // };

  // Handle contact form input changes
  const handleContactInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle contact form submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Make a direct HTTP call to the edge function with the anon key
      // Supabase edge functions require the Authorization header even for public functions
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(
        "https://api.ofsl.ca/functions/v1/send-contact-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(contactForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Contact form error:", errorData);
        setSubmitStatus("error");
        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
        return;
      }

      // If successful
      setSubmitStatus("success");
      // Reset form after successful submission
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
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 5000);
    }
  };

  // Handle checkbox changes
  const handleInterestChange = (sport: keyof typeof interests) => {
    setInterests((prev) => ({
      ...prev,
      [sport]: !prev[sport],
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to your backend or email service
    // Reset form after submission
    setEmail("");
    setInterests({
      volleyball: false,
      badminton: false,
      basketball: false,
      pickleball: false,
    });
    setAgreeToTerms(false);
    // Show confirmation message (in a real app)
    alert("Thank you for subscribing to our newsletter!");
  };

  // Animation state
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [animationStarted, setAnimationStarted] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Start animation when the stats section comes into view
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

  // Animate the counting when animation is triggered
  useEffect(() => {
    if (!animationStarted) return;

    const duration = 2000; // ms
    const interval = 16; // ms (approximately 60fps)
    const steps = duration / interval;

    let currentStep = 0;
    const finalValues = statsData.map((stat) => stat.value);

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / steps, 1);

      // Easing function for smoother animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const newCounts = finalValues.map((value) =>
        Math.round(easedProgress * value),
      );

      setCounts(newCounts);

      if (currentStep >= steps) {
        clearInterval(timer);
        setCounts(finalValues);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [animationStarted]);

  return (
    <div className="bg-white w-full">
      {/* Hero Banner */}
      <HeroBanner
        image="/AdobeStock_252945543_50.jpeg"
        imageAlt="Volleyball court with ball"
        containerClassName="h-[250px]"
      >
        <div className="text-center text-white">
          <h1 className="text-5xl mb-4 font-heading">About Us</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Founded in 2010, The Ottawa Fun Sports League (OFSL) is a
            volunteer-run, non-profit organization dedicated to making a
            meaningful impact in the Ottawa community through sport and
            recreation.
          </p>
        </div>
      </HeroBanner>

      {/* Statistics row - moved directly under hero banner and title removed */}
      <div
        ref={statsRef}
        className="max-w-[1280px] mx-auto px-4 pt-12 md:pt-16 pb-8 md:pb-12"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 text-center">
          <div>
            <div className="text-[#B20000] text-5xl font-bold mb-2">
              {counts[0]}
              {statsData[0].suffix}
            </div>
            <p className="text-[#6F6F6F] text-lg">{statsData[0].label}</p>
          </div>
          <div>
            <div className="text-[#B20000] text-5xl font-bold mb-2">
              {counts[1]}
              {statsData[1].suffix}
            </div>
            <p className="text-[#6F6F6F] text-lg">{statsData[1].label}</p>
          </div>
          <div>
            <div className="text-[#B20000] text-5xl font-bold mb-2">
              {counts[2]}
              {statsData[2].suffix}
            </div>
            <p className="text-[#6F6F6F] text-lg">{statsData[2].label}</p>
          </div>
          <div>
            <div className="text-[#B20000] text-5xl font-bold mb-2">
              ${counts[3]}
              {statsData[3].suffix}
            </div>
            <p className="text-[#6F6F6F] text-lg">{statsData[3].label}</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-4 py-16 md:py-24">
        {/* Our mission section - Updated to grid layout with image on right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-6">
              Our Mission
            </h2>
            <p className="text-lg text-[#6F6F6F]">
              Our mission is to create inclusive, affordable, and enjoyable
              opportunities for individuals of all ages to stay active, meet new
              people, and live a healthy lifestyle, while having fun at the same
              time. We are dedicated to creating a welcoming environment where
              people of all skill levels can enjoy sports, make connections, and
              build community.
            </p>
          </div>
          <div>
            <img
              src="/AdobeStock_80339042.jpeg"
              alt="OFSL Community in Action"
              className="w-full h-[350px] object-cover rounded-lg"
            />
          </div>
        </div>

        {/* Our story section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28">
          <div>
            <img
              src="/group-2.png"
              alt="OFSL Community"
              className="w-full h-[350px] object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-6">
              Our Story
            </h2>
            <p className="text-lg text-[#6F6F6F] mb-6">
              Founded in 2010 by a group of sports enthusiasts who wanted to
              create more accessible recreational opportunities in Ottawa, OFSL
              began with just two volleyball courts and 48 players.
            </p>
            <p className="text-lg text-[#6F6F6F]">
              Today, we&apos;ve grown to serve over 2,000 participants across
              multiple sports including volleyball, badminton, pickleball, and
              basketball. Our focus has always been on creating a balance of
              competitive play and inclusive fun that welcomes players of all
              backgrounds.
            </p>
          </div>
        </div>

        <Separator className="mb-20 md:mb-28" />

        {/* Our partners section - formerly Community impact */}
        <div id="partners-section" className="mb-20 md:mb-28">
          <h2 className="text-3xl font-bold text-[#6F6F6F] mb-8 text-center">
            Our Partners
          </h2>
          <p className="text-lg text-[#6F6F6F] max-w-3xl mx-auto text-center">
            Partnering with us is a great way to connect with an active, engaged
            community while supporting local sports and wellness. Together, we
            can create meaningful experiences and drive mutual growth.
          </p>
        </div>

        {/* Diabetes Canada section - New section with 2 columns */}
        <div
          id="diabetes-canada-section"
          className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 md:mb-28"
        >
          {/* First column - Image */}
          <div className="flex items-center justify-center">
            <img
              src="https://www.diabetes.ca/getmedia/8a392c10-ebc4-4b97-977f-efae3259cc54/homepage-resources_1.jpg?width=725&height=483&ext=.jpg"
              alt="Diabetes Canada Outreach"
              className="w-full h-auto object-cover rounded-lg shadow-lg"
            />
          </div>

          {/* Second column - Logo and text */}
          <div className="flex flex-col justify-center">
            <img
              src="/diabetes-canada-logo-svg-1.png"
              alt="Diabetes Canada"
              className="w-[180px] h-auto object-contain mb-6"
            />
            <p className="text-lg text-[#6F6F6F]">
              Diabetes Canada works tirelessly to advocate for and support
              Canadians living with diabetes with helpful resources, education,
              research, and more. We work to help Canadians better manage the
              disease and avoid long-term complications with comprehensive
              resources, education, and support.{" "}
              <a
                href="https://www.diabetes.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B20000] underline"
              >
                Learn more
              </a>
            </p>
          </div>
        </div>

        {/* Contact Us Section with form integration */}
        <div id="contact-section">
          <Card className="bg-[#ffeae5] rounded-lg shadow-none border-none mb-20 md:mb-28">
            <CardContent className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left side - Contact emails */}
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <div className="flex flex-col items-center md:items-start">
                      <Mail className="w-[40px] h-[40px] text-[#B20000] mb-3" />
                      <h2 className="text-xl md:text-2xl font-bold text-[#6F6F6F] mb-4">
                        Contact Us
                      </h2>
                      {/* General inquiries moved up */}
                      <div>
                        <p className="text-[#6F6F6F] font-bold mb-1">
                          General inquiries
                        </p>
                        <a
                          href="mailto:info@ofsl.ca"
                          className="text-[#B20000] hover:underline"
                        >
                          info@ofsl.ca
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* This div will push the content to the bottom */}
                  <div className="flex-grow"></div>

                  {/* Contact information at the bottom */}
                  <div className="space-y-4 mt-auto">
                    {/* Temporarily hidden email addresses
                    <div>
                      <p className="text-[#6F6F6F] font-bold mb-1">Volleyball</p>
                      <a href="mailto:Volleyball@ofsl.ca" className="text-[#B20000] hover:underline">
                        Volleyball@ofsl.ca
                      </a>
                    </div>
                    <div>
                      <p className="text-[#6F6F6F] font-bold mb-1">Badminton</p>
                      <a href="mailto:Badminton@ofsl.ca" className="text-[#B20000] hover:underline">
                        Badminton@ofsl.ca
                      </a>
                    </div>
                    <div>
                      <p className="text-[#6F6F6F] font-bold mb-1">Sponsorships</p>
                      <a href="mailto:sponsor@ofsl.ca" className="text-[#B20000] hover:underline">
                        sponsor@ofsl.ca
                      </a>
                    </div>
                    */}
                  </div>
                </div>

                {/* Right side - Contact form */}
                <div className="md:col-span-2">
                  <h3 className="text-xl font-bold text-[#6F6F6F] mb-4">
                    Send Us a Message
                  </h3>

                  {submitStatus === "success" && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                      Thank you for your message! We&apos;ll get back to you
                      soon.
                    </div>
                  )}

                  {submitStatus === "error" && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                      There was an error sending your message. Please try again.
                    </div>
                  )}

                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Name field */}
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-[#6F6F6F] mb-1"
                        >
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

                      {/* Email field */}
                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-sm font-medium text-[#6F6F6F] mb-1"
                        >
                          Email Address *
                        </label>
                        <Input
                          id="contact-email"
                          name="email"
                          type="email"
                          value={contactForm.email}
                          onChange={handleContactInputChange}
                          placeholder="Enter your email address"
                          className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000] bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Subject field */}
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-[#6F6F6F] mb-1"
                      >
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

                    {/* Message field */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-[#6F6F6F] mb-1"
                      >
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

                    {/* Submit button */}
                    <Button
                      type="submit"
                      className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base px-8 py-2.5"
                    >
                      Send Message
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section - Hidden */}
        {/*
        <div id="faq-section" className="mb-20 md:mb-28">
          <h2 className="text-3xl font-bold text-[#6F6F6F] mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto">
            {faqItems.map((item, index) => (
              <div 
                key={index}
                className="mb-4 border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-4 md:p-6 bg-white hover:bg-gray-50 transition-colors text-left"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                >
                  <h3 className="text-lg font-bold text-[#6F6F6F]">
                    {item.question}
                  </h3>
                  {openFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-[#B20000] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#B20000] flex-shrink-0" />
                  )}
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index 
                      ? 'max-h-96 opacity-100' 
                      : 'max-h-0 opacity-0'
                  }`}
                  aria-hidden={openFaq !== index}
                >
                  <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-200">
                    <p className="text-[#6F6F6F]">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        */}
      </div>

      {/* Newsletter Signup Section */}
      <div id="newsletter-section" className="bg-gray-50 py-16">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="max-w-[600px] mx-auto">
            <h2 className="text-3xl font-bold text-[#6F6F6F] mb-4 text-center">
              Newsletter
            </h2>
            <p className="text-lg text-[#6F6F6F] text-center mb-8">
              Get regular updates about our league.
            </p>

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
                <p className="text-[#6F6F6F] mb-3">I&apos;m interested in:</p>
                <div className="flex flex-row flex-wrap gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="volleyball"
                      checked={interests.volleyball}
                      onChange={() => handleInterestChange("volleyball")}
                      className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    />
                    <label htmlFor="volleyball" className="ml-2 text-[#6F6F6F]">
                      Volleyball
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="badminton"
                      checked={interests.badminton}
                      onChange={() => handleInterestChange("badminton")}
                      className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    />
                    <label htmlFor="badminton" className="ml-2 text-[#6F6F6F]">
                      Badminton
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="basketball"
                      checked={interests.basketball}
                      onChange={() => handleInterestChange("basketball")}
                      className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    />
                    <label htmlFor="basketball" className="ml-2 text-[#6F6F6F]">
                      Basketball
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pickleball"
                      checked={interests.pickleball}
                      onChange={() => handleInterestChange("pickleball")}
                      className="h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    />
                    <label htmlFor="pickleball" className="ml-2 text-[#6F6F6F]">
                      Pickleball
                    </label>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
              >
                Subscribe
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
                  I agree to receive email newsletters and accept the{" "}
                  <a href="#" className="text-[#B20000] underline">
                    terms and conditions
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

