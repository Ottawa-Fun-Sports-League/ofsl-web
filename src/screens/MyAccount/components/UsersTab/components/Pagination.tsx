import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { PaginationState } from '../types';

interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  itemName?: string;
}

export function Pagination({ pagination, onPageChange, onPageSizeChange, loading = false, itemName = 'users' }: PaginationProps) {
  const { currentPage, pageSize, totalItems, totalPages } = pagination;
  
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }
    
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }
    
    return rangeWithDots;
  };
  
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t">
        <div className="text-sm text-[#6F6F6F]">
          Showing {startItem} to {endItem} of {totalItems} {itemName}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6F6F6F]">Show</span>
          <select
            value={pageSize.toString()}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
            className="w-20 h-8 px-2 border border-gray-300 rounded text-sm"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-sm text-[#6F6F6F]">per page</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t">
      <div className="text-sm text-[#6F6F6F]">
        Showing {startItem} to {endItem} of {totalItems} {itemName}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6F6F6F]">Show</span>
          <select
            value={pageSize.toString()}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
            className="w-20 h-8 px-2 border border-gray-300 rounded text-sm"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-sm text-[#6F6F6F]">per page</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getVisiblePages().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? 'default' : 'ghost'}
              size="sm"
              onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
              disabled={typeof page !== 'number' || loading}
              className={`h-8 w-8 p-0 ${
                page === currentPage 
                  ? 'bg-[#B20000] text-white hover:bg-[#B20000]/90' 
                  : ''
              }`}
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}