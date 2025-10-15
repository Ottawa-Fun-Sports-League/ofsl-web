import { Button } from '../../../../../components/ui/button';
import { SlidersHorizontal, Download, Mail, MailPlus, MailX, Users2 } from 'lucide-react';

interface UsersHeaderProps {
  userCount: number;
  onOpenMobileFilter: () => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onSendBulkEmail: () => void;
  onAddFilteredToBulkQueue: () => void;
  onClearBulkEmailQueue: () => void;
  onViewBulkEmailQueue: () => void;
  manualQueueCount: number;
  activeFilterCount?: number;
}

export function UsersHeader({ userCount, onOpenMobileFilter, onRefresh, onExportCSV, onSendBulkEmail, onAddFilteredToBulkQueue, onClearBulkEmailQueue, onViewBulkEmailQueue, manualQueueCount, activeFilterCount = 0 }: UsersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pb-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Users</h2>
        </div>
        <Button
          onClick={onOpenMobileFilter}
          className="md:hidden relative bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-3 py-2 text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-[#B20000] text-xs rounded-full h-5 w-5 flex items-center justify-center border border-[#B20000]">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
        <div className="text-sm text-[#6F6F6F] text-right md:text-left">Filtered Users: {userCount}</div>
        <div className="flex gap-2">
          <Button
            onClick={onViewBulkEmailQueue}
            className="bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-[10px] px-3 md:px-4 py-2 text-sm flex items-center gap-2"
            disabled={manualQueueCount === 0}
          >
            <Users2 className="h-4 w-4" />
            <span className="hidden md:inline">View Queue</span>
            {manualQueueCount > 0 && (
              <span className="text-xs font-semibold">({manualQueueCount})</span>
            )}
          </Button>
          <Button
            onClick={onAddFilteredToBulkQueue}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] px-3 md:px-4 py-2 text-sm flex items-center gap-2"
            disabled={userCount === 0}
          >
            <MailPlus className="h-4 w-4" />
            <span className="hidden md:inline">Add Filtered to Queue</span>
          </Button>
          <Button
            onClick={onClearBulkEmailQueue}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-[10px] px-3 md:px-4 py-2 text-sm flex items-center gap-2"
            disabled={manualQueueCount === 0}
          >
            <MailX className="h-4 w-4" />
            <span className="hidden md:inline">Clear Queue</span>
            {manualQueueCount > 0 && (
              <span className="text-xs font-semibold text-gray-600">({manualQueueCount})</span>
            )}
          </Button>
          <Button
            onClick={onSendBulkEmail}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-3 md:px-4 py-2 text-sm flex items-center gap-2"
            disabled={userCount === 0}
          >
            <Mail className="h-4 w-4" />
            <span className="hidden md:inline">Bulk Email</span>
          </Button>
          <Button
            onClick={onExportCSV}
            className="bg-gray-600 hover:bg-gray-700 text-white rounded-[10px] px-3 md:px-4 py-2 text-sm flex items-center gap-2"
            disabled={userCount === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export CSV</span>
          </Button>
          <Button
            onClick={onRefresh}
            className="bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-4 py-2 text-sm"
          >
            Refresh Users
          </Button>
        </div>
      </div>
    </div>
  );
}
