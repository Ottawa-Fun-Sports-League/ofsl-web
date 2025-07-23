import { supabase } from "./supabase";
import { logger } from "./logger";

export interface League {
  id: number;
  name: string;
  description: string | null;
  additional_info: string | null;
  location: string | null;
  league_type: "regular_season" | "tournament" | "skills_drills" | null;
  gender: "Mixed" | "Female" | "Male" | null;
  sport_id: number | null;
  skill_id: number | null;
  skill_ids: number[] | null;
  day_of_week: number | null;
  start_date: string | null;
  year: string | null;
  end_date: string | null;
  cost: number | null;
  max_teams: number | null;
  gym_ids: number[] | null;
  active: boolean | null;
  hide_day: boolean | null;
  created_at: string;

  // Joined data
  sport_name: string | null;
  skill_name: string | null;
  gyms: Array<{
    id: number;
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>;
}

export interface LeagueWithTeamCount extends League {
  team_count: number;
  spots_remaining: number;
  skill_names: string[] | null;
}

// Convert day_of_week number to day name
export const getDayName = (dayOfWeek: number | null): string => {
  if (dayOfWeek === null) return "";
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek] || "";
};

// Format dates for display
export const formatLeagueDates = (
  startDate: string | null,
  endDate: string | null,
  hideDay: boolean = false,
): string => {
  if (!startDate || !endDate) return "";

  // Parse dates as local dates to avoid timezone shifts
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Start date always shows the day
  const startOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  // End date may hide the day based on the hideDay parameter
  const endOptions: Intl.DateTimeFormatOptions = hideDay
    ? {
        month: "short",
        year: "numeric",
      }
    : {
        month: "short",
        day: "numeric",
        year: "numeric",
      };

  return `${start.toLocaleDateString("en-US", startOptions)} - ${end.toLocaleDateString("en-US", endOptions)}`;
};

