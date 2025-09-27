import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Search, X } from 'lucide-react';
import { NewGymForm, EditGymForm, Sport, DayOfWeek, Facilitator } from '../types';

interface GymFormProps {
  isEdit?: boolean;
  title: string;
  gym: NewGymForm | EditGymForm;
  sports: Sport[];
  daysOfWeek: DayOfWeek[];
  locations: string[];
  facilitators: Facilitator[];
  saving: boolean;
  onGymChange: (gym: NewGymForm | EditGymForm) => void;
  onDayToggle: (dayId: number) => void;
  onSportToggle: (sportId: number) => void;
  onLocationToggle: (location: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function GymForm({
  isEdit = false,
  title,
  gym,
  sports,
  daysOfWeek,
  locations,
  facilitators,
  saving,
  onGymChange,
  onDayToggle,
  onSportToggle,
  onLocationToggle,
  onSave,
  onCancel
}: GymFormProps) {
  const [facilitatorSearch, setFacilitatorSearch] = useState('');
  const [showFacilitatorList, setShowFacilitatorList] = useState(false);
  const facilitatorDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (gym.facilitatorId && !facilitators.some((facilitator) => facilitator.id === gym.facilitatorId)) {
      onGymChange({ ...gym, facilitatorId: null });
    }
  }, [facilitators, gym, onGymChange]);

  useEffect(() => {
    if (!showFacilitatorList) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (facilitatorDropdownRef.current && !facilitatorDropdownRef.current.contains(event.target as Node)) {
        setShowFacilitatorList(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFacilitatorList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showFacilitatorList]);

  const selectedFacilitator = useMemo(() => (
    gym.facilitatorId
      ? facilitators.find((facilitator) => facilitator.id === gym.facilitatorId) ?? null
      : null
  ), [facilitators, gym.facilitatorId]);

  const filteredFacilitators = useMemo(() => {
    const query = facilitatorSearch.trim().toLowerCase();
    if (!query) return facilitators;

    return facilitators.filter((facilitator) => {
      const values = [facilitator.name, facilitator.email, facilitator.phone].filter(Boolean) as string[];
      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [facilitators, facilitatorSearch]);

  const handleFacilitatorSelect = (facilitatorId: string | null) => {
    onGymChange({ ...gym, facilitatorId });
    setShowFacilitatorList(false);
    setFacilitatorSearch('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#6F6F6F]">{title}</h3>
        <Button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">School/Gym Name</label>
          <Input
            value={gym.gym}
            onChange={(e) => onGymChange({ ...gym, gym: e.target.value })}
            placeholder="Enter school or gym name"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Address</label>
          <Input
            value={gym.address}
            onChange={(e) => onGymChange({ ...gym, address: e.target.value })}
            placeholder="Enter address"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Assigned Facilitator</label>
          <div className="relative" ref={facilitatorDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFacilitatorList((open) => !open)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000] text-left flex items-center justify-between gap-3"
              aria-haspopup="listbox"
              aria-expanded={showFacilitatorList}
              aria-controls="facilitator-selector"
            >
              <span className="truncate text-[#6F6F6F]">
                {selectedFacilitator
                  ? selectedFacilitator.name || selectedFacilitator.email || 'Unnamed facilitator'
                  : 'Select a facilitator'}
              </span>
              <span className="text-xs text-gray-400">
                {showFacilitatorList ? 'Hide' : 'Show'}
              </span>
            </button>

            {showFacilitatorList && (
              <div
                id="facilitator-selector"
                role="listbox"
                className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-hidden md:max-h-80"
              >
                <div className="sticky top-0 bg-white p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={facilitatorSearch}
                      onChange={(event) => setFacilitatorSearch(event.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                      placeholder="Search by name, email, or phone"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>
                      {filteredFacilitators.length} {filteredFacilitators.length === 1 ? 'match' : 'matches'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFacilitatorSelect(null)}
                      className="text-[#B20000] hover:text-[#8A0000]"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100" role="none">
                  {filteredFacilitators.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No facilitators match your search.
                    </div>
                  ) : (
                    filteredFacilitators.map((facilitator) => {
                      const isSelected = facilitator.id === gym.facilitatorId;
                      return (
                        <button
                          type="button"
                          key={facilitator.id}
                          onClick={() => handleFacilitatorSelect(facilitator.id)}
                          role="option"
                          aria-selected={isSelected}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isSelected
                              ? 'bg-[#B20000]/10 text-[#B20000]'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-sm font-medium">
                            {facilitator.name || facilitator.email || 'Unnamed facilitator'}
                          </div>
                          <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-1">
                            {facilitator.email && <span>{facilitator.email}</span>}
                            {facilitator.phone && <span>{facilitator.phone}</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Access Instructions</label>
          <textarea
            value={gym.instructions}
            onChange={(e) => onGymChange({ ...gym, instructions: e.target.value })}
            placeholder="Enter instructions for accessing the gym/school"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id={`${isEdit ? 'edit' : 'new'}-gym-active`}
            checked={gym.active}
            onChange={(e) => onGymChange({ ...gym, active: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor={`${isEdit ? 'edit' : 'new'}-gym-active`} className="text-sm font-medium text-[#6F6F6F]">
            Active
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-3">Locations</label>
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <button
                key={location}
                type="button"
                onClick={() => onLocationToggle(location)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gym.locations.includes(location)
                    ? 'bg-[#B20000] text-white'
                    : 'bg-gray-100 text-[#6F6F6F] hover:bg-gray-200'
                }`}
              >
                {location}
              </button>
            ))}
          </div>
        </div>

        {gym.active && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-3">Available Days</label>
              <div className="space-y-2">
                {daysOfWeek.map((day) => (
                  <div key={day.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`${isEdit ? 'edit' : 'new'}-day-${day.id}`}
                      checked={gym.availableDays.includes(day.id)}
                      onChange={() => onDayToggle(day.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`${isEdit ? 'edit' : 'new'}-day-${day.id}`} className="text-sm text-[#6F6F6F]">
                      {day.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-3">Available Sports</label>
              <div className="space-y-2">
                {sports.map((sport) => (
                  <div key={sport.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`${isEdit ? 'edit' : 'new'}-sport-${sport.id}`}
                      checked={gym.availableSports.includes(sport.id)}
                      onChange={() => onSportToggle(sport.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`${isEdit ? 'edit' : 'new'}-sport-${sport.id}`} className="text-sm text-[#6F6F6F]">
                      {sport.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white"
            disabled={saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save School'}
          </Button>
        </div>
      </div>
    </div>
  );
}
