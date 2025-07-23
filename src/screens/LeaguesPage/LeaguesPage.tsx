import { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ChevronDown, X, MapPin, Calendar, Clock, Users, DollarSign, Filter } from "lucide-react";
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
import { useAuth } from "../../contexts/AuthContext";
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

// Filter options data
const filterOptions = {
  location: ["All Locations", "Central", "East", "West", "South", "Gatineau"],
  day: ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  type: ["All Types", "Regular Season", "Tournament", "Skills and Drills"],
  gender: ["All Genders", "Mixed", "Female", "Male"]
};

export const LeaguesPage = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const { _userProfile } = useAuth();
  
  // Data state
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [sports, setSports] = useState<Array<{ id: number; name: string }>>([]);
  const [skills, setSkills] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Stripe products
  const [_leagueProducts, setLeagueProducts] = useState<Record<number, StripeProductDB>>({});

  // Filter state
  const [filters, setFilters] = useState({
    sport: "All Sports",
    location: "All Locations",
    skillLevels: [] as string[],
    day: "All Days",
    type: "All Types",
    gender: "All Genders"
  });

  // Open/close state for dropdowns
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // State for mobile filter drawer
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  
  // Refs for dropdown components
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
  }, [searchParams, sports]);

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

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown && dropdownRefs.current[openDropdown]) {
        const dropdown = dropdownRefs.current[openDropdown];
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Toggle dropdown
  const toggleDropdown = (dropdown: string) => {
    if (openDropdown === dropdown) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(dropdown);
    }
  };

  // Handle filter change with toggle functionality for sport
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'sport' && filters.sport === value) {
      setFilters(prev => ({
        ...prev,
        [filterType]: "All Sports"
      }));
    } else if (filterType === 'skillLevel') {
      // Toggle skill level in the array
      setFilters(prev => {
        const currentSkillLevels = [...prev.skillLevels];
        if (currentSkillLevels.includes(value)) {
          return {
            ...prev,
            skillLevels: currentSkillLevels.filter(skill => skill !== value)
          };
        } else {
          return {
            ...prev,
            skillLevels: [...currentSkillLevels, value]
          };
        }
      });
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
    setOpenDropdown(null);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      sport: "All Sports",
      location: "All Locations",
      skillLevels: [],
      day: "All Days",
      type: "All Types",
      gender: "All Genders"
    });
  };

  // Clear skill levels only
  const clearSkillLevels = () => {
    setFilters(prev => ({ ...prev, skillLevels: [] }));
  };

  // Check if any filters are active
  const isAnyFilterActive = () => {
    return filters.sport !== "All Sports" ||
           filters.location !== "All Locations" ||
           filters.skillLevels.length > 0 ||
           filters.day !== "All Days" ||
           filters.type !== "All Types" ||
           filters.gender !== "All Genders";
  };

  // Filter leagues based on selected filters
  const filteredLeagues = leagues.filter(league => {
    const dayName = getDayName(league.day_of_week);
    const leagueLocations = getPrimaryLocation(league.gyms);
    
    // Helper function to check if league matches skill level filters
    const matchesSkillLevels = () => {
      // If no skill levels are selected, show all leagues
      if (filters.skillLevels.length === 0) return true;
      
      // Check if any of the league's skill_ids match selected skill levels
      if (league.skill_ids && league.skill_ids.length > 0) {
        // Get the skill IDs that correspond to the selected skill names
        const selectedSkillIds = skills
          .filter(skill => filters.skillLevels.includes(skill.name))
          .map(skill => skill.id);
        
        // Check if any of the league's skill_ids are in the selected skill IDs
        return league.skill_ids.some(id => selectedSkillIds.includes(id));
      } else if (league.skill_name && filters.skillLevels.includes(league.skill_name)) {
        // For backward compatibility, check if the league's skill_name is in the selected skill levels
        return true;
      }
      
      return false;
    };
    
    // Helper function to check if league matches location filter
    const matchesLocation = () => {
      if (filters.location === "All Locations") return true;
      // Check if any of the league's gym locations match the selected location
      return leagueLocations.includes(filters.location);
    };

    // Helper function to check if league matches type filter
    const matchesType = () => {
      if (filters.type === "All Types") return true;
      if (!league.league_type) return false;
      
      const typeMapping: Record<string, string> = {
        'regular_season': 'Regular Season',
        'tournament': 'Tournament',
        'skills_drills': 'Skills and Drills'
      };
      
      return typeMapping[league.league_type] === filters.type;
    };

    // Helper function to check if league matches gender filter
    const matchesGender = () => {
      if (filters.gender === "All Genders") return true;
      return league.gender === filters.gender;
    };
    
    return (
      (filters.sport === "All Sports" || league.sport_name === filters.sport) &&
      matchesLocation() &&
      matchesSkillLevels() &&
      (filters.day === "All Days" || dayName === filters.day) &&
      matchesType() &&
      matchesGender()
    );
  });

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

  // Function to get sport icon based on sport type
  const getSportIcon = (sport: string | null) => {
    if (!sport) return "";
    switch (sport) {
      case 'Volleyball':
        return "/Volleyball.png";
      case 'Badminton':
        return "/Badminton.png";
      case 'Basketball':
        return "/Basketball.png";
      case 'Pickleball':
        return "/pickleball.png";
      default:
        return "";
    }
  };

  // Create sport filter options from database
  const _sportFilterOptions = ["All Sports", ...sports.map(sport => sport.name)];
  const skillFilterOptions = ["All Skill Levels", ...skills.map(skill => skill.name)];

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

        {/* Mobile Filter Button */}
        <div className="flex justify-center mb-8 md:hidden">
          <Button
            onClick={() => setShowMobileFilterDrawer(true)}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters {isAnyFilterActive() && <span className="ml-1 bg-white text-[#B20000] text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
          </Button>
        </div>

        {/* Filters Section (Hidden on mobile, shown on desktop) */}
        <div className="mb-16 hidden md:block">
          {/* First row - Sport Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {/* Order sports as: Volleyball, Badminton, Pickleball */}
            {['Volleyball', 'Badminton', 'Pickleball'].map((sportName) => {
              const sport = sports.find(s => s.name === sportName);
              if (!sport) return null;
              
              return (
                <Button
                  key={sport.id}
                  onClick={() => handleFilterChange('sport', sport.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border ${
                    filters.sport === sport.name 
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
          
          {/* Second row - Dropdown Filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {/* Location Filter */}
            <div className="relative" ref={el => dropdownRefs.current['location'] = el}>
              <button
                className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
                  filters.location !== "All Locations"
                    ? 'border-b-[#B20000] text-[#B20000]'
                    : 'border-b-gray-200 text-gray-600 hover:border-b-gray-300'
                }`}
                onClick={() => toggleDropdown('location')}
              >
                <span>{filters.location}</span>
                <ChevronDown className={`h-4 w-4 ml-2 ${
                  filters.location !== "All Locations" ? 'text-[#B20000]' : 'text-gray-400'
                }`} />
              </button>
              {openDropdown === 'location' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg">
                  {filterOptions.location.map((option) => (
                    <button
                      key={option}
                      className={`block w-full text-left px-4 py-2 transition-colors duration-200 hover:bg-[#ffeae5] hover:text-[#B20000] ${
                        filters.location === option ? 'bg-[#ffeae5] text-[#B20000] font-medium' : ''
                      }`}
                      onClick={() => handleFilterChange('location', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skill Level Filter */}
            <div className="relative" ref={el => dropdownRefs.current['skillLevel'] = el}>
              <button
                className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
                  filters.skillLevels.length > 0
                    ? 'border-b-[#B20000] text-[#B20000]'
                    : 'border-b-gray-200 text-gray-600 hover:border-b-gray-300'
                }`}
                onClick={() => toggleDropdown('skillLevel')}
              >
                <span>
                  {filters.skillLevels.length === 0 
                    ? "All Skill Levels" 
                    : filters.skillLevels.length === 1 
                      ? filters.skillLevels[0] 
                      : `${filters.skillLevels.length} Skill Levels`}
                </span>
                <ChevronDown className={`h-4 w-4 ml-2 ${
                  filters.skillLevels.length > 0 ? 'text-[#B20000]' : 'text-gray-400'
                }`} />
              </button>
              {openDropdown === 'skillLevel' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg">
                  {skillFilterOptions.map((option) => (
                    option === "All Skill Levels" ? (
                      <button
                        key={option}
                        className={`block w-full text-left px-4 py-2 transition-colors duration-200 hover:bg-[#ffeae5] hover:text-[#B20000] ${
                          filters.skillLevels.length === 0 ? 'bg-[#ffeae5] text-[#B20000] font-medium' : ''
                        }`}
                        onClick={clearSkillLevels}
                      >
                        {option}
                      </button>
                    ) : (
                      <div key={option} className="flex items-center px-4 py-2 hover:bg-[#ffeae5]">
                        <input
                          type="checkbox"
                          id={`skill-${option}`}
                          checked={filters.skillLevels.includes(option)}
                          onChange={() => handleFilterChange('skillLevel', option)}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                        />
                        <label
                          htmlFor={`skill-${option}`}
                          className={`flex-1 cursor-pointer ${
                            filters.skillLevels.includes(option) ? 'text-[#B20000] font-medium' : 'text-[#6F6F6F]'
                          }`}
                        >
                          {option}
                        </label>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter */}
            <div className="relative" ref={el => dropdownRefs.current['type'] = el}>
              <button
                className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
                  filters.type !== "All Types"
                    ? 'border-b-[#B20000] text-[#B20000]'
                    : 'border-b-gray-200 text-gray-600 hover:border-b-gray-300'
                }`}
                onClick={() => toggleDropdown('type')}
              >
                <span>{filters.type}</span>
                <ChevronDown className={`h-4 w-4 ml-2 ${
                  filters.type !== "All Types" ? 'text-[#B20000]' : 'text-gray-400'
                }`} />
              </button>
              {openDropdown === 'type' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg">
                  {filterOptions.type.map((option) => (
                    <button
                      key={option}
                      className={`block w-full text-left px-4 py-2 transition-colors duration-200 hover:bg-[#ffeae5] hover:text-[#B20000] ${
                        filters.type === option ? 'bg-[#ffeae5] text-[#B20000] font-medium' : ''
                      }`}
                      onClick={() => handleFilterChange('type', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gender Filter */}
            <div className="relative" ref={el => dropdownRefs.current['gender'] = el}>
              <button
                className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
                  filters.gender !== "All Genders"
                    ? 'border-b-[#B20000] text-[#B20000]'
                    : 'border-b-gray-200 text-gray-600 hover:border-b-gray-300'
                }`}
                onClick={() => toggleDropdown('gender')}
              >
                <span>{filters.gender}</span>
                <ChevronDown className={`h-4 w-4 ml-2 ${
                  filters.gender !== "All Genders" ? 'text-[#B20000]' : 'text-gray-400'
                }`} />
              </button>
              {openDropdown === 'gender' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg">
                  {filterOptions.gender.map((option) => (
                    <button
                      key={option}
                      className={`block w-full text-left px-4 py-2 transition-colors duration-200 hover:bg-[#ffeae5] hover:text-[#B20000] ${
                        filters.gender === option ? 'bg-[#ffeae5] text-[#B20000] font-medium' : ''
                      }`}
                      onClick={() => handleFilterChange('gender', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Day Filter */}
            <div className="relative" ref={el => dropdownRefs.current['day'] = el}>
              <button
                className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
                  filters.day !== "All Days"
                    ? 'border-b-[#B20000] text-[#B20000]'
                    : 'border-b-gray-200 text-gray-600 hover:border-b-gray-300'
                }`}
                onClick={() => toggleDropdown('day')}
              >
                <span>{filters.day}</span>
                <ChevronDown className={`h-4 w-4 ml-2 ${
                  filters.day !== "All Days" ? 'text-[#B20000]' : 'text-gray-400'
                }`} />
              </button>
              {openDropdown === 'day' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg">
                  {filterOptions.day.map((option) => (
                    <button
                      key={option}
                      className={`block w-full text-left px-4 py-2 transition-colors duration-200 hover:bg-[#ffeae5] hover:text-[#B20000] ${
                        filters.day === option ? 'bg-[#ffeae5] text-[#B20000] font-medium' : ''
                      }`}
                      onClick={() => handleFilterChange('day', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters Button */}
          {isAnyFilterActive() && (
            <div className="flex justify-center">
              <button
                className="flex items-center text-[#B20000] hover:text-[#8A0000] font-medium"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </button>
            </div>
          )}
        </div>

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
                        <p className="text-sm font-medium text-[#6F6F6F]">{formatLeagueDates(league.start_date, league.end_date, league.hide_day)}</p>
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
                              location={location}
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
        handleFilterChange={handleFilterChange}
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