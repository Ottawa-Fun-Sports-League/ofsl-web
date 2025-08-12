interface NavigationTabsProps {
  activeView: "info" | "standings" | "schedule" | "gyms";
  setActiveView: (view: "info" | "standings" | "schedule" | "gyms") => void;
  sport: string;
  isAdmin?: boolean;
}

export function NavigationTabs({
  activeView,
  setActiveView,
  sport,
}: NavigationTabsProps) {
  return (
    <div className="flex flex-nowrap overflow-x-auto scrollbar-thin border-b border-gray-200 mb-8">
      <div className="flex flex-grow">
        <div
          onClick={() => setActiveView("info")}
          className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
            activeView === "info"
              ? "text-[#B20000] font-medium"
              : "text-[#6F6F6F] hover:text-[#B20000]"
          }`}
        >
          <span>Details</span>
          {activeView === "info" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
          )}
        </div>

        {/* Show Standings and Schedule tabs for Volleyball */}
        {sport === "Volleyball" && (
          <>
            <div
              onClick={() => setActiveView("standings")}
              className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                activeView === "standings"
                  ? "text-[#B20000] font-medium"
                  : "text-[#6F6F6F] hover:text-[#B20000]"
              }`}
            >
              <span>Standings</span>
              {activeView === "standings" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
              )}
            </div>

            <div
              onClick={() => setActiveView("schedule")}
              className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
                activeView === "schedule"
                  ? "text-[#B20000] font-medium"
                  : "text-[#6F6F6F] hover:text-[#B20000]"
              }`}
            >
              <span>Schedule</span>
              {activeView === "schedule" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
              )}
            </div>
          </>
        )}

        {/* Gyms tab */}
        <div
          onClick={() => setActiveView("gyms")}
          className={`px-6 py-3 text-center cursor-pointer relative transition-all ${
            activeView === "gyms"
              ? "text-[#B20000] font-medium"
              : "text-[#6F6F6F] hover:text-[#B20000]"
          }`}
        >
          <span>Locations</span>
          {activeView === "gyms" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B20000]"></div>
          )}
        </div>
      </div>
    </div>
  );
}
