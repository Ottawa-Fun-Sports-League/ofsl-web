import { useState, useRef, useEffect } from "react";

interface LocationPopoverProps {
  location: string;
  locations?: string[];
  children: React.ReactNode;
  className?: string;
}

export function LocationPopover({
  location,
  locations = [],
  children,
  className = "",
}: LocationPopoverProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Show popover if there are gym names to display
  const hasGymNames = locations && locations.length > 0;

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    }

    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPopover]);

  if (!hasGymNames) {
    return <>{children}</>;
  }

  return (
    <span className={`relative inline-block ${className}`} ref={popoverRef}>
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="text-left focus:outline-none"
        type="button"
      >
        {children}
      </button>

      {showPopover && (
        <div className="absolute z-50 top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            <div className="font-medium text-gray-900 mb-2">League Gyms:</div>
            <ul className="space-y-1">
              {locations.map((loc, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 flex items-start"
                >
                  <span className="text-[#B20000] mr-2">•</span>
                  <span>{loc}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Popover arrow */}
          <div className="absolute bottom-full left-4 border-8 border-transparent border-b-white"></div>
          <div
            className="absolute bottom-full left-4 border-8 border-transparent border-b-gray-200"
            style={{ marginBottom: "-1px" }}
          ></div>
        </div>
      )}
    </span>
  );
}

