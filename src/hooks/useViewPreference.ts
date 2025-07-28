import { useState, useEffect } from 'react';

type ViewMode = 'card' | 'list' | 'table';

interface UseViewPreferenceOptions {
  key: string;
  defaultView?: ViewMode;
}

export function useViewPreference({ 
  key, 
  defaultView = 'card' 
}: UseViewPreferenceOptions): [ViewMode, (view: ViewMode) => void] {
  // Initialize state from localStorage or default
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(`viewPreference:${key}`);
      if (stored && ['card', 'list', 'table'].includes(stored)) {
        return stored as ViewMode;
      }
    } catch (error) {
      console.error('Error reading view preference from localStorage:', error);
    }
    return defaultView;
  });

  // Update localStorage when view mode changes
  useEffect(() => {
    try {
      localStorage.setItem(`viewPreference:${key}`, viewMode);
    } catch (error) {
      console.error('Error saving view preference to localStorage:', error);
    }
  }, [key, viewMode]);

  return [viewMode, setViewMode];
}