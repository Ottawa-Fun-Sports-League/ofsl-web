import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../../components/ui/dialog';
import { Button } from '../../../../../components/ui/button';
import { Checkbox } from '../../../../../components/ui/checkbox';
import { Download } from 'lucide-react';

export interface ExportColumn {
  key: string;
  label: string;
  defaultSelected: boolean;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'Name', defaultSelected: true },
  { key: 'email', label: 'Email', defaultSelected: true },
  { key: 'phone', label: 'Phone', defaultSelected: true },
  { key: 'status', label: 'Status', defaultSelected: true },
  { key: 'admin', label: 'Admin', defaultSelected: true },
  { key: 'facilitator', label: 'Facilitator', defaultSelected: true },
  { key: 'registrations', label: 'Registrations', defaultSelected: true },
  { key: 'sports', label: 'Sports', defaultSelected: true },
  { key: 'total_owed', label: 'Total Owed (incl. 13% tax)', defaultSelected: true },
  { key: 'total_paid', label: 'Total Paid', defaultSelected: true },
  { key: 'balance_due', label: 'Balance Due', defaultSelected: true },
  { key: 'date_created', label: 'Date Created', defaultSelected: true },
  { key: 'last_sign_in', label: 'Last Sign In', defaultSelected: true },
];

interface ExportColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedColumns: string[]) => void;
  userCount: number;
}

export function ExportColumnsModal({ 
  isOpen, 
  onClose, 
  onExport,
  userCount 
}: ExportColumnsModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter(col => col.defaultSelected).map(col => col.key))
  );

  const handleToggleColumn = (columnKey: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnKey)) {
      newSelected.delete(columnKey);
    } else {
      newSelected.add(columnKey);
    }
    setSelectedColumns(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedColumns(new Set(EXPORT_COLUMNS.map(col => col.key)));
  };

  const handleDeselectAll = () => {
    setSelectedColumns(new Set());
  };

  const handleExport = () => {
    onExport(Array.from(selectedColumns));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Users to CSV</DialogTitle>
          <DialogDescription>
            Select the columns you want to include in the export.
            {userCount > 0 && ` ${userCount} user${userCount === 1 ? '' : 's'} will be exported.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              type="button"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              type="button"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Deselect All
            </Button>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
            {EXPORT_COLUMNS.map((column) => (
              <div key={column.key} className="flex items-center space-x-3 hover:bg-white p-2 rounded transition-colors">
                <Checkbox
                  id={column.key}
                  checked={selectedColumns.has(column.key)}
                  onCheckedChange={() => handleToggleColumn(column.key)}
                />
                <label
                  htmlFor={column.key}
                  className="text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none flex-1"
                >
                  {column.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            type="button"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.size === 0}
            type="button"
            className="bg-[#B20000] text-white hover:bg-[#8B0000] disabled:bg-gray-300 disabled:text-gray-500"
          >
            <Download className="mr-2 h-4 w-4" />
            Export ({selectedColumns.size} column{selectedColumns.size === 1 ? '' : 's'})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}