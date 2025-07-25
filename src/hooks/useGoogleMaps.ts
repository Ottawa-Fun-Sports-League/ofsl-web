import { useEffect, useState } from 'react';

let isLoading = false;
let isLoaded = false;
let loadError: Error | null = null;

export function useGoogleMaps() {
  const [state, setState] = useState<{
    loaded: boolean;
    error: Error | null;
  }>({ loaded: isLoaded, error: loadError });

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setState({ loaded: false, error: new Error('Google Maps API key not configured') });
      return;
    }

    if (isLoaded) {
      setState({ loaded: true, error: null });
      return;
    }

    if (loadError) {
      setState({ loaded: false, error: loadError });
      return;
    }

    if (isLoading) {
      // Wait for the existing load attempt
      const checkInterval = setInterval(() => {
        if (isLoaded) {
          clearInterval(checkInterval);
          setState({ loaded: true, error: null });
        } else if (loadError) {
          clearInterval(checkInterval);
          setState({ loaded: false, error: loadError });
        } else if (!isLoading) {
          // Loading finished but neither loaded nor error
          clearInterval(checkInterval);
          setState({ loaded: false, error: new Error('Google Maps loading interrupted') });
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    isLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      setState({ loaded: true, error: null });
    };
    
    script.onerror = () => {
      isLoading = false;
      loadError = new Error('Failed to load Google Maps script');
      setState({ loaded: false, error: loadError });
    };

    document.head.appendChild(script);
  }, []);

  return state;
}