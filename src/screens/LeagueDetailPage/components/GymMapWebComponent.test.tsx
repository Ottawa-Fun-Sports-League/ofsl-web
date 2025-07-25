import { render, waitFor } from '@testing-library/react';
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
      Geocoder: vi.fn().mockImplementation(() => ({
        geocode: vi.fn((request, callback) => {
          callback([mockGeocoderResult], 'OK');
        })
      }))
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.google
    delete (window as any).google;
    // Mock environment variable
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should not render if API key is not provided', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    mockUseGoogleMaps.mockReturnValue(false);
    
    const { container } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render loading state when maps are not loaded', () => {
    mockUseGoogleMaps.mockReturnValue(false);
    
    const { container } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    expect(container.querySelector('.h-48.bg-gray-100')).toBeInTheDocument();
    expect(container.querySelector('.w-full.h-full')).toBeInTheDocument();
  });

  it('should initialize map when Google Maps is loaded', async () => {
    mockUseGoogleMaps.mockReturnValue(true);
    (window as any).google = mockGoogleMaps;
    
    render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Geocoder).toHaveBeenCalled();
      expect(mockGoogleMaps.maps.Map).toHaveBeenCalled();
      expect(mockGoogleMaps.maps.Marker).toHaveBeenCalled();
    });
  });

  it('should handle delayed Google Maps loading', async () => {
    mockUseGoogleMaps.mockReturnValue(true);
    // Initially, Google Maps is not available
    (window as any).google = undefined;
    
    const { rerender } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Simulate Google Maps becoming available after 200ms
    await new Promise(resolve => setTimeout(resolve, 200));
    (window as any).google = mockGoogleMaps;
    
    // Re-render to trigger effect
    rerender(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Geocoder).toHaveBeenCalled();
    }, { timeout: 6000 });
  });

  it('should handle geocoding errors gracefully', async () => {
    mockUseGoogleMaps.mockReturnValue(true);
    const mockGeocoderWithError = {
      ...mockGoogleMaps,
      maps: {
        ...mockGoogleMaps.maps,
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: vi.fn((request, callback) => {
            callback([], 'ZERO_RESULTS');
          })
        }))
      }
    };
    (window as any).google = mockGeocoderWithError;
    
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
    mockUseGoogleMaps.mockReturnValue(true);
    // Google Maps is not available initially
    (window as any).google = undefined;
    
    const { unmount } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Unmount before Google Maps loads
    unmount();
    
    // Set Google Maps after unmount
    await new Promise(resolve => setTimeout(resolve, 200));
    (window as any).google = mockGoogleMaps;
    
    // Geocoder should not be called after unmount
    expect(mockGoogleMaps.maps.Geocoder).not.toHaveBeenCalled();
  });

  it('should handle race condition when component re-renders quickly', async () => {
    mockUseGoogleMaps.mockReturnValue(true);
    (window as any).google = mockGoogleMaps;
    
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
      const geocodeCalls = mockGoogleMaps.maps.Geocoder.mock.results[0].value.geocode.mock.calls;
      const lastCall = geocodeCalls[geocodeCalls.length - 1];
      expect(lastCall[0].address).toBe('789 Final St');
    });
  });

  it('should wait for all Google Maps components to be available', async () => {
    mockUseGoogleMaps.mockReturnValue(true);
    
    // Simulate partial Google Maps loading
    (window as any).google = {
      maps: {
        // Only Map is available initially
        Map: mockGoogleMaps.maps.Map
      }
    };
    
    const { rerender } = render(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    // Add Geocoder after 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    (window as any).google.maps.Geocoder = mockGoogleMaps.maps.Geocoder;
    (window as any).google.maps.Marker = mockGoogleMaps.maps.Marker;
    
    // Re-render to trigger effect
    rerender(
      <GymMapWebComponent address="123 Test St" gymName="Test Gym" />
    );
    
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Geocoder).toHaveBeenCalled();
    });
  });
});