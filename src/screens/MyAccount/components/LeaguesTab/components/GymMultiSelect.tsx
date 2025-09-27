import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Gym } from '../types';

interface GymMultiSelectProps {
  gyms: Gym[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  helperText?: string;
}

export function GymMultiSelect({
  gyms,
  selectedIds,
  onChange,
  label,
  helperText,
}: GymMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const selectedGyms = useMemo(() => {
    if (!selectedIds.length) return [];
    const map = new Map(gyms.map((gym) => [gym.id, gym] as const));
    return selectedIds
      .map((id) => map.get(id))
      .filter((gym): gym is Gym => Boolean(gym));
  }, [gyms, selectedIds]);

  const filteredGyms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return gyms;

    return gyms.filter((gym) => {
      const tokens: string[] = [];
      if (gym.gym) tokens.push(gym.gym);
      if (gym.address) tokens.push(gym.address);
      if (gym.instructions) tokens.push(gym.instructions);
      (gym.locations || []).forEach((location) => tokens.push(location));

      return tokens.some((token) => token.toLowerCase().includes(query));
    });
  }, [gyms, searchTerm]);

  const handleToggle = (gymId: number) => {
    if (selectedIds.includes(gymId)) {
      onChange(selectedIds.filter((id) => id !== gymId));
    } else {
      onChange([...selectedIds, gymId]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[#6F6F6F]">{label}</label>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#B20000] hover:text-[#8A0000]"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {selectedGyms.length === 0 ? (
          <span className="text-xs text-gray-500">No gyms selected</span>
        ) : (
          selectedGyms.map((gym) => (
            <span
              key={gym.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#B20000]/10 text-[#B20000]"
            >
              {gym.gym || 'Unnamed gym'}
            </span>
          ))
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
          placeholder="Search by name, address, or location"
        />
      </div>

      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {filteredGyms.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            No gyms match your search.
          </div>
        ) : (
          filteredGyms.map((gym) => {
            const isSelected = selectedIds.includes(gym.id);
            return (
              <button
                key={gym.id}
                type="button"
                onClick={() => handleToggle(gym.id)}
                className={`w-full text-left px-4 py-3 transition-colors flex flex-col gap-1 ${
                  isSelected ? 'bg-[#B20000]/10 text-[#B20000]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {gym.gym || 'Unnamed gym'}
                  </span>
                  <span
                    className={`flex-shrink-0 w-4 h-4 border rounded-sm flex items-center justify-center ${
                      isSelected ? 'bg-[#B20000] border-[#B20000] text-white' : 'border-gray-300'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {gym.address && <div>{gym.address}</div>}
                  {gym.locations && gym.locations.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {gym.locations.map((location) => (
                        <span
                          key={location}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700"
                        >
                          {location}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
