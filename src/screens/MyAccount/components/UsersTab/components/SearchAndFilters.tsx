import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Search } from 'lucide-react';
import { UserFilters } from '../types';

interface SearchAndFiltersProps {
  searchTerm: string;
  filters: UserFilters;
  isAnyFilterActive: boolean;
  onSearchChange: (term: string) => void;
  onFilterChange: (filterKey: keyof UserFilters) => void;
  onClearFilters: () => void;
}

export function SearchAndFilters({
  searchTerm,
  filters,
  isAnyFilterActive,
  onSearchChange,
  onFilterChange,
  onClearFilters
}: SearchAndFiltersProps) {
  return (
    <>
      <div className="hidden md:flex items-center gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
          <Input
            placeholder="Search users by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {/* Role Filters */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="filter-admin"
              checked={filters.administrator}
              onChange={() => onFilterChange('administrator')}
              className="mr-2"
            />
            <label htmlFor="filter-admin" className="text-sm text-[#6F6F6F]">
              Administrator
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="filter-facilitator"
              checked={filters.facilitator}
              onChange={() => onFilterChange('facilitator')}
              className="mr-2"
            />
            <label htmlFor="filter-facilitator" className="text-sm text-[#6F6F6F]">
              Facilitator
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="filter-active"
              checked={filters.activePlayer}
              onChange={() => onFilterChange('activePlayer')}
              className="mr-2"
            />
            <label htmlFor="filter-active" className="text-sm text-[#6F6F6F]">
              Active Player
            </label>
          </div>
          
          {/* Participation */}
          <div className="border-l pl-4 flex flex-wrap gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="filter-not-in-league"
                checked={filters.playersNotInLeague}
                onChange={() => onFilterChange('playersNotInLeague')}
                className="mr-2"
              />
              <label htmlFor="filter-not-in-league" className="text-sm text-[#6F6F6F]">
                Not in League
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {isAnyFilterActive && (
        <div className="hidden md:flex justify-start">
          <Button
            onClick={onClearFilters}
            className="text-sm text-[#B20000] hover:text-[#8A0000] bg-transparent hover:bg-transparent p-0"
          >
            Clear all filters
          </Button>
        </div>
      )}

      <div className="md:hidden mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        {isAnyFilterActive && (
          <div className="flex justify-start">
            <Button
              onClick={onClearFilters}
              className="text-sm text-[#B20000] hover:text-[#8A0000] bg-transparent hover:bg-transparent p-0"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
