import { render, waitFor, screen } from '@testing-library/react';
import { GymMapWebComponent } from './GymMapWebComponent';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGoogleMaps } from '../../../hooks/useGoogleMaps';

// Mock the useGoogleMaps hook
vi.mock('../../../hooks/useGoogleMaps', () => ({
  useGoogleMaps: vi.fn()
}));

// Mock environment variable
vi.stubGlobal('import.meta.env', {
  VITE_GOOGLE_MAPS_API_KEY: 'test-api-key'
});

describe('GymMapWebComponent Integration', () => {
  let mockGoogleMaps: {
    maps: {
      Map: ReturnType<typeof vi.fn>;
      Marker: ReturnType<typeof vi.fn>;
      Geocoder: ReturnType<typeof vi.fn>;
      Animation: {
        DROP: string;
      };
      event: {
        clearInstanceListeners: ReturnType<typeof vi.fn>;
      };
    };
  };
  const mockUseGoogleMaps = vi.mocked(useGoogleMaps);

  beforeEach(() => {
    
    // Setup mock Google Maps API
    mockGoogleMaps = {
      maps: {
        Map: vi.fn().mockImplementation(() => ({})),
        Marker: vi.fn().mockImplementation(() => ({})),
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: vi.fn()
        })),
        Animation: {
          DROP: 'DROP'
        },
        event: {
          clearInstanceListeners: vi.fn()
        }
      }
    };
    
    window.google = mockGoogleMaps;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.google;
  });

  it('shows loading state initially', () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: false, error: null });
    
    render(<GymMapWebComponent address="123 Test St" gymName="Test Gym" />);
    
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('shows error state when Google Maps fails to load', () => {
    mockUseGoogleMaps.mockReturnValue({ 
      loaded: false, 
      error: new Error('Failed to load Google Maps script') 
    });
    
    render(<GymMapWebComponent address="123 Test St" gymName="Test Gym" />);
    
    expect(screen.getByText('Unable to load map')).toBeInTheDocument();
    expect(screen.getByText('Failed to load Google Maps script')).toBeInTheDocument();
  });

  it('shows error when geocoding fails', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    
    const mockGeocode = vi.fn((_request, callback) => {
      callback([], 'ZERO_RESULTS');
    });
    
    mockGoogleMaps.maps.Geocoder.mockImplementation(() => ({
      geocode: mockGeocode
    }));
    
    render(<GymMapWebComponent address="Invalid Address" gymName="Test Gym" />);
    
    await waitFor(() => {
      expect(screen.getByText('Unable to load map')).toBeInTheDocument();
      expect(screen.getByText('Address not found')).toBeInTheDocument();
    });
  });

  it('successfully loads map with valid address', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    
    const mockLocation = { lat: 45.4215, lng: -75.6972 };
    const mockGeocode = vi.fn((_request, callback) => {
      callback([{
        geometry: {
          location: mockLocation
        }
      }], 'OK');
    });
    
    mockGoogleMaps.maps.Geocoder.mockImplementation(() => ({
      geocode: mockGeocode
    }));
    
    render(<GymMapWebComponent address="123 Test St, Ottawa" gymName="Test Gym" />);
    
    await waitFor(() => {
      expect(mockGeocode).toHaveBeenCalledWith(
        { address: '123 Test St, Ottawa' },
        expect.any(Function)
      );
      expect(mockGoogleMaps.maps.Map).toHaveBeenCalled();
      expect(mockGoogleMaps.maps.Marker).toHaveBeenCalledWith(
        expect.objectContaining({
          position: mockLocation,
          title: 'Test Gym'
        })
      );
    });
    
    // Should not show loading or error states
    expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to load map')).not.toBeInTheDocument();
  });

  it('handles component unmounting during geocoding', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    
    let geocodeCallback: (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => void;
    const mockGeocode = vi.fn((_request, callback) => {
      geocodeCallback = callback;
    });
    
    mockGoogleMaps.maps.Geocoder.mockImplementation(() => ({
      geocode: mockGeocode
    }));
    
    const { unmount } = render(<GymMapWebComponent address="123 Test St" gymName="Test Gym" />);
    
    // Wait for geocode to be called
    await waitFor(() => {
      expect(mockGeocode).toHaveBeenCalled();
    });
    
    // Unmount component before geocoding completes
    unmount();
    
    // Complete geocoding after unmount
    geocodeCallback([{
      geometry: {
        location: { lat: 45.4215, lng: -75.6972 }
      }
    }], 'OK');
    
    // Map should not be created
    expect(mockGoogleMaps.maps.Map).not.toHaveBeenCalled();
  });

  it('cleans up map instance on unmount', async () => {
    mockUseGoogleMaps.mockReturnValue({ loaded: true, error: null });
    
    const mockGeocode = vi.fn((_request, callback) => {
      callback([{
        geometry: {
          location: { lat: 45.4215, lng: -75.6972 }
        }
      }], 'OK');
    });
    
    mockGoogleMaps.maps.Geocoder.mockImplementation(() => ({
      geocode: mockGeocode
    }));
    
    const { unmount } = render(<GymMapWebComponent address="123 Test St" gymName="Test Gym" />);
    
    await waitFor(() => {
      expect(mockGoogleMaps.maps.Map).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(mockGoogleMaps.maps.event.clearInstanceListeners).toHaveBeenCalled();
  });
});