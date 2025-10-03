import React, { useEffect, useState } from "react";
import { HeroBanner } from "../../components/HeroBanner";
import { supabase } from "../../lib/supabase";
import { MapPin, ExternalLink } from "lucide-react";
import { GymMapWebComponent } from "../LeagueDetailPage/components/GymMapWebComponent";

type Gym = {
  id: number;
  gym: string | null;
  address: string | null;
  instructions: string | null;
  locations: string[] | null;
  // Optional fields ignored by this page
  [key: string]: unknown;
};

export const GymLocationsPage = (): React.ReactElement => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGyms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("gyms")
          .select("id, gym, address, instructions, locations, active")
          .order("gym");

        if (error) {
          throw error;
        }

        // Only show active gyms if the column exists, else show all
        const activeGyms = Array.isArray(data)
          ? (data as Gym[]).filter((g: any) => g.active !== false)
          : [];

        setGyms(activeGyms);
      } catch (err) {
        setError("Failed to load gym locations");
        // eslint-disable-next-line no-console
        console.error("Error loading gyms:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadGyms();
  }, []);

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;
  };

  return (
    <div className="bg-white w-full">
      {/* Hero Banner */}
      <HeroBanner
        image="/gym-locations-hero.jpg"
        imageAlt="Indoor volleyball gym"
        containerClassName="h-[250px]"
      >
        <div className="text-center text-white">
          <h1 className="text-5xl mb-4 font-heading">Gym Locations</h1>
          <p className="text-xl max-w-2xl mx-auto">Find gyms across our leagues</p>
        </div>
      </HeroBanner>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#6F6F6F] mb-2">Unable to load gyms</h2>
            <p className="text-[#6F6F6F]">{error}</p>
          </div>
        ) : gyms.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#6F6F6F] mb-2">No Gyms Available</h2>
            <p className="text-[#6F6F6F]">There are no gym locations to show yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gyms.map((gym) => (
              <div
                key={gym.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {gym.address && gym.gym && (
                  <GymMapWebComponent address={gym.address} gymName={gym.gym} />
                )}

                <div className="p-6">
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

                  {/* Access instructions intentionally omitted on this page */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
