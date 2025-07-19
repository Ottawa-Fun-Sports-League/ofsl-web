import { X, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    sport: string;
    location: string;
    skillLevels: string[];
    day: string;
  };
  handleFilterChange: (filterType: string, value: string) => void;
  clearFilters: () => void;
  sports: Array<{ id: number; name: string }>;
  skills: Array<{ id: number; name: string }>;
  filterOptions: {
    location: string[];
    day: string[];
  };
  isAnyFilterActive: () => boolean;
  clearSkillLevels: () => void;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  handleFilterChange,
  clearFilters,
  sports,
  skills,
  filterOptions,
  isAnyFilterActive,
  clearSkillLevels
}: MobileFilterDrawerProps) {
  const sportFilterOptions = ["All Sports", ...sports.map(sport => sport.name)];
  const skillFilterOptions = ["All Skill Levels", ...skills.map(skill => skill.name)];

  // Function to get sport icon based on sport type
  const getSportIcon = (sport: string | null) => {
    if (!sport) return "";
    switch (sport) {
      case 'Volleyball':
        return "/Volleyball.png";
      case 'Badminton':
        return "/Badminton.png";
      case 'Basketball':
        return "/Basketball.png";
      case 'Pickleball':
        return "/pickleball.png";
      default:
        return "";
    }
  };

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
          <h2 className="text-xl font-bold text-[#6F6F6F]">Filters</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Sport Filter Buttons */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Sport</h3>
            <div className="flex flex-wrap gap-2">
              {['Volleyball', 'Badminton', 'Pickleball'].map((sportName) => {
                const sport = sports.find(s => s.name === sportName);
                if (!sport) return null;
                
                return (
                  <Button
                    key={sport.id}
                    onClick={() => handleFilterChange('sport', sport.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                      filters.sport === sport.name 
                        ? 'border-[#B20000] bg-[#ffeae5] text-[#B20000]' 
                        : 'border-gray-300 bg-white text-[#6F6F6F]'
                    }`}
                  >
                    <img 
                      src={getSportIcon(sport.name)}
                      alt={`${sport.name} icon`}
                      className="w-5 h-5" 
                    />
                    <span className="font-medium">{sport.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Location</h3>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
            >
              {filterOptions.location.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Skill Level Filter */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Skill Level</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {skillFilterOptions.map((option) => (
                option === "All Skill Levels" ? (
                  <button
                    key={option}
                    className={`block w-full text-left py-1 transition-colors duration-200 ${
                      filters.skillLevels.length === 0 ? 'text-[#B20000] font-medium' : 'text-[#6F6F6F]'
                    }`}
                    onClick={clearSkillLevels}
                  >
                    {option}
                  </button>
                ) : (
                  <div key={option} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`mobile-skill-${option}`}
                      checked={filters.skillLevels.includes(option)}
                      onChange={() => handleFilterChange('skillLevel', option)}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    />
                    <label
                      htmlFor={`mobile-skill-${option}`}
                      className={`flex-1 cursor-pointer ${
                        filters.skillLevels.includes(option) ? 'text-[#B20000] font-medium' : 'text-[#6F6F6F]'
                      }`}
                    >
                      {option}
                    </label>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Day Filter */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Day</h3>
            <select
              value={filters.day}
              onChange={(e) => handleFilterChange('day', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
            >
              {filterOptions.day.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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