declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        Geocoder: new () => any;
        Animation: {
          DROP: any;
          BOUNCE: any;
        };
        event: {
          clearInstanceListeners: (instance: any) => void;
          addListener: (instance: any, event: string, handler: () => void) => void;
          removeListener: (listener: any) => void;
        };
      };
    };
  }
}

export {};