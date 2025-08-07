import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { UserFilters } from '../types';

interface ImprovedFiltersProps {
  searchTerm: string;
  filters: UserFilters;
  isAnyFilterActive: boolean;
  onSearchChange: (term: string) => void;
  onFilterChange: (filterKey: keyof UserFilters) => void;
  onClearFilters: () => void;
}

type FilterCategory = 'role' | 'sport' | 'status';

interface FilterOption {
  key: keyof UserFilters;
  label: string;
  category: FilterCategory;
  description?: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  // Role filters
  { key: 'administrator', label: 'Administrator', category: 'role' },
  { key: 'facilitator', label: 'Facilitator', category: 'role' },
  
  // Sport filters
  { key: 'volleyballPlayersInLeague', label: 'Volleyball (Active)', category: 'sport', description: 'Currently in a volleyball league' },
  { key: 'volleyballPlayersAll', label: 'Volleyball (All)', category: 'sport', description: 'Has volleyball skills' },
  { key: 'badmintonPlayersInLeague', label: 'Badminton (Active)', category: 'sport', description: 'Currently in a badminton league' },
  { key: 'badmintonPlayersAll', label: 'Badminton (All)', category: 'sport', description: 'Has badminton skills' },
  
  // Status filters
  { key: 'activePlayer', label: 'Active Player', category: 'status', description: 'Part of at least one team' },
  { key: 'playersNotInLeague', label: 'Not in League', category: 'status', description: 'Registered but not in active leagues' },
];

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  role: 'User Role',
  sport: 'Sport',
  status: 'Status'
};

export function ImprovedFilters({
  searchTerm,
  filters,
  isAnyFilterActive,
  onSearchChange,
  onFilterChange,
  onClearFilters
}: ImprovedFiltersProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory | null>(null);

  const activeFilters = FILTER_OPTIONS.filter(option => filters[option.key]);
  const filterCount = activeFilters.length;

  const getCategoryOptions = (category: FilterCategory) => {
    return FILTER_OPTIONS.filter(option => option.category === category);
  };

  const handleFilterClick = (filterKey: keyof UserFilters) => {
    onFilterChange(filterKey);
  };

  const removeFilter = (filterKey: keyof UserFilters, e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterChange(filterKey);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Button Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
          <Input
            placeholder="Search users by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full h-10"
          />
        </div>

        {/* Filter Dropdown Button */}
        <div className="relative">
          <Button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`h-10 px-4 flex items-center gap-2 ${
              filterCount > 0 
                ? 'bg-[#B20000] hover:bg-[#8A0000] text-white' 
                : 'bg-white hover:bg-gray-50 text-[#6F6F6F] border border-[#D4D4D4]'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {filterCount > 0 && (
              <span className="bg-white text-[#B20000] rounded-full px-2 py-0.5 text-xs font-medium">
                {filterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </Button>

          {/* Filter Dropdown */}
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                <div className="p-4">
                  <h3 className="font-semibold text-[#6F6F6F] mb-3">Filter by</h3>
                  
                  {/* Category Tabs */}
                  <div className="flex gap-2 mb-4">
                    {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(
                          selectedCategory === category ? null : category as FilterCategory
                        )}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-[#B20000] text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-[#6F6F6F]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Filter Options */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedCategory ? (
                      getCategoryOptions(selectedCategory).map(option => (
                        <label
                          key={option.key}
                          className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={filters[option.key]}
                            onChange={() => handleFilterClick(option.key)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-[#6F6F6F]">
                              {option.label}
                            </div>
                            {option.description && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {option.description}
                              </div>
                            )}
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Select a category to view filters
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isAnyFilterActive && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => {
                          onClearFilters();
                          setShowDropdown(false);
                        }}
                        className="w-full h-9 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        Clear all filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <div
              key={filter.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B20000]/10 text-[#B20000] rounded-full text-sm"
            >
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">
                {CATEGORY_LABELS[filter.category]}:
              </span>
              <span>{filter.label}</span>
              <button
                onClick={(e) => removeFilter(filter.key, e)}
                className="ml-1 hover:bg-[#B20000]/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={onClearFilters}
            className="text-sm text-[#B20000] hover:text-[#8A0000] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}