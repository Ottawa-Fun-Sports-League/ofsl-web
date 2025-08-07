import { X } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { UserFilters } from '../types';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filters: UserFilters;
  handleFilterChange: (filterKey: keyof UserFilters) => void;
  clearFilters: () => void;
  isAnyFilterActive: () => boolean;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  filters,
  handleFilterChange,
  clearFilters,
  isAnyFilterActive
}: MobileFilterDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        ></div>
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xs bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-[#6F6F6F]">User Filters</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Search Bar */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Search</h3>
            <Input
              placeholder="Search users by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Role Filters */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">User Role</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-admin"
                  checked={filters.administrator}
                  onChange={() => handleFilterChange('administrator')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-admin" className="text-[#6F6F6F]">
                  Administrator
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-facilitator"
                  checked={filters.facilitator}
                  onChange={() => handleFilterChange('facilitator')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-facilitator" className="text-[#6F6F6F]">
                  Facilitator
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-active"
                  checked={filters.activePlayer}
                  onChange={() => handleFilterChange('activePlayer')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-active" className="text-[#6F6F6F]">
                  Active Player
                </label>
              </div>
            </div>
          </div>

          {/* Sport Filters */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Sport Filters</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-volleyball-league"
                  checked={filters.volleyballPlayersInLeague}
                  onChange={() => handleFilterChange('volleyballPlayersInLeague')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-volleyball-league" className="text-[#6F6F6F]">
                  Volleyball (In League)
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-volleyball-all"
                  checked={filters.volleyballPlayersAll}
                  onChange={() => handleFilterChange('volleyballPlayersAll')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-volleyball-all" className="text-[#6F6F6F]">
                  Volleyball (All)
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-badminton-all"
                  checked={filters.badmintonPlayersAll}
                  onChange={() => handleFilterChange('badmintonPlayersAll')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-badminton-all" className="text-[#6F6F6F]">
                  Badminton (All)
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mobile-filter-not-in-league"
                  checked={filters.playersNotInLeague}
                  onChange={() => handleFilterChange('playersNotInLeague')}
                  className="mr-2"
                />
                <label htmlFor="mobile-filter-not-in-league" className="text-[#6F6F6F]">
                  Not in League
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 pb-8">
            <Button
              onClick={() => {
                clearFilters();
                onClose();
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] px-6 py-2.5"
              disabled={!isAnyFilterActive()}
            >
              Clear Filters
            </Button>
            <Button
              onClick={onClose}
              className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2.5"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
