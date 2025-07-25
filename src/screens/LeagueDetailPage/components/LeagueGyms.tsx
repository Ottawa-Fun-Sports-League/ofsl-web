import { MapPin, ExternalLink, Info } from "lucide-react";
import { GymMapWebComponent } from "./GymMapWebComponent";

interface LeagueGymsProps {
  gyms: Array<{
    id: number;
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>;
  gymDetails?: Array<{
    id: number;
    gym: string | null;
    address: string | null;
    instructions: string | null;
    locations: string[] | null;
  }>;
}

export function LeagueGyms({ gyms, gymDetails }: LeagueGymsProps) {
  // If we have gymDetails, use them; otherwise use the basic gym info
  const displayGyms = gymDetails || gyms;

  if (displayGyms.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Gyms Available
        </h3>
        <p className="text-gray-500">
          No gym locations have been assigned to this league yet.
        </p>
      </div>
    );
  }

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="space-y-6">
      {displayGyms.map((gym) => {
        const gymInfo = gymDetails?.find((g) => g.id === gym.id) || gym;

        return (
          <div
            key={gym.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            {/* Map Preview - Using Google Maps Web Components */}
            {gym.address && gym.gym && (
              <GymMapWebComponent address={gym.address} gymName={gym.gym} />
            )}

            <div className="p-6">
              {/* Gym Name and Address */}
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {gym.gym}
                </h3>
                {gym.address && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-600">{gym.address}</p>
                      <a
                        href={getGoogleMapsUrl(gym.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-[#B20000] hover:underline mt-2"
                      >
                        View on Google Maps
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Chips */}
              {gym.locations && gym.locations.length > 0 ? (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {gym.locations.map((location, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Access Instructions */}
              {"instructions" in gymInfo && gymInfo.instructions ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        Access Instructions
                      </h4>
                      <p className="text-sm text-amber-700 whitespace-pre-wrap">
                        {gymInfo.instructions || ''}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

