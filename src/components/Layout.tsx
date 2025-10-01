import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { AnnouncementBar } from "./AnnouncementBar";
import { Footer } from "./Footer";

export function Layout() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const prevScrollY = useRef(0);
  const ticking = useRef(false);
  const lastStateChangeTime = useRef(0);
  const lastDirection = useRef<'up' | 'down' | null>(null);

  useEffect(() => {
    // Increase the gap between thresholds to prevent oscillation
    const COMPACT_THRESHOLD = 80; // Increased threshold to switch to compact when scrolling down
    const EXPAND_THRESHOLD = 30; // Decreased threshold to switch to expanded when scrolling up
    const ANNOUNCEMENT_HIDE_THRESHOLD = 10;
    // Allow announcement bar to reappear when near the top (not only at exact 0)
    const ANNOUNCEMENT_SHOW_THRESHOLD = 30;
    const STATE_CHANGE_DELAY = 200; // Increased delay between state changes
    const MIN_SCROLL_DISTANCE = 5; // Minimum scroll distance to consider a direction change
    
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const now = Date.now();
          const scrollDistance = Math.abs(currentScrollY - prevScrollY.current);
          const scrollingDown = currentScrollY > prevScrollY.current;
          const timeSinceLastChange = now - lastStateChangeTime.current;
          
          // Set current direction with minimum distance threshold
          const currentDirection = scrollingDown ? 'down' : 'up';
          
          // Only register direction change if we've scrolled enough
          if (scrollDistance >= MIN_SCROLL_DISTANCE) {
            lastDirection.current = currentDirection;
          }
          
          // Only process state changes if we've waited long enough
          if (timeSinceLastChange > STATE_CHANGE_DELAY) {
            // Announcement bar logic
            if (scrollingDown && currentScrollY > ANNOUNCEMENT_HIDE_THRESHOLD && showAnnouncement) {
              setShowAnnouncement(false);
              lastStateChangeTime.current = now;
            } else if (currentScrollY <= ANNOUNCEMENT_SHOW_THRESHOLD && !showAnnouncement) {
              setShowAnnouncement(true);
              lastStateChangeTime.current = now;
            }
            
            // Compact header logic with enhanced hysteresis
            // Only change states if we're consistently scrolling in one direction
            if (scrollingDown && lastDirection.current === 'down' && 
                currentScrollY > COMPACT_THRESHOLD && !isCompactHeader) {
              setIsCompactHeader(true);
              lastStateChangeTime.current = now;
            } else if (!scrollingDown && lastDirection.current === 'up' && 
                      currentScrollY < EXPAND_THRESHOLD && isCompactHeader) {
              setIsCompactHeader(false);
              // When header expands again near the top, ensure announcement bar is visible
              if (!showAnnouncement) {
                setShowAnnouncement(true);
              }
              lastStateChangeTime.current = now;
            }
          }
          
          prevScrollY.current = currentScrollY;
          ticking.current = false;
        });
        
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAnnouncement, isCompactHeader]);

  return (
    <div className="bg-white w-full">
      <div className="sticky top-0 z-50">
        <AnnouncementBar visible={showAnnouncement} />
        <Header isCompact={isCompactHeader} />
      </div>
      <Outlet />
      <Footer />
    </div>
  );
}
