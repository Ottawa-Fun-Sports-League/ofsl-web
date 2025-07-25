import { useEffect, useState } from 'react';

let isLoading = false;
let isLoaded = false;

export function useGoogleMaps() {
  const [mapsLoaded, setMapsLoaded] = useState(isLoaded);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || isLoaded || isLoading) {
      setMapsLoaded(isLoaded);
      return;
    }

    isLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      setMapsLoaded(true);
    };
    
    script.onerror = () => {
      isLoading = false;
      console.error('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup is handled by the browser
    };
  }, []);

  return mapsLoaded;
}