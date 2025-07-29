import { Button } from '../../../../../components/ui/button';
import { MapPin } from 'lucide-react';
import { Gym, Sport, DayOfWeek, NewGymForm, EditGymForm } from '../types';
import { GymCard } from './GymCard';
import { GymForm } from './GymForm';

interface GymsListProps {
  filteredGyms: Gym[];
  sports: Sport[];
  daysOfWeek: DayOfWeek[];
  locations: string[];
  loading: boolean;
  editingGym: number | null;
  editGym: EditGymForm;
  saving: boolean;
  deleting: number | null;
  isAnyFilterActive: boolean;
  onEditGym: (gym: Gym) => void;
  onEditGymChange: (gym: EditGymForm) => void;
  onDayToggle: (dayId: number, isNewGym?: boolean) => void;
  onSportToggle: (sportId: number, isNewGym?: boolean) => void;
  onLocationToggle: (location: string, isNewGym?: boolean) => void;
  onUpdateGym: () => void;
  onCancelEdit: () => void;
  onDeleteGym: (gymId: number) => void;
  onClearFilters: () => void;
}

export function GymsList({
  filteredGyms,
  sports,
  daysOfWeek,
  locations,
  loading,
  editingGym,
  editGym,
  saving,
  deleting,
  isAnyFilterActive,
  onEditGym,
  onEditGymChange,
  onDayToggle,
  onSportToggle,
  onLocationToggle,
  onUpdateGym,
  onCancelEdit,
  onDeleteGym,
  onClearFilters
}: GymsListProps) {
  if (filteredGyms.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-[#6F6F6F] text-lg">
          {isAnyFilterActive ? 'No schools match your filters' : 'No schools found'}
        </p>
        {isAnyFilterActive && (
          <Button
            onClick={onClearFilters}
            className="mt-4 text-[#B20000] hover:text-[#8A0000] bg-transparent hover:bg-transparent"
          >
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filteredGyms.map(gym => (
        <div key={gym.id}>
          {editingGym === gym.id ? (
            <GymForm
              isEdit={true}
              title="Edit School/Gym"
              gym={editGym as unknown as (NewGymForm | EditGymForm)}
              sports={sports}
              daysOfWeek={daysOfWeek}
              locations={locations}
              saving={saving}
              onGymChange={onEditGymChange as unknown as (gym: NewGymForm | EditGymForm) => void}
              onDayToggle={(dayId) => onDayToggle(dayId, false)}
              onSportToggle={(sportId) => onSportToggle(sportId, false)}
              onLocationToggle={(location) => onLocationToggle(location, false)}
              onSave={onUpdateGym}
              onCancel={onCancelEdit}
            />
          ) : (
            <GymCard
              gym={gym}
              sports={sports}
              daysOfWeek={daysOfWeek}
              deleting={deleting === gym.id}
              onEdit={() => onEditGym(gym)}
              onDelete={() => onDeleteGym(gym.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}