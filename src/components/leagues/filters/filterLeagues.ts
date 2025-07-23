import { LeagueFilters } from './types';
import { getDayName, getPrimaryLocation } from '../../../lib/leagues';

interface Skill {
  id: number;
  name: string;
}

// Generic league interface that works with any league type that has these properties
interface FilterableLeague {
  sport_name: string | null;
  gyms: Array<{ gym: string | null; locations: string[] | null }> | null;
  skill_ids: number[] | null;
  skill_names: string[] | null;
  day_of_week: number | null;
  league_type: string | null;
  gender: string | null;
}

export function filterLeagues<T extends FilterableLeague>(
  leagues: T[],
  filters: LeagueFilters,
  skills: Skill[]
): T[] {
  return leagues.filter(league => {
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
      }
      
      // Fallback to checking skill_names if skill_ids is not available
      if (league.skill_names) {
        return league.skill_names.some(name => filters.skillLevels.includes(name));
      }
      
      return false;
    };

    // Map league types to filter options
    const getLeagueType = () => {
      switch (league.league_type) {
        case 'regular_season': return 'Regular Season';
        case 'tournament': return 'Tournament';
        case 'skills_drills': return 'Skills and Drills';
        default: return 'Regular Season';
      }
    };

    return (
      (filters.sport === "All Sports" || league.sport_name === filters.sport) &&
      (filters.location === "All Locations" || leagueLocations.includes(filters.location)) &&
      matchesSkillLevels() &&
      (filters.day === "All Days" || dayName === filters.day) &&
      (filters.type === "All Types" || getLeagueType() === filters.type) &&
      (filters.gender === "All Genders" || league.gender === filters.gender)
    );
  });
}