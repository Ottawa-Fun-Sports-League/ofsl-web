import { LayoutGrid, List } from "lucide-react";
import { Button } from "../../../../../components/ui/button";

interface ViewToggleProps {
  view: 'card' | 'list';
  onViewChange: (view: 'card' | 'list') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('card')}
        className={`px-3 transition-all ${
          view === 'card' 
            ? 'bg-white shadow-sm text-gray-900 hover:bg-white' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <LayoutGrid className="h-4 w-4 mr-1" />
        Card
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('list')}
        className={`px-3 transition-all ${
          view === 'list' 
            ? 'bg-white shadow-sm text-gray-900 hover:bg-white' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <List className="h-4 w-4 mr-1" />
        List
      </Button>
    </div>
  );
}