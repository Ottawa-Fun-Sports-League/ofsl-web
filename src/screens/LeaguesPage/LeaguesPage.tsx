import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { MapPin, Calendar, Clock, Users, DollarSign } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  fetchLeagues,
  fetchSports,
  fetchSkills,
  getDayName,
  formatLeagueDates,
  getPrimaryLocation,
  getGymNamesByLocation,
  LeagueWithTeamCount 
} from "../../lib/leagues";
import { getStripeProductByLeagueId } from '../../lib/stripe';
import { MobileFilterDrawer } from "./components/MobileFilterDrawer";

interface StripeProductDB {
  id: string;
  price_id: string;
  name: string;
  description: string;
  mode: string;
  price: number;
  currency: string;
  interval: string | null;
  league_id: number | null;
  created_at: string;
  updated_at: string;
}
import { LocationPopover } from "../../components/ui/LocationPopover";
import { logger } from "../../lib/logger";
import { getSportIcon } from "../LeagueDetailPage/utils/leagueUtils";
import { LeagueFilters, useLeagueFilters, filterLeagues, DEFAULT_FILTER_OPTIONS } from "../../components/leagues/filters";

// Customize filter options for this page
const filterOptions = {
  ...DEFAULT_FILTER_OPTIONS,
  location: ["All Locations", "Central", "East", "West", "South", "Gatineau"]
};

