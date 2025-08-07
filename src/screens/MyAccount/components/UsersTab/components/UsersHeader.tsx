import { Button } from '../../../../../components/ui/button';
import { Filter, RefreshCw } from 'lucide-react';

interface UsersHeaderProps {
  userCount: number;
  onOpenMobileFilter: () => void;
  onRefresh: () => void;
  activeFilterCount?: number;
}

export function UsersHeader({ userCount, onOpenMobileFilter, onRefresh, activeFilterCount = 0 }: UsersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div className="flex items-center gap-2 justify-between">
        <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Users</h2>
        <Button
          onClick={onOpenMobileFilter}
          className="md:hidden relative bg-white hover:bg-gray-50 text-[#6F6F6F] border border-[#D4D4D4] rounded-[10px] px-3 py-2"
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#B20000] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-3">
        <div className="text-sm text-[#6F6F6F]">
          {userCount} user{userCount !== 1 ? 's' : ''}
        </div>
        <Button
          onClick={onRefresh}
          className="bg-white hover:bg-gray-50 text-[#6F6F6F] border border-[#D4D4D4] rounded-[10px] px-3 py-2 text-sm flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}