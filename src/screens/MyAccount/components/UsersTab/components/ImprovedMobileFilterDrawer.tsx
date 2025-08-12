import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { UserFilters } from '../types';

interface ImprovedMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UserFilters;
  handleFilterChange: (filterKey: keyof UserFilters) => void;
  clearFilters: () => void;
  isAnyFilterActive: () => boolean;
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
  { key: 'volleyballPlayersInLeague', label: 'Volleyball (Active)', category: 'sport', description: 'In volleyball league' },
  { key: 'volleyballPlayersAll', label: 'Volleyball (All)', category: 'sport', description: 'Has volleyball skills' },
  { key: 'badmintonPlayersInLeague', label: 'Badminton (Active)', category: 'sport', description: 'In badminton league' },
  { key: 'badmintonPlayersAll', label: 'Badminton (All)', category: 'sport', description: 'Has badminton skills' },
  
  // Status filters
  { key: 'activePlayer', label: 'Active Player', category: 'status', description: 'Currently on a team in an active league' },
  { key: 'playersNotInLeague', label: 'Not in League', category: 'status', description: 'Previously on teams but not in active leagues' },
  { key: 'pendingUsers', label: 'Pending Users', category: 'status', description: 'Users who have not completed their profile' },
];

const CATEGORY_CONFIG = {
  role: { 
    label: 'User Role', 
    icon: '👤',
    description: 'Filter by user permissions'
  },
  sport: { 
    label: 'Sport', 
    icon: '🏐',
    description: 'Filter by sport participation'
  },
  status: { 
    label: 'Status', 
    icon: '📊',
    description: 'Filter by player status'
  }
};

export function ImprovedMobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  handleFilterChange,
  clearFilters,
  isAnyFilterActive
}: ImprovedMobileFilterDrawerProps) {
  const [expandedCategory, setExpandedCategory] = useState<FilterCategory | null>(null);

  const getCategoryOptions = (category: FilterCategory) => {
    return FILTER_OPTIONS.filter(option => option.category === category);
  };

  const getCategoryActiveCount = (category: FilterCategory) => {
    return getCategoryOptions(category).filter(option => filters[option.key]).length;
  };

  const totalActiveFilters = FILTER_OPTIONS.filter(option => filters[option.key]).length;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-[#6F6F6F]">Filters</h2>
            {totalActiveFilters > 0 && (
              <p className="text-sm text-[#B20000] mt-0.5">
                {totalActiveFilters} filter{totalActiveFilters > 1 ? 's' : ''} active
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filter Categories */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const categoryKey = category as FilterCategory;
            const activeCount = getCategoryActiveCount(categoryKey);
            const isExpanded = expandedCategory === categoryKey;
            const categoryOptions = getCategoryOptions(categoryKey);

            return (
              <div key={category} className="border-b border-gray-200">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="text-left">
                      <div className="font-medium text-[#6F6F6F]">
                        {config.label}
                        {activeCount > 0 && (
                          <span className="ml-2 bg-[#B20000] text-white text-xs rounded-full px-2 py-0.5">
                            {activeCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{config.description}</div>
                    </div>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Category Options */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-1">
                    {categoryOptions.map(option => (
                      <label
                        key={option.key}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters[option.key]}
                          onChange={() => handleFilterChange(option.key)}
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {isAnyFilterActive() && (
            <Button
              onClick={() => {
                clearFilters();
                setExpandedCategory(null);
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px]"
            >
              Clear All Filters
            </Button>
          )}
          <Button
            onClick={onClose}
            className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px]"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}