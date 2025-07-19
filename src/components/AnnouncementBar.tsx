import { Link } from "react-router-dom";

export function AnnouncementBar() {
  return (
    <div className="w-full bg-black py-2 md:py-2.5 relative z-50">
      <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-center">
        <div className="font-normal text-white text-sm md:text-base text-center">
          <span className="tracking-[0.08px]">Fall/Winter 2025/26 leagues registration is now open! </span>
          <Link 
            to="/leagues"
            className="text-base md:text-lg underline ml-0 md:ml-2 font-bold"
          >
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}