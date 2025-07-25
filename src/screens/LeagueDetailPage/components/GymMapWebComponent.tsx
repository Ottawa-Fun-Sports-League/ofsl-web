import { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../../../hooks/useGoogleMaps';

interface GymMapWebComponentProps {
  address: string;
  gymName: string;
}

// Declare the custom element type
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-map': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-advanced-marker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export function GymMapWebComponent({ address, gymName }: GymMapWebComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapsLoaded = useGoogleMaps();

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    // Wait for Google Maps to be fully loaded
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        // Use the traditional Maps JavaScript API approach
        const geocoder = new window.google.maps.Geocoder();
        
        geocoder.geocode({ address }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results[0] && mapRef.current) {
            const location = results[0].geometry.location;
            
            // Create a traditional Google Map
            const map = new window.google.maps.Map(mapRef.current, {
              center: location,
              zoom: 15,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            });

            // Add a marker
            new window.google.maps.Marker({
              position: location,
              map: map,
              title: gymName,
            });
          }
        });
      } else if (attempts < maxAttempts) {
        // Try again in 100ms if Google Maps isn't ready yet
        attempts++;
        timeoutId = setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [address, gymName, mapsLoaded]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return null;
  }

  return (
    <div className="h-48 bg-gray-100">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}