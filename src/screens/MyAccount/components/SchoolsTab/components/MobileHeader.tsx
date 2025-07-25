import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { SlidersHorizontal, Search } from "lucide-react";

interface MobileHeaderProps {
  searchTerm: string;
  isAnyFilterActive: boolean;
  onSearchChange: (term: string) => void;
  onOpenFilterDrawer: () => void;
  onClearFilters: () => void;
  onAddSchool: () => void;
}

export function MobileHeader({
  searchTerm,
  isAnyFilterActive,
  onSearchChange,
  onOpenFilterDrawer,
  onClearFilters,
  onAddSchool,
}: MobileHeaderProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Gyms</h2>
          </div>
          <Button
            onClick={onOpenFilterDrawer}
            className="md:hidden bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-3 py-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <Button
            onClick={onAddSchool}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-6 py-2"
          >
            Add School
          </Button>
        </div>
      </div>

      <div className="md:hidden mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6F6F6F]" />
          <Input
            placeholder="Search schools..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        {isAnyFilterActive && (
          <div className="flex justify-start mt-2">
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

