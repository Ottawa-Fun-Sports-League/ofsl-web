import { useState, useRef, useEffect } from 'react';
import { LeagueFilters, DEFAULT_FILTERS } from './types';

export function useLeagueFilters() {
  const [filters, setFilters] = useState<LeagueFilters>(DEFAULT_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    setFilters(DEFAULT_FILTERS);
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