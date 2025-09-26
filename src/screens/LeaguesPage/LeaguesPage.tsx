import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  fetchLeagues,
  fetchSports,
  fetchSkills,
  LeagueWithTeamCount,
  groupLeaguesByDay,
  getOrderedDayNames,
  GroupedLeagues,
} from "../../lib/leagues";
import { getStripeProductByLeagueId } from '../../lib/stripe';
import { MobileFilterDrawer } from "./components/MobileFilterDrawer";
import { LoadingSpinner } from "../../components/ui/loading-spinner";

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
import {
  LeagueCard as SharedLeagueCard,
  getLeagueSpotsBadgeColor,
  getLeagueSpotsText,
} from "../../components/leagues/LeagueCard";
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

  // Group filtered leagues by day of the week
  const groupedLeagues: GroupedLeagues = groupLeaguesByDay(filteredLeagues);
  const orderedDayNames = getOrderedDayNames();

  // Only show days that have leagues
  const activeDays = orderedDayNames.filter(dayName => 
    groupedLeagues[dayName] && groupedLeagues[dayName].length > 0
  );

  if (loading) {
    return (
      <div className="bg-white w-full">
        <div className="max-w-[1280px] mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl text-[#6F6F6F] font-bold mb-8 md:mb-12 text-center">
            Find a league
          </h1>
          <LoadingSpinner size="lg" />
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

        {/* Grouped League Cards by Day */}
        {activeDays.length > 0 ? (
          <div className="space-y-12">
            {activeDays.map(dayName => (
              <div key={dayName}>
                {/* Day Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#6F6F6F] mb-2">{dayName}</h2>
                  <div className="w-16 h-1 bg-[#B20000] rounded"></div>
                </div>
                
                {/* League Cards for this Day */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedLeagues[dayName].map(league => (
                    <Link
                      key={league.id}
                      to={`/leagues/${league.id}`}
                      className="block rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
                    >
                      <SharedLeagueCard
                        league={league}
                        showEarlyBirdNotice
                        footer={(
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-[#B20000] mr-1" />
                              <span
                                className={`text-xs font-medium py-0.5 px-2 rounded-full ${getLeagueSpotsBadgeColor(league.spots_remaining)}`}
                              >
                                {getLeagueSpotsText(league.spots_remaining)}
                              </span>
                            </div>

                            <Button
                              className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-4"
                              variant="default"
                            >
                              {league.spots_remaining === 0 ? 'Join Waitlist' : 'View Details'}
                            </Button>
                          </div>
                        )}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        
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
