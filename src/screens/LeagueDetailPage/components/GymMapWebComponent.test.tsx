import { render, waitFor, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GymMapWebComponent } from './GymMapWebComponent';

// Mock the useGoogleMaps hook
const mockUseGoogleMaps = vi.fn();
vi.mock('../../../hooks/useGoogleMaps', () => ({
  useGoogleMaps: () => mockUseGoogleMaps()
}));

describe('GymMapWebComponent', () => {
  const mockGeocoderResult = {
    geometry: {
      location: {
        lat: () => 45.4215,
        lng: () => -75.6972
      }
    }
  };

  let mockGeocodeMethod: ReturnType<typeof vi.fn>;
  
  const mockGoogleMaps = {
    maps: {
      Map: vi.fn().mockImplementation(() => ({
        setCenter: vi.fn(),
        setZoom: vi.fn()
      })),
      Marker: vi.fn().mockImplementation(() => ({
        setMap: vi.fn(),
        setPosition: vi.fn()
      })),
      Geocoder: vi.fn().mockImplementation(() => {
        mockGeocodeMethod = vi.fn((_request, callback) => {
          callback([mockGeocoderResult], 'OK');
        });
        return {
          geocode: mockGeocodeMethod
        };
      }),
      Animation: {
        DROP: 'DROP',
        BOUNCE: 'BOUNCE'
      },
      event: {
        clearInstanceListeners: vi.fn()
      }
    }
  } as unknown as typeof google;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.google
    delete (window as { google?: typeof window.google }).google;
    // Mock environment variable
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render map not available message if API key is not provided', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    mockUseGoogleMaps.mockReturnValue({ loaded: false, error: null });
    
    const { container } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    expect(container.textContent).toContain('Map not available');
  });

  it('should render loading state when maps are not loaded', () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: false, error: null });
    
    const { container } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    expect(container.querySelector('.h-48.bg-gray-100')).toBeInTheDocument();
    expect(container.querySelector('.w-full.h-full')).toBeInTheDocument();
  });

  it('should initialize map when Google Maps is loaded', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    (window as unknown as { google: typeof google }).google = mockGoogleMaps;
    
    render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Geocoder).toHaveBeenCalled();
      expect(mockGoogleMaps.maps.Map).toHaveBeenCalled();
      expect(mockGoogleMaps.maps.Marker).toHaveBeenCalled();
    });
  });

  it.skip('should handle delayed Google Maps loading', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    // Initially, Google Maps is not available
    (window as { google?: typeof window.google }).google = undefined;
    
    const { rerender } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Simulate Google Maps becoming available
    (window as { google?: typeof window.google }).google = mockGoogleMaps;
    
    // Re-render to trigger effect
    rerender(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // The component should eventually initialize the map
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Geocoder).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should handle geocoding errors gracefully', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    const mockGeocoderWithError = {
      ...mockGoogleMaps,
      maps: {
        ...mockGoogleMaps.maps,
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: vi.fn((_request, callback) => {
            callback([], 'ZERO_RESULTS');
          })
        })),
        event: {
          clearInstanceListeners: vi.fn()
        }
      }
    };
    (window as { google?: typeof google }).google = mockGeocoderWithError as unknown as typeof google;
    
    render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    await waitFor(() => {
      expect(mockGeocoderWithError.maps.Geocoder).toHaveBeenCalled();
      // Map and Marker should not be created when geocoding fails
      expect(mockGoogleMaps.maps.Map).not.toHaveBeenCalled();
      expect(mockGoogleMaps.maps.Marker).not.toHaveBeenCalled();
    });
  });

  it('should cleanup timeout on unmount', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    // Google Maps is not available initially
    (window as { google?: typeof window.google }).google = undefined;
    
    const { unmount } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Unmount before Google Maps loads
    unmount();
    
    // Set Google Maps after unmount
    await new Promise(resolve => setTimeout(resolve, 200));
    (window as { google?: typeof window.google }).google = mockGoogleMaps;
    
    // Geocoder should not be called after unmount
    expect(mockGoogleMaps.maps.Geocoder).not.toHaveBeenCalled();
  });

  it('should handle race condition when component re-renders quickly', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    (window as unknown as { google: typeof google }).google = mockGoogleMaps;
    
    const { rerender } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Quick re-renders with different addresses
    rerender(
      <GymMapWebComponent address="456 New St" gymName="New Gym" />
    );
    rerender(
      <GymMapWebComponent address="789 Final St" gymName="Final Gym" />
    );
    
    await waitFor(() => {
      // Should geocode the final address
      expect(mockGeocodeMethod).toHaveBeenCalled();
      const geocodeCalls = mockGeocodeMethod.mock.calls;
      const lastCall = geocodeCalls[geocodeCalls.length - 1];
      expect(lastCall[0].address).toBe('789 Final St');
    });
  });

  it.skip('should wait for all Google Maps components to be available', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    
    // Simulate partial Google Maps loading - missing Geocoder initially
    (window as unknown as { google: typeof google }).google = {
      maps: {
        // Only Map is available initially
        Map: mockGoogleMaps.maps.Map,
        event: {
          clearInstanceListeners: vi.fn()
        },
        Animation: {
          DROP: 2,
          BOUNCE: 1
        }
      }
    } as unknown as typeof google;
    
    const { rerender } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Component should show error since Geocoder is not available
    await waitFor(() => {
      expect(screen.getByText('Google Maps API not fully loaded')).toBeInTheDocument();
    });
    
    // Now add all required components
    const windowWithGoogle = window as { google?: typeof window.google };
    if (windowWithGoogle.google?.maps) {
      windowWithGoogle.google.maps.Geocoder = mockGoogleMaps.maps.Geocoder;
      windowWithGoogle.google.maps.Marker = mockGoogleMaps.maps.Marker;
    }
    
    // Re-render to trigger effect
    rerender(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Geocoder).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});