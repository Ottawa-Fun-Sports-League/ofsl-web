import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (
      command: string,
      eventName: string,
      parameters?: {
        page_path?: string;
        page_title?: string;
        page_location?: string;
        [key: string]: any;
      }
    ) => void;
  }
}

export function useGoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Only track if gtag is available
    if (typeof window.gtag !== 'undefined') {
      // Track page view
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location]);
}

// Helper function to track custom events
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// Track specific events
export const analyticsEvents = {
  // User events
  signUp: () => trackEvent('sign_up', 'user'),
  login: () => trackEvent('login', 'user'),
  logout: () => trackEvent('logout', 'user'),
  profileComplete: () => trackEvent('profile_complete', 'user'),
  
  // Team events
  createTeam: (leagueName: string) => trackEvent('create_team', 'team', leagueName),
  joinTeam: (teamName: string) => trackEvent('join_team', 'team', teamName),
  leaveTeam: (teamName: string) => trackEvent('leave_team', 'team', teamName),
  
  // League events
  viewLeague: (leagueName: string) => trackEvent('view_league', 'league', leagueName),
  registerForLeague: (leagueName: string) => trackEvent('register_league', 'league', leagueName),
  
  // Payment events
  initiatePayment: (amount: number) => trackEvent('initiate_payment', 'payment', undefined, amount),
  completePayment: (amount: number) => trackEvent('complete_payment', 'payment', undefined, amount),
  
  // Navigation events
  clickNavLink: (linkName: string) => trackEvent('click_nav_link', 'navigation', linkName),
  clickCTA: (ctaName: string) => trackEvent('click_cta', 'engagement', ctaName),
};