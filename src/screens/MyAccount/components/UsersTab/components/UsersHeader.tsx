import { Button } from '../../../../../components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

interface UsersHeaderProps {
  userCount: number;
  onOpenMobileFilter: () => void;
  onRefresh: () => void;
}

export function UsersHeader({ userCount, onOpenMobileFilter, onRefresh }: UsersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Users</h2>
        </div>
        <Button
          onClick={onOpenMobileFilter}
          className="md:hidden bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-3 py-2 text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
        <div className="text-sm text-[#6F6F6F]">
          Total Users: {userCount}
        </div>
        <Button
          onClick={onRefresh}
          className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-4 py-2 text-sm"
        >
          Refresh Users
        </Button>
      </div>
    </div>
  );
}