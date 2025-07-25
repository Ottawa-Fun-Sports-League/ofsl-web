import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../../../hooks/useGoogleMaps';

interface GymMapWebComponentProps {
  address: string;
  gymName: string;
}

// Declare the custom element type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'gmp-map': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-advanced-marker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export function GymMapWebComponent({ address, gymName }: GymMapWebComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null); // google.maps.Map
  const { loaded: mapsLoaded, error: mapsError } = useGoogleMaps();
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) {
      if (mapsError) {
        setMapError(mapsError.message);
        setIsLoadingMap(false);
      }
      return;
    }

    let isMounted = true;
    let geocodeTimeout: NodeJS.Timeout | null = null;
    setIsLoadingMap(true);
    setMapError(null);

    // Clear any existing map
    if (mapInstanceRef.current && window.google) {
      // Remove all listeners and clear the map div
      window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      mapInstanceRef.current = null;
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    }

    const initializeMap = async () => {
      try {
        // Add a small delay to ensure Google Maps is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!window.google?.maps?.Geocoder) {
          throw new Error('Google Maps API not fully loaded');
        }

        const geocoder = new window.google.maps.Geocoder();
        
        // Use Promise-based geocoding
        const geocodeAddress = () => {
          return new Promise<unknown[]>((resolve, reject) => {
            geocoder.geocode({ address }, (results: unknown[], status: string) => {
              if (!isMounted) {
                reject(new Error('Component unmounted'));
                return;
              }
              
              if (status === 'OK' && results && (results as Array<unknown>).length > 0) {
                resolve(results);
              } else if (status === 'ZERO_RESULTS') {
                reject(new Error('Address not found'));
              } else if (status === 'OVER_QUERY_LIMIT') {
                // Retry after a delay
                geocodeTimeout = setTimeout(() => {
                  if (isMounted) {
                    geocodeAddress().then(resolve).catch(reject);
                  }
                }, 1000);
              } else {
                reject(new Error(`Geocoding failed: ${status}`));
              }
            });
          });
        };

        const results = await geocodeAddress();
        
        if (!isMounted || !mapRef.current) return;

        interface GeocoderResult {
          geometry: {
            location: { lat: number; lng: number };
          };
        }
        const location = (results[0] as GeocoderResult).geometry.location;
        
        // Create map with better error handling
        const map = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          clickableIcons: false,
          disableDefaultUI: false,
        });

        mapInstanceRef.current = map;

        // Add marker
        new window.google.maps.Marker({
          position: location,
          map: map,
          title: gymName,
          animation: window.google.maps.Animation.DROP,
        });

        setIsLoadingMap(false);
      } catch (error) {
        if (isMounted) {
          console.error('Map initialization error:', error);
          setMapError(error instanceof Error ? error.message : 'Failed to load map');
          setIsLoadingMap(false);
        }
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      isMounted = false;
      if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
      }
      if (mapInstanceRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, [address, gymName, mapsLoaded, mapsError]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-500">
        <p className="text-sm">Map not available</p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-500 p-4">
        <div className="text-center">
          <p className="text-sm font-medium">Unable to load map</p>
          <p className="text-xs mt-1">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 bg-gray-100 relative">
      {isLoadingMap && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600 mt-2">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}