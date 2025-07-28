declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: MapOptions);
        setCenter(center: LatLng | LatLngLiteral): void;
        setZoom(zoom: number): void;
      }

      class Marker {
        constructor(options: MarkerOptions);
        setMap(map: Map | null): void;
        setPosition(position: LatLng | LatLngLiteral): void;
      }

      class Geocoder {
        geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
      }

      interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        [key: string]: unknown;
      }

      interface MarkerOptions {
        position?: LatLng | LatLngLiteral;
        map?: Map;
        title?: string;
        animation?: Animation;
        [key: string]: unknown;
      }

      interface GeocoderRequest {
        address?: string;
        [key: string]: unknown;
      }

      interface GeocoderResult {
        geometry: {
          location: LatLng;
        };
        [key: string]: unknown;
      }

      interface LatLng {
        lat(): number;
        lng(): number;
      }

      interface LatLngLiteral {
        lat: number;
        lng: number;
      }

      enum Animation {
        DROP = 'DROP',
        BOUNCE = 'BOUNCE'
      }

      type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'ERROR' | string;

      namespace event {
        function clearInstanceListeners(instance: object): void;
        function addListener(instance: object, event: string, handler: () => void): google.maps.MapsEventListener;
        function removeListener(listener: google.maps.MapsEventListener): void;
      }

      interface MapsEventListener {
        remove(): void;
      }
    }
  }

  interface Window {
    google?: typeof google;
  }
}

export {};