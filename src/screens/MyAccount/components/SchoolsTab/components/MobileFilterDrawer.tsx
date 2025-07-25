import { X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filters: {
    status: "all" | "active" | "inactive";
    days: number[];
    sports: number[];
  };
  handleFilterChange: (filterType: keyof typeof filters, value: string) => void;
  handleDayFilterToggle: (dayId: number) => void;
  handleSportFilterToggle: (sportId: number) => void;
  clearFilters: () => void;
  daysOfWeek: Array<{ id: number; name: string }>;
  sports: Array<{ id: number; name: string }>;
  isAnyFilterActive: () => boolean;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  filters,
  handleFilterChange,
  handleDayFilterToggle,
  handleSportFilterToggle,
  clearFilters,
  daysOfWeek,
  sports,
  isAnyFilterActive,
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
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-[#6F6F6F]">School Filters</h2>
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
              placeholder="Search schools by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="mobile-status-all"
                  name="mobile-status"
                  checked={filters.status === "all"}
                  onChange={() => handleFilterChange("status", "all")}
                  className="mr-2"
                />
                <label htmlFor="mobile-status-all" className="text-[#6F6F6F]">
                  All Gyms
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="mobile-status-active"
                  name="mobile-status"
                  checked={filters.status === "active"}
                  onChange={() => handleFilterChange("status", "active")}
                  className="mr-2"
                />
                <label
                  htmlFor="mobile-status-active"
                  className="text-[#6F6F6F]"
                >
                  Active Only
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="mobile-status-inactive"
                  name="mobile-status"
                  checked={filters.status === "inactive"}
                  onChange={() => handleFilterChange("status", "inactive")}
                  className="mr-2"
                />
                <label
                  htmlFor="mobile-status-inactive"
                  className="text-[#6F6F6F]"
                >
                  Inactive Only
                </label>
              </div>
            </div>
          </div>

          {/* Days Filter */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">
              Available Days
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {daysOfWeek.map((day) => (
                <div key={day.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`mobile-filter-day-${day.id}`}
                    checked={filters.days.includes(day.id)}
                    onChange={() => handleDayFilterToggle(day.id)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`mobile-filter-day-${day.id}`}
                    className="text-[#6F6F6F]"
                  >
                    {day.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sports Filter */}
          <div>
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-3">
              Available Sports
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sports.map((sport) => (
                <div key={sport.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`mobile-filter-sport-${sport.id}`}
                    checked={filters.sports.includes(sport.id)}
                    onChange={() => handleSportFilterToggle(sport.id)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`mobile-filter-sport-${sport.id}`}
                    className="text-[#6F6F6F]"
                  >
                    {sport.name}
                  </label>
                </div>
              ))}
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

