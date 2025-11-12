export interface LeagueFilters {
  sport: string;
  location: string;
  skillLevels: string[];
  day: string;
  type: string;
  gender: string;
}

export interface FilterOptions {
  location: string[];
  skillLevels: string[];
  day: string[];
  type: string[];
  gender: string[];
}

export const DEFAULT_FILTERS: LeagueFilters = {
  sport: "All Sports",
  location: "All Locations",
  skillLevels: [],
  day: "All Days",
  type: "All Types",
  gender: "All Genders"
};

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  location: ["All Locations", "East", "West", "Central"],
  skillLevels: [],
  day: ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  type: ["All Types", "Regular Season", "Tournament", "Skills and Drills", "Single Session"],
  gender: ["All Genders", "Mixed", "Female", "Male"]
};
