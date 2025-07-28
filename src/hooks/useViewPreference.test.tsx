import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useViewPreference } from './useViewPreference';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('useViewPreference', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should return default view when no preference is stored', () => {
    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    expect(result.current[0]).toBe('card');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('viewPreference:test-key');
  });

  it('should return stored preference when available', () => {
    localStorageMock.getItem.mockReturnValue('list');

    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    expect(result.current[0]).toBe('list');
  });

  it('should update localStorage when view changes', () => {
    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    act(() => {
      result.current[1]('list');
    });

    expect(result.current[0]).toBe('list');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('viewPreference:test-key', 'list');
  });

  it('should handle invalid stored values gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-view');

    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    expect(result.current[0]).toBe('card'); // Falls back to default
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock console.error to avoid test output noise
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage not available');
    });

    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    expect(result.current[0]).toBe('card');
    expect(consoleError).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });

  it('should handle localStorage setItem errors gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('localStorage is full');
    });

    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    act(() => {
      result.current[1]('list');
    });

    expect(result.current[0]).toBe('list'); // State still updates
    expect(consoleError).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });

  it('should use unique keys for different components', () => {
    renderHook(() => useViewPreference({ key: 'leagues', defaultView: 'card' }));
    renderHook(() => useViewPreference({ key: 'teams', defaultView: 'list' }));

    expect(localStorageMock.getItem).toHaveBeenCalledWith('viewPreference:leagues');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('viewPreference:teams');
  });

  it('should support table view mode', () => {
    localStorageMock.getItem.mockReturnValue('table');

    const { result } = renderHook(() => 
      useViewPreference({ key: 'test-key', defaultView: 'card' })
    );

    expect(result.current[0]).toBe('table');
  });
});