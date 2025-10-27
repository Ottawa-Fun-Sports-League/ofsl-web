import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin } from 'lucide-react';

interface GymLocationSelectProps {
  gyms: Array<{
    id: number;
    gym: string | null;
    address?: string | null;
    locations?: string[] | null;
  }>;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  placeholder?: string;
}

export function GymLocationSelect({
  gyms,
  value,
  onChange,
  label,
  helperText,
  placeholder = 'Search gyms by name, address, or location…',
}: GymLocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedValue = (value || '').trim();

  const selectedGym = useMemo(() => {
    if (!trimmedValue) return null;
    return gyms.find((gym) => (gym.gym || '').trim() === trimmedValue) ?? null;
  }, [gyms, trimmedValue]);

  const filteredGyms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return gyms;

    return gyms.filter((gym) => {
      const tokens: string[] = [];
      if (gym.gym) tokens.push(gym.gym);
      if (gym.address) tokens.push(gym.address);
      (gym.locations || []).forEach((location) => tokens.push(location));
      return tokens.some((token) => token.toLowerCase().includes(query));
    });
  }, [gyms, searchTerm]);

  const matchesQueryExactly = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return false;
    return gyms.some((gym) => (gym.gym || '').trim().toLowerCase() === query);
  }, [gyms, searchTerm]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (location: string) => {
    onChange(location);
    setOpen(false);
    setSearchTerm('');
  };

  const handleCustomSelect = () => {
    const customValue = searchTerm.trim();
    if (!customValue) return;
    onChange(customValue);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const displayLabel = selectedGym?.gym || trimmedValue || 'Select a gym…';

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-[#6F6F6F]">
            {label}
          </label>
          {trimmedValue && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#B20000] hover:text-[#8A0000]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent flex items-center justify-between text-left"
      >
        <span className={`truncate ${trimmedValue ? 'text-[#6F6F6F]' : 'text-gray-400'}`}>
          {displayLabel}
        </span>
        <span className="ml-2 text-xs text-gray-400">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-lg shadow-lg bg-white max-h-80 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-white sticky top-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#B20000]"
                placeholder={placeholder}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>
                {filteredGyms.length} {filteredGyms.length === 1 ? 'match' : 'matches'}
              </span>
              {trimmedValue && (
                <span className="text-gray-400">Selected: {displayLabel}</span>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100" role="listbox">
            {filteredGyms.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No gyms match your search.
              </div>
            ) : (
              filteredGyms.map((gym) => {
                const gymName = (gym.gym || '').trim();
                const isSelected = gymName === trimmedValue;

                return (
                  <button
                    key={gym.id}
                    type="button"
                    onClick={() => handleSelect(gymName)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected ? 'bg-[#B20000]/10 text-[#B20000]' : 'hover:bg-gray-50'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-[#B20000]" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {gymName || 'Unnamed gym'}
                        </div>
                        {(gym.address || (gym.locations && gym.locations.length > 0)) && (
                          <div className="mt-1 text-xs text-gray-500 space-y-1">
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
                        )}
                      </div>
                      <span
                        className={`flex-shrink-0 w-4 h-4 border rounded-sm flex items-center justify-center text-xs ${
                          isSelected ? 'bg-[#B20000] border-[#B20000] text-white' : 'border-gray-300 text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {searchTerm.trim() && !matchesQueryExactly && (
            <button
              type="button"
              onClick={handleCustomSelect}
              className="w-full px-4 py-2 text-sm text-[#B20000] hover:bg-[#B20000]/10 transition-colors"
            >
              Use &quot;{searchTerm.trim()}&quot; as custom location
            </button>
          )}
        </div>
      )}
    </div>
  );
}
