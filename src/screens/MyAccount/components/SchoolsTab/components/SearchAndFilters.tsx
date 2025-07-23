import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Filter, Search } from 'lucide-react';
import { SchoolFilters, Sport, DayOfWeek } from '../types';

interface SearchAndFiltersProps {
  searchTerm: string;
  filters: SchoolFilters;
  sports: Sport[];
  daysOfWeek: DayOfWeek[];
  isAnyFilterActive: boolean;
  gymCount: number;
  filteredGymCount: number;
  onSearchChange: (term: string) => void;
  onFilterChange: (filterType: keyof SchoolFilters, value: any) => void;
  onDayFilterToggle: (dayId: number) => void;
  onSportFilterToggle: (sportId: number) => void;
  onClearFilters: () => void;
}

export function SearchAndFilters({
  searchTerm,
  filters,
  sports,
  daysOfWeek,
  isAnyFilterActive,
  gymCount,
  filteredGymCount,
  onSearchChange,
  onFilterChange,
  onDayFilterToggle,
  onSportFilterToggle,
  onClearFilters
}: SearchAndFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 hidden md:block">
      <div className="flex items-center justify-between mb-4" style={{ minHeight: '40px' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#6F6F6F] flex-shrink-0" />
            <h3 className="text-lg font-medium text-[#6F6F6F] m-0 p-0" style={{ lineHeight: '1' }}>Search & Filters</h3>
          </div>
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
            <Input
              placeholder="Search schools by name or address..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-full h-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#6F6F6F] m-0 p-0" style={{ lineHeight: '1' }}>({filteredGymCount} of {gymCount})</span>
          {isAnyFilterActive && (
            <Button
              onClick={onClearFilters}
              className="text-sm text-[#B20000] hover:text-[#8A0000] bg-transparent hover:bg-transparent p-0 m-0"
              style={{ lineHeight: '1' }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Status Row */}
        <div className="flex items-center gap-6">
          <label className="text-sm font-medium text-[#6F6F6F] min-w-[100px]">Status:</label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="status-all"
                name="status"
                checked={filters.status === 'all'}
                onChange={() => onFilterChange('status', 'all')}
                className="mr-2"
              />
              <label htmlFor="status-all" className="text-sm text-[#6F6F6F]">
                All Schools
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="status-active"
                name="status"
                checked={filters.status === 'active'}
                onChange={() => onFilterChange('status', 'active')}
                className="mr-2"
              />
              <label htmlFor="status-active" className="text-sm text-[#6F6F6F]">
                Active Only
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="status-inactive"
                name="status"
                checked={filters.status === 'inactive'}
                onChange={() => onFilterChange('status', 'inactive')}
                className="mr-2"
              />
              <label htmlFor="status-inactive" className="text-sm text-[#6F6F6F]">
                Inactive Only
              </label>
            </div>
          </div>
        </div>

        {/* Available Days Row */}
        <div className="flex items-center gap-6">
          <label className="text-sm font-medium text-[#6F6F6F] min-w-[100px]">Available Days:</label>
          <div className="flex flex-wrap gap-3">
            {daysOfWeek.map((day) => (
              <div key={day.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`filter-day-${day.id}`}
                  checked={filters.days.includes(day.id)}
                  onChange={() => onDayFilterToggle(day.id)}
                  className="mr-2"
                />
                <label htmlFor={`filter-day-${day.id}`} className="text-sm text-[#6F6F6F]">
                  {day.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Available Sports Row */}
        <div className="flex items-center gap-6">
          <label className="text-sm font-medium text-[#6F6F6F] min-w-[100px]">Available Sports:</label>
          <div className="flex flex-wrap gap-3">
            {sports.map((sport) => (
              <div key={sport.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`filter-sport-${sport.id}`}
                  checked={filters.sports.includes(sport.id)}
                  onChange={() => onSportFilterToggle(sport.id)}
                  className="mr-2"
                />
                <label htmlFor={`filter-sport-${sport.id}`} className="text-sm text-[#6F6F6F]">
                  {sport.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}