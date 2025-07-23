import { Button } from '../../ui/button';

interface Sport {
  id: number;
  name: string;
}

interface SportFilterProps {
  sports: Sport[];
  selectedSport: string;
  onSportChange: (sport: string) => void;
  getSportIcon: (sport: string) => string;
}

export function SportFilter({ sports, selectedSport, onSportChange, getSportIcon }: SportFilterProps) {
  // Order sports as: Volleyball, Badminton, Pickleball
  const orderedSports = ['Volleyball', 'Badminton', 'Pickleball'];
  
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-4">
      {orderedSports.map((sportName) => {
        const sport = sports.find(s => s.name === sportName);
        if (!sport) return null;
        
        return (
          <Button
            key={sport.id}
            onClick={() => onSportChange(sport.name)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border ${
              selectedSport === sport.name 
                ? 'border-[#B20000] bg-[#ffeae5] text-[#B20000] hover:border-[#B20000] hover:bg-[#ffeae5] hover:text-[#B20000]' 
                : 'border-gray-300 bg-white text-[#6F6F6F] hover:border-[#B20000] hover:bg-[#ffeae5] hover:text-[#B20000]'
            }`}
          >
            <img 
              src={getSportIcon(sport.name)} 
              alt={`${sport.name} icon`}
              className="w-6 h-6" 
            />
            <span className="font-medium">{sport.name}</span>
          </Button>
        );
      })}
    </div>
  );
}