// Get primary gym location for display
export const getPrimaryLocation = (
  gyms: Array<{
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>,
): string[] => {
  if (!gyms || gyms.length === 0) return [];

  // Collect all unique locations from all gyms
  const allLocations = new Set<string>();

  gyms.forEach((gym) => {
    if (gym.locations && gym.locations.length > 0) {
      gym.locations.forEach((location) => allLocations.add(location));
    }
  });

  return Array.from(allLocations);
};

// Get gym names for display
export const getGymNames = (
  gyms: Array<{
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>,
): string[] => {
  if (!gyms || gyms.length === 0) return [];

  return gyms
    .map((gym) => gym.gym)
    .filter((name): name is string => name !== null && name.trim() !== "");
};

// Get gym names filtered by specific location
export const getGymNamesByLocation = (
  gyms: Array<{
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>,
  location: string
): string[] => {
  if (!gyms || gyms.length === 0) return [];

  return gyms
    .filter((gym) => gym.locations && gym.locations.includes(location))
    .map((gym) => gym.gym)
    .filter((name): name is string => name !== null && name.trim() !== "");
};

// Get location display text based on gym locations
export const getLocationDisplay = (
  gyms: Array<{
    gym: string | null;
    address: string | null;
    locations: string[] | null;
  }>,
): string => {
  if (!gyms || gyms.length === 0) return "Location TBD";

  // Get all unique locations from selected gyms
  const locations = getPrimaryLocation(gyms);

  if (locations.length === 0) return "Location TBD";
  if (locations.length === 1) return locations[0];

  // Multiple locations = "Various"
  return "Various";
};

// Fetch all leagues with related data
export const fetchLeagues = async (): Promise<LeagueWithTeamCount[]> => {
  try {
    // First, get leagues with sport and skill information
    const { data: leaguesData, error: leaguesError } = await supabase
      .from("leagues")
      .select(
        `
        *,
        sports:sport_id(name),
        skills:skill_id(name)
      `,
      )
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (leaguesError) {
      logger.error("Error fetching leagues", leaguesError);
      return [];
    }

    if (!leaguesData) return [];

    // Get team counts for each league
    const { data: teamCounts, error: teamCountsError } = await supabase
      .from("teams")
      .select("league_id, id")
      .eq("active", true);

    if (teamCountsError) {
      logger.error("Error fetching team counts", teamCountsError);
    }

    // Get all unique gym IDs
    const allGymIds = new Set<number>();
    const allSkillIds = new Set<number>();
    leaguesData.forEach((league) => {
      if (league.gym_ids) {
        league.gym_ids.forEach((id: string | number) => allGymIds.add(Number(id)));
      }
      if (league.skill_ids) {
        league.skill_ids.forEach((id: number) => allSkillIds.add(id));
      }
    });

    // Fetch gym information
    const { data: gymsData, error: gymsError } = await supabase
      .from("gyms")
      .select("id, gym, address, locations")
      .in("id", Array.from(allGymIds));

    if (gymsError) {
      logger.error("Error fetching gyms", gymsError);
    }

    const gymsMap = new Map(gymsData?.map((gym) => [gym.id, gym]) || []);

    // Fetch all skills for mapping skill_ids to names
    const { data: allSkills, error: skillsError } = await supabase
      .from("skills")
      .select("id, name");

    if (skillsError) {
      logger.error("Error fetching skills", skillsError);
    }

    const skillsMap = new Map(
      allSkills?.map((skill) => [skill.id, skill]) || [],
    );

    const teamCountsMap = new Map<number, number>();

    // Count teams per league
    teamCounts?.forEach((team) => {
      const currentCount = teamCountsMap.get(team.league_id) || 0;
      teamCountsMap.set(team.league_id, currentCount + 1);
    });

    // Transform the data
    const leagues: LeagueWithTeamCount[] = leaguesData.map((league) => {
      const teamCount = teamCountsMap.get(league.id) || 0;
      const maxTeams = league.max_teams || 20;
      const spotsRemaining = Math.max(0, maxTeams - teamCount);

      // Get skill names from skill_ids array
      let skillNames: string[] | null = null;
      if (league.skill_ids && league.skill_ids.length > 0) {
        skillNames = league.skill_ids
          .map((id) => skillsMap.get(id)?.name)
          .filter((name) => name !== undefined) as string[];
      }

      // Get gyms for this league
      const leagueGyms = (league.gym_ids || [])
        .map((gymId: string | number) => gymsMap.get(Number(gymId)))
        .filter((gym) => gym !== undefined);

      return {
        ...league,
        sport_name: league.sports?.name || null,
        skill_name: league.skills?.name || null,
        skill_ids: league.skill_ids || [],
        skill_names: skillNames,
        gyms: leagueGyms,
        team_count: teamCount,
        spots_remaining: spotsRemaining,
      };
    });

    return leagues;
  } catch (error) {
    logger.error("Error in fetchLeagues", error);
    return [];
  }
};

// Fetch a specific league by ID
export const fetchLeagueById = async (id: number): Promise<League | null> => {
  try {
    const { data, error } = await supabase
      .from("leagues")
      .select(
        `
        *,
        sports:sport_id(name),
        skills:skill_id(name)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      logger.error("Error fetching league", error);
      return null;
    }

    if (!data) return null;

    // Get gym information if gym_ids exist
    let skillNames: string[] | null = null;
    if (data.skill_ids && data.skill_ids.length > 0) {
      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", data.skill_ids);

      if (!skillsError && skillsData) {
        skillNames = skillsData.map((skill) => skill.name);
      }
    }

    let gyms: Array<{
      id: number;
      gym: string | null;
      address: string | null;
      locations: string[] | null;
    }> = [];
    if (data.gym_ids && data.gym_ids.length > 0) {
      // Convert gym_ids to numbers since they might be stored as strings
      const gymIds = data.gym_ids.map((id: string | number) => Number(id));
      
      const { data: gymsData, error: gymsError } = await supabase
        .from("gyms")
        .select("id, gym, address, locations")
        .in("id", gymIds);

      if (gymsError) {
        logger.error("Error fetching gyms", gymsError);
      } else {
        gyms = gymsData || [];
      }
    }

    return {
      ...data,
      sport_name: data.sports?.name || null,
      skill_name: data.skills?.name || null,
      skill_names: skillNames,
      gyms: gyms || [],
    };
  } catch (error) {
    logger.error("Error in fetchLeagueById", error);
    return null;
  }
};

// Fetch available sports for filtering
export const fetchSports = async () => {
  const { data, error } = await supabase
    .from("sports")
    .select("id, name")
    .eq("active", true)
    .order("name");

  if (error) {
    logger.error("Error fetching sports", error);
    return [];
  }

  return data || [];
};

// Fetch available skills for filtering
export const fetchSkills = async () => {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name")
    .order("order_index");

  if (error) {
    logger.error("Error fetching skills", error);
    return [];
  }

  return data || [];
};
