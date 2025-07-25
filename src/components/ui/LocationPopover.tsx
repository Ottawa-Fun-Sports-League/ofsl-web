import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface LocationPopoverProps {
  locations?: string[];
  children: React.ReactNode;
  className?: string;
}

export function LocationPopover({
  locations = [],
  children,
  className = "",
}: LocationPopoverProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show popover if there are gym names to display
  const hasGymNames = locations && locations.length > 0;

  // Update popover position
  const updatePosition = () => {
    if (showPopover && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position
      const top = rect.bottom + scrollTop + 8; // 8px gap
      let left = rect.left + scrollLeft;
      
      // Adjust if popover would go off the right edge of the screen
      const popoverWidth = 256; // w-64 = 16rem = 256px
      if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 16; // 16px padding from edge
      }
      
      // Ensure left position is not negative
      if (left < 16) {
        left = 16;
      }
      
      setPopoverPosition({ top, left });
    }
  };

  // Update position when popover opens or window resizes/scrolls
  useEffect(() => {
    if (showPopover) {
      updatePosition();
      
      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPopover]);

  // Handle mouse enter/leave for hover functionality
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before closing to allow moving to the popover
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPopover(false);
    }, 100);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!hasGymNames) {
    return <>{children}</>;
  }

  return (
    <>
      <span 
        className={`inline-block ${className}`} 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="cursor-pointer">
          {children}
        </span>
      </span>

      {showPopover && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[9999] w-64 bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-4">
            <div className="font-medium text-gray-900 mb-2">League Gyms:</div>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
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
        </div>,
        document.body
      )}
    </>
  );
}

