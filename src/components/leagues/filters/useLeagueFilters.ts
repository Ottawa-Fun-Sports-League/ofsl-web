import { useState, useRef, useEffect } from 'react';
import { LeagueFilters, DEFAULT_FILTERS } from './types';

type StorageType = 'session' | 'local';

interface UseLeagueFiltersConfig {
  storageKey?: string;
  storage?: StorageType;
  initialFilters?: LeagueFilters;
}

export function useLeagueFilters(config: UseLeagueFiltersConfig = {}) {
  const { storageKey, storage = 'session', initialFilters = DEFAULT_FILTERS } = config;
  const storageKeyName = storageKey ?? null;

  const getStorage = (): Storage | null => {
    if (!storageKeyName || typeof window === 'undefined') {
      return null;
    }
    try {
      return storage === 'local' ? window.localStorage : window.sessionStorage;
    } catch (error) {
      console.error('Error accessing storage for league filters:', error);
      return null;
    }
  };

  const readStoredFilters = (): LeagueFilters => {
    const fallback = { ...initialFilters, skillLevels: [...initialFilters.skillLevels] };
    const storageSource = getStorage();

    if (!storageSource) {
      return fallback;
    }

    try {
      const storedValue = storageSource.getItem(storageKeyName!);
      if (!storedValue) {
        return fallback;
      }

      const parsed = JSON.parse(storedValue) as Partial<LeagueFilters> | null;
      if (!parsed || typeof parsed !== 'object') {
        return fallback;
      }

      const sanitized: LeagueFilters = {
        sport: typeof parsed.sport === 'string' ? parsed.sport : fallback.sport,
        location: typeof parsed.location === 'string' ? parsed.location : fallback.location,
        skillLevels: Array.isArray(parsed.skillLevels)
          ? parsed.skillLevels.filter((level): level is string => typeof level === 'string')
          : [...fallback.skillLevels],
        day: typeof parsed.day === 'string' ? parsed.day : fallback.day,
        type: typeof parsed.type === 'string' ? parsed.type : fallback.type,
        gender: typeof parsed.gender === 'string' ? parsed.gender : fallback.gender,
      };

      return sanitized;
    } catch (error) {
      console.error('Error parsing stored league filters:', error);
      return fallback;
    }
  };

  const [filters, setFilters] = useState<LeagueFilters>(() => readStoredFilters());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const storageSource = getStorage();
    if (!storageSource) {
      return;
    }

    try {
      storageSource.setItem(storageKeyName!, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving league filters to storage:', error);
    }
  }, [filters, storageKeyName, storage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const handleFilterChange = (filterType: keyof LeagueFilters, value: string | string[]) => {
    if (filterType === 'skillLevels') {
      const newSkillLevels = [...filters.skillLevels];
      if (newSkillLevels.includes(value as string)) {
        const index = newSkillLevels.indexOf(value as string);
        newSkillLevels.splice(index, 1);
      } else {
        newSkillLevels.push(value as string);
      }
      setFilters(prev => ({ ...prev, skillLevels: newSkillLevels }));
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
    setOpenDropdown(null);
  };

  const clearFilters = () => {
    setFilters({ ...initialFilters, skillLevels: [...initialFilters.skillLevels] });
  };

  const clearSkillLevels = () => {
    setFilters(prev => ({ ...prev, skillLevels: [] }));
  };

  const isAnyFilterActive = () => {
    return filters.sport !== "All Sports" ||
           filters.location !== "All Locations" ||
           filters.skillLevels.length > 0 ||
           filters.day !== "All Days" ||
           filters.type !== "All Types" ||
           filters.gender !== "All Genders";
  };

  return {
    filters,
    setFilters,
    openDropdown,
    setOpenDropdown,
    showMobileFilterDrawer,
    setShowMobileFilterDrawer,
    dropdownRefs,
    toggleDropdown,
    handleFilterChange,
    clearFilters,
    clearSkillLevels,
    isAnyFilterActive
  };
}
