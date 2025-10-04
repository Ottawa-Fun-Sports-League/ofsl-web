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
  const stateLockUntil = useRef(0);

  useEffect(() => {
    // Increase the gap between thresholds to prevent oscillation
    const COMPACT_THRESHOLD = 100; // more buffer before compacting header
    const EXPAND_THRESHOLD = 20; // expand a bit closer to the top
    const ANNOUNCEMENT_HIDE_THRESHOLD = 24; // hide when scrolling down past this
    const ANNOUNCEMENT_SHOW_THRESHOLD = 40; // show when near top while scrolling up
    const STATE_CHANGE_DELAY = 200; // delay between state changes
    const MIN_SCROLL_DISTANCE = 6; // minimum movement to consider
    const STATE_LOCK_MS = 350; // ignore opposite toggles during animation
    
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = Math.max(window.scrollY, 0);
          const now = Date.now();
          const scrollDistance = Math.abs(currentScrollY - prevScrollY.current);
          const scrollingDown = currentScrollY > prevScrollY.current;
          const timeSinceLastChange = now - lastStateChangeTime.current;
          const lockActive = now < stateLockUntil.current;
          
          // Set current direction with minimum distance threshold
          const currentDirection = scrollingDown ? 'down' : 'up';
          
          // Only register direction change if we've scrolled enough
          if (scrollDistance >= MIN_SCROLL_DISTANCE) {
            lastDirection.current = currentDirection;
          }
          
          // Only process state changes if we've waited long enough
          if (!lockActive && timeSinceLastChange > STATE_CHANGE_DELAY) {
            // Announcement bar logic
            if (
              scrollingDown &&
              currentScrollY > ANNOUNCEMENT_HIDE_THRESHOLD &&
              showAnnouncement
            ) {
              setShowAnnouncement(false);
              lastStateChangeTime.current = now;
              stateLockUntil.current = now + STATE_LOCK_MS; // lock to avoid immediate flip
            } else if (
              !scrollingDown &&
              lastDirection.current === 'up' &&
              currentScrollY <= ANNOUNCEMENT_SHOW_THRESHOLD &&
              !showAnnouncement
            ) {
              setShowAnnouncement(true);
              lastStateChangeTime.current = now;
              stateLockUntil.current = now + STATE_LOCK_MS;
            }

            // Compact header logic with enhanced hysteresis
            // Only change states if we're consistently scrolling in one direction
            if (
              scrollingDown &&
              lastDirection.current === 'down' &&
              currentScrollY > COMPACT_THRESHOLD &&
              !isCompactHeader
            ) {
              setIsCompactHeader(true);
              lastStateChangeTime.current = now;
              stateLockUntil.current = now + STATE_LOCK_MS;
            } else if (
              !scrollingDown &&
              lastDirection.current === 'up' &&
              currentScrollY < EXPAND_THRESHOLD &&
              isCompactHeader
            ) {
              setIsCompactHeader(false);
              // When header expands again near the top, ensure announcement bar is visible
              if (!showAnnouncement) {
                setShowAnnouncement(true);
              }
              lastStateChangeTime.current = now;
              stateLockUntil.current = now + STATE_LOCK_MS;
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
