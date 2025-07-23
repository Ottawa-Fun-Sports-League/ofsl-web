import { Button } from '../../../../../components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { Gym, Sport, DayOfWeek } from '../types';

interface GymCardProps {
  gym: Gym;
  sports: Sport[];
  daysOfWeek: DayOfWeek[];
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function GymCard({ gym, sports, daysOfWeek, deleting, onEdit, onDelete }: GymCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6">
      {/* Three-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[6fr_3fr_1fr] gap-6">
        {/* First Column: School Info */}
        <div>
          <div className="flex items-baseline gap-2 flex-wrap mb-2">
            <h3 className="text-xl font-bold text-[#6F6F6F] leading-none">{gym.gym}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              gym.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {gym.active ? 'Active' : 'Inactive'}
            </span>
            {gym.locations && gym.locations.length > 0 && (
              gym.locations.map(location => (
                <span key={location} className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                  {location}
                </span>
              ))
            )}
          </div>
          
          <div className="text-[#6F6F6F] mb-3">{gym.address}</div>
          
          {gym.active && (gym.available_days?.length > 0 || gym.available_sports?.length > 0) && (
            <div className="mb-3">
              {gym.available_days && gym.available_days.length > 0 && (
                <div className="inline-flex flex-wrap gap-1 mr-3">
                  {gym.available_days.map(dayId => {
                    const day = daysOfWeek.find(d => d.id === dayId);
                    return day ? (
                      <span key={dayId} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {day.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              
              {gym.available_sports && gym.available_sports.length > 0 && (
                <div className="inline-flex flex-wrap gap-1">
                  {gym.available_sports.map(sportId => {
                    const sport = sports.find(s => s.id === sportId);
                    return sport ? (
                      <span key={sportId} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {sport.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
          
          {gym.instructions && (
            <div>
              <span className="font-medium text-[#6F6F6F]">Access Instructions:</span>
              <p className="text-[#6F6F6F] mt-1">{gym.instructions}</p>
            </div>
          )}
        </div>

        {/* Second Column: Contact Info */}
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium text-[#6F6F6F]">Contact:</span> <span className="text-[#6F6F6F]">John Smith</span>
          </div>
          <div>
            <span className="font-medium text-[#6F6F6F]">Phone:</span> <span className="text-[#6F6F6F]">613-520-2600</span>
          </div>
          <div>
            <span className="font-medium text-[#6F6F6F]">Email:</span> <span className="text-[#6F6F6F]">facilities@carleton.ca</span>
          </div>
        </div>

        {/* Third Column: Edit/Delete Actions */}
        <div className="flex items-start justify-end gap-2">
          <Button
            onClick={onEdit}
            className="bg-transparent hover:bg-blue-50 text-blue-500 hover:text-blue-600 rounded-lg p-2 transition-colors"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            onClick={onDelete}
            disabled={deleting}
            className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-2 transition-colors"
          >
            {deleting ? (
              <div className="h-3 w-3 border-t-2 border-red-500 rounded-full animate-spin"></div>
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}