export const LeaguesPage = (): React.ReactElement => {
  const [searchParams] = useSearchParams();
  
  // Data state
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [sports, setSports] = useState<Array<{ id: number; name: string }>>([]);
  const [skills, setSkills] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Stripe products
  const [_leagueProducts, setLeagueProducts] = useState<Record<number, StripeProductDB>>({});

  // Use the shared filter hook
  const {
    filters,
    setFilters,
    openDropdown,
    showMobileFilterDrawer,
    setShowMobileFilterDrawer,
    dropdownRefs,
    toggleDropdown,
    handleFilterChange,
    clearFilters,
    clearSkillLevels,
    isAnyFilterActive
  } = useLeagueFilters();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load Stripe products for leagues
  useEffect(() => {
    if (leagues.length > 0) {
      loadStripeProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagues]);

  // Initialize filters from URL parameters
  useEffect(() => {
    const sportParam = searchParams.get('sport');
    const dayParam = searchParams.get('day');
    const levelParam = searchParams.get('level');
    const genderParam = searchParams.get('gender');
    const locationParam = searchParams.get('location');
    const typeParam = searchParams.get('type');

    setFilters(prev => ({
      ...prev,
      ...(sportParam && { sport: sportParam }),
      ...(dayParam && { day: dayParam }),
      ...(levelParam && { skillLevels: [levelParam] }),
      ...(genderParam && { gender: genderParam }),
      ...(locationParam && { location: locationParam }),
      ...(typeParam && { type: typeParam })
    }));
  }, [searchParams, sports, setFilters]);

  const loadStripeProducts = async () => {
    try {
      const productMap: Record<number, StripeProductDB> = {};
      
      // Load products for each league in parallel
      await Promise.all(leagues.map(async (league) => {
        const product = await getStripeProductByLeagueId(league.id);
        if (product) {
          productMap[league.id] = product;
        }
      }));
      
      setLeagueProducts(productMap);
    } catch (error) {
      logger.error('Error loading Stripe products', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [leaguesData, sportsData, skillsData] = await Promise.all([
        fetchLeagues(),
        fetchSports(),
        fetchSkills()
      ]);

      setLeagues(leaguesData);
      setSports(sportsData);
      setSkills(skillsData);
    } catch (err) {
      logger.error('Error loading data', err);
      setError('Failed to load leagues data');
    } finally {
      setLoading(false);
    }
  };


  // Filter leagues using the shared filter function
  const filteredLeagues = filterLeagues(leagues, filters, skills);

  // Function to get badge color based on spots remaining
  const getSpotsBadgeColor = (spots: number) => {
    if (spots === 0) return "bg-red-100 text-red-800";
    if (spots <= 3) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  // Function to get spots text
  const getSpotsText = (spots: number) => {
    if (spots === 0) return "Full";
    if (spots === 1) return "1 spot left";
    return `${spots} spots left`;
  };



  if (loading) {
    return (
      <div className="bg-white w-full">
        <div className="max-w-[1280px] mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl text-[#6F6F6F] font-bold mb-8 md:mb-12 text-center">
            Find a league
          </h1>
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white w-full">
        <div className="max-w-[1280px] mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl text-[#6F6F6F] font-bold mb-8 md:mb-12 text-center">
            Find a league
          </h1>
          <div className="text-center py-20">
            <p className="text-red-600 text-lg">{error}</p>
            <Button 
              onClick={loadData} 
              className="mt-4 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white w-full">
      <div className="max-w-[1280px] mx-auto px-4 py-8 md:py-12">
        {/* Page Title */}
        <h1 className="text-4xl md:text-5xl text-[#6F6F6F] font-bold mb-8 md:mb-12 text-center">
          Find a league
        </h1>

        {/* League Filters Component */}
        <LeagueFilters
          filters={filters}
          filterOptions={filterOptions}
          sports={sports}
          skills={skills}
          openDropdown={openDropdown}
          dropdownRefs={dropdownRefs}
          onFilterChange={handleFilterChange}
          onToggleDropdown={toggleDropdown}
          onClearFilters={clearFilters}
          onClearSkillLevels={clearSkillLevels}
          isAnyFilterActive={isAnyFilterActive}
          onShowMobileFilters={() => setShowMobileFilterDrawer(true)}
          getSportIcon={getSportIcon}
          hideOnMobile={true}
        />

        {/* League Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeagues.map(league => (
            <Link 
              key={league.id} 
              to={`/leagues/${league.id}`}
              className="block rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <Card 
                className="overflow-hidden rounded-lg border border-gray-200 flex flex-col h-full"
              >
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Card Header with League Name and Sport Icon */}
                  <div className="bg-[#F8F8F8] border-b border-gray-200 p-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-[#6F6F6F] line-clamp-2">{league.name}</h3>
                    </div>
                    <img 
                      src={getSportIcon(league.sport_name)} 
                      alt={`${league.sport_name} icon`}
                      className="w-8 h-8 object-contain ml-2"
                    />
                  </div>
                  
                  {/* Card Body with Info */}
                  <div className="p-4 flex-grow flex flex-col space-y-4">
                    {/* Day & Time */}
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <p className="text-sm font-medium text-[#6F6F6F]">{getDayName(league.day_of_week)}</p>
                      </div>
                    </div>
                    
                    {/* Dates */}
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <p className="text-sm font-medium text-[#6F6F6F]">{formatLeagueDates(league.start_date, league.end_date, league.hide_day || false)}</p>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center flex-wrap">
                      <MapPin className="h-4 w-4 text-[#B20000] mr-1.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-[#6F6F6F] mr-2">Location:</p>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const gymLocations = getPrimaryLocation(league.gyms || []);
                          
                          if (gymLocations.length === 0) {
                            return <span className="text-sm text-gray-500">TBD</span>;
                          }
                          
                          return gymLocations.map((location, index) => (
                            <LocationPopover
                              key={index}
                              locations={getGymNamesByLocation(league.gyms || [], location)}
                            >
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                                {location}
                              </span>
                            </LocationPopover>
                          ));
                        })()}
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <p className="text-sm font-medium text-[#6F6F6F]">
                          ${league.cost} + HST {league.sport_name === "Volleyball" ? "per team" : "per player"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Register Button with spots remaining */}
                  <div className="mt-auto p-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-[#B20000] mr-1" />
                      <span className={`text-xs font-medium py-0.5 px-2 rounded-full ${getSpotsBadgeColor(league.spots_remaining)}`}>
                        {getSpotsText(league.spots_remaining)}
                      </span>
                    </div>
                    
                    <Button 
                      className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-4"
                      variant="default"
                    >
                      {league.spots_remaining === 0 ? 'Join Waitlist' : 'View Details'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        {/* No Results Message */}
        {filteredLeagues.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No leagues match your filters</h3>
            <p className="text-[#6F6F6F]">Try adjusting your filter criteria to find available leagues.</p>
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilterDrawer}
        onClose={() => setShowMobileFilterDrawer(false)}
        filters={filters}
        handleFilterChange={(filterType: string, value: string) => handleFilterChange(filterType as keyof typeof filters, value)}
        clearFilters={clearFilters}
        sports={sports}
        skills={skills}
        filterOptions={filterOptions}
        isAnyFilterActive={isAnyFilterActive}
        clearSkillLevels={clearSkillLevels}
      />
    </div>
  );
};