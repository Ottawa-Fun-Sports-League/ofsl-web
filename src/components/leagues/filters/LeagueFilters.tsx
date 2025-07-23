import { Button } from '../../ui/button';
import { X, Filter } from 'lucide-react';
import { SportFilter } from './SportFilter';
import { FilterDropdown } from './FilterDropdown';
import { SkillLevelFilter } from './SkillLevelFilter';
import { FilterOptions, LeagueFilters as LeagueFiltersType } from './types';

interface Sport {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
}

interface LeagueFiltersProps {
  filters: LeagueFiltersType;
  filterOptions: FilterOptions;
  sports: Sport[];
  skills: Skill[];
  openDropdown: string | null;
  dropdownRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onFilterChange: (filterType: keyof LeagueFiltersType, value: string | string[]) => void;
  onToggleDropdown: (dropdown: string) => void;
  onClearFilters: () => void;
  onClearSkillLevels: () => void;
  isAnyFilterActive: () => boolean;
  onShowMobileFilters?: () => void;
  getSportIcon: (sport: string) => string;
  hideOnMobile?: boolean;
}

export function LeagueFilters({
  filters,
  filterOptions,
  sports,
  skills,
  openDropdown,
  dropdownRefs,
  onFilterChange,
  onToggleDropdown,
  onClearFilters,
  onClearSkillLevels,
  isAnyFilterActive,
  onShowMobileFilters,
  getSportIcon,
  hideOnMobile = true
}: LeagueFiltersProps) {
  const skillNames = skills.map(s => s.name);
  
  return (
    <>
      {/* Mobile Filter Button */}
      {onShowMobileFilters && (
        <div className="flex justify-center mb-8 md:hidden">
          <Button
            onClick={onShowMobileFilters}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters {isAnyFilterActive() && <span className="ml-1 bg-white text-[#B20000] text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
          </Button>
        </div>
      )}

      {/* Filters Section */}
      <div className={`mb-16 ${hideOnMobile ? 'hidden md:block' : ''}`}>
        {/* Sport Filter Buttons */}
        <SportFilter
          sports={sports}
          selectedSport={filters.sport}
          onSportChange={(sport) => onFilterChange('sport', sport)}
          getSportIcon={getSportIcon}
        />
        
        {/* Dropdown Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {/* Location Filter */}
          <FilterDropdown
            label="Location"
            value={filters.location}
            options={filterOptions.location}
            isActive={filters.location !== "All Locations"}
            isOpen={openDropdown === 'location'}
            onToggle={() => onToggleDropdown('location')}
            onChange={(value) => onFilterChange('location', value)}
            dropdownRef={(el) => dropdownRefs.current['location'] = el}
          />
          
          {/* Skill Level Filter */}
          <SkillLevelFilter
            selectedSkills={filters.skillLevels}
            availableSkills={skillNames}
            isOpen={openDropdown === 'skillLevels'}
            onToggle={() => onToggleDropdown('skillLevels')}
            onChange={(skill) => onFilterChange('skillLevels', skill)}
            onClear={onClearSkillLevels}
            dropdownRef={(el) => dropdownRefs.current['skillLevels'] = el}
          />
          
          {/* Day Filter */}
          <FilterDropdown
            label="Day"
            value={filters.day}
            options={filterOptions.day}
            isActive={filters.day !== "All Days"}
            isOpen={openDropdown === 'day'}
            onToggle={() => onToggleDropdown('day')}
            onChange={(value) => onFilterChange('day', value)}
            dropdownRef={(el) => dropdownRefs.current['day'] = el}
          />
          
          {/* Type Filter */}
          <FilterDropdown
            label="Type"
            value={filters.type}
            options={filterOptions.type}
            isActive={filters.type !== "All Types"}
            isOpen={openDropdown === 'type'}
            onToggle={() => onToggleDropdown('type')}
            onChange={(value) => onFilterChange('type', value)}
            dropdownRef={(el) => dropdownRefs.current['type'] = el}
          />
          
          {/* Gender Filter */}
          <FilterDropdown
            label="Gender"
            value={filters.gender}
            options={filterOptions.gender}
            isActive={filters.gender !== "All Genders"}
            isOpen={openDropdown === 'gender'}
            onToggle={() => onToggleDropdown('gender')}
            onChange={(value) => onFilterChange('gender', value)}
            dropdownRef={(el) => dropdownRefs.current['gender'] = el}
          />
        </div>
        
        {/* Clear Filters Button */}
        {isAnyFilterActive() && (
          <div className="flex justify-center">
            <Button
              onClick={onClearFilters}
              variant="outline"
              className="flex items-center gap-2 border-[#B20000] text-[#B20000] hover:bg-[#ffeae5] rounded-[10px] px-4 py-2"
            >
              <X className="h-4 w-4" />
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </>
  );
}