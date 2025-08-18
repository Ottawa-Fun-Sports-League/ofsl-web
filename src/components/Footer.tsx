import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Footer() {
  const { user } = useAuth();

  return (
    <footer className="w-full bg-black text-white">
      <div className="max-w-[1280px] mx-auto px-4 pt-16 md:pt-24 pb-8 md:pb-12">
        {/* Logo as its own row */}
        <div className="mb-10 md:mb-16">
          <img
            className="w-[150px] md:w-[182px] h-auto md:h-[38px]"
            alt="OFSL Logo"
            src="/group-1-1.png"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10 md:gap-12 mb-16 md:mb-24 items-start">
          <div className="col-span-1">
            <h3 className="text-xl font-bold text-white mb-4 md:mb-6">
              Leagues
            </h3>
            <ul className="text-base md:text-lg space-y-2">
              <li>
                <Link
                  to="/volleyball"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Volleyball
                </Link>
              </li>
              <li>
                <Link
                  to="/badminton"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Badminton
                </Link>
              </li>
              <li>
                <Link
                  to="/pickleball"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Pickleball
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4 md:mb-6">
              Get involved
            </h3>
            <ul className="text-base md:text-lg space-y-2">
              <li>
                <Link
                  to="/about-us#newsletter-section"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Newsletter
                </Link>
              </li>
              <li>
                <Link
                  to="/skills-and-drills"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Skills and Drills
                </Link>
              </li>
              <li>
                <Link
                  to="/about-us#partners-section"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Partner with us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4 md:mb-6">
              Useful links
            </h3>
            <ul className="text-base md:text-lg space-y-2">
              <li>
                <Link
                  to="/leagues"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Leagues
                </Link>
              </li>
              <li>
                <Link
                  to={
                    user
                      ? "/my-account/teams"
                      : "/login?redirect=/my-account/teams"
                  }
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Schedule & Standings
                </Link>
              </li>
              <li>
                <Link
                  to="/standards-of-play"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Standards of play
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4 md:mb-6">
              Site info
            </h3>
            <ul className="text-base md:text-lg space-y-2">
              <li>
                <Link
                  to="/about-us"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  About us
                </Link>
              </li>
              <li>
                <Link
                  to="/about-us#contact-section"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/about-us#faq-section"
                  className="footer-link hover:text-[#ffeae5]"
                >
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4 md:mb-6">
              Contact
            </h3>
            <div className="text-base md:text-lg mb-6 md:mb-8 text-white">
              <a
                href="mailto:info@ofsl.ca"
                className="inline-flex items-center gap-2 hover:text-[#ffeae5] mb-4"
              >
                <Mail size={18} className="text-white" />
                <span className="footer-link">Email</span>
              </a>
              <div className="mb-4"></div>
              <a
                href="tel:6137986375"
                className="inline-flex items-center gap-2 hover:text-[#ffeae5]"
              >
                <Phone size={18} className="text-white" />
                <span className="footer-link">Phone</span>
              </a>
            </div>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/OttawaFunSportsLeague"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="bg-white rounded-lg p-1 flex items-center justify-center"
              >
                <img
                  className="w-[24px] h-[24px]"
                  alt="Facebook"
                  src="/social-icons.svg"
                />
              </a>
              <a
                href="https://www.instagram.com/ottawafunsports/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="bg-white rounded-lg p-1 flex items-center justify-center"
              >
                <img
                  className="w-[23px] h-[24px]"
                  alt="Instagram"
                  src="/social-icons-2.svg"
                />
              </a>
              <a
                href="https://www.tiktok.com/@ottawafunsports"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="bg-white rounded-lg p-1 flex items-center justify-center"
              >
                <img
                  className="w-[24px] h-[24px]"
                  alt="TikTok"
                  src="/social-icons-1.svg"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
          <div className="text-sm md:text-base text-[#9a9a9a]">
            © {new Date().getFullYear()} COMMUNITY ACTIVE SPORTS LEAGUE INC.
          </div>
          <div className="text-sm md:text-base text-[#9a9a9a]">
            Privacy Policy&nbsp;&nbsp;|&nbsp;&nbsp;Terms of Use
          </div>
        </div>
      </div>
    </footer>
  );
}

