// Mock data for standings - keeping this until we implement the actual standings system
export const mockStandings = [
  {
    id: 1,
    team: "Setters of Catan",
    wins: 18,
    losses: 2,
    points: 36,
    pointsAgainst: 10,
    differentials: "+26",
  },
  {
    id: 2,
    team: "Block Party",
    wins: 16,
    losses: 4,
    points: 32,
    pointsAgainst: 12,
    differentials: "+20",
  },
  {
    id: 3,
    team: "Dig It",
    wins: 15,
    losses: 5,
    points: 30,
    pointsAgainst: 14,
    differentials: "+16",
  },
  {
    id: 4,
    team: "Net Gains",
    wins: 14,
    losses: 6,
    points: 28,
    pointsAgainst: 18,
    differentials: "+10",
  },
  {
    id: 5,
    team: "Serve-ivors",
    wins: 13,
    losses: 7,
    points: 26,
    pointsAgainst: 18,
    differentials: "+8",
  },
  {
    id: 6,
    team: "Spiked Punch",
    wins: 12,
    losses: 8,
    points: 24,
    pointsAgainst: 20,
    differentials: "+4",
  },
  {
    id: 7,
    team: "Setting Ducks",
    wins: 11,
    losses: 9,
    points: 22,
    pointsAgainst: 22,
    differentials: "0",
  },
  {
    id: 8,
    team: "Block and Roll",
    wins: 10,
    losses: 10,
    points: 20,
    pointsAgainst: 22,
    differentials: "-2",
  },
  {
    id: 9,
    team: "Ace of Base",
    wins: 9,
    losses: 11,
    points: 18,
    pointsAgainst: 24,
    differentials: "-6",
  },
  {
    id: 10,
    team: "Sets on the Beach",
    wins: 8,
    losses: 12,
    points: 16,
    pointsAgainst: 26,
    differentials: "-10",
  },
];

// Get background color based on skill level
export const getSkillLevelColor = (level: string) => {
  switch (level) {
    case "Elite":
      return "bg-purple-100 text-purple-800";
    case "Competitive":
      return "bg-blue-100 text-blue-800";
    case "Advanced":
      return "bg-indigo-100 text-indigo-800";
    case "Intermediate":
      return "bg-teal-100 text-teal-800";
    case "Beginner":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Function to get sport icon based on sport type
export const getSportIcon = (sport: string | null) => {
  if (!sport) return "";
  switch (sport) {
    case "Volleyball":
      return "/Volleyball.png";
    case "Badminton":
      return "/Badminton.png";
    case "Basketball":
      return "/Basketball.png";
    case "Pickleball":
      return "/pickleball.png";
    default:
      return "";
  }
};

// Function to get spots badge color
export const getSpotsBadgeColor = (spots: number) => {
  if (spots === 0) return "bg-red-100 text-red-800";
  if (spots <= 3) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
};

// Function to get spots text
export const getSpotsText = (spots: number) => {
  if (spots === 0) return "Full";
  if (spots === 1) return "1 spot left";
  return `${spots} spots left`;
};

// Get team name from position
export const getTeamNameFromPosition = (tier: Tier, position: string) => {
  return tier.teams[position]?.name || "";
};

// Types for schedule data
export interface Team {
  name: string;
  ranking: number;
}

export interface Tier {
  tierNumber: number;
  location: string;
  time: string;
  court: string;
  teams: Record<string, Team | null>;
  courts: Record<string, string>;
}

export interface Schedule {
  week: number;
  date: string;
  tiers: Tier[];
}

// Function to generate tiered schedule based on teams
export const generateTieredSchedule = (): Schedule => {
  const teamsPerTier = 3;
  const totalTiers = Math.ceil(mockStandings.length / teamsPerTier);
  const tiers: Tier[] = [];

  // Locations to cycle through
  const locations = [
    "Carleton University",
    "University of Ottawa",
    "Glebe Collegiate",
    "Nepean Sportsplex",
    "Orleans Recreation Complex",
  ];

  // Time slots to cycle through
  const timeSlots = [
    "7:00 PM - 8:30 PM",
    "8:30 PM - 10:00 PM",
    "6:00 PM - 7:30 PM",
    "7:30 PM - 9:00 PM",
  ];

  // Generate each tier
  for (let i = 0; i < Math.min(totalTiers, 5); i++) {
    // Limit to 5 tiers for display
    const startIndex = i * teamsPerTier;
    const tierTeams = mockStandings.slice(
      startIndex,
      startIndex + teamsPerTier,
    );

    // If we don't have exactly 3 teams, fill with placeholders
    const teams: Record<string, { name: string; ranking: number } | null> = {
      A: null,
      B: null,
      C: null,
    };
    const courts = {
      A: `Court ${(i % 3) + 1}`,
      B: `Court ${(i % 3) + 1}`,
      C: `Court ${(i % 3) + 1}`,
    };

    // Assign available teams with their rankings
    tierTeams.forEach((team, index) => {
      const position = String.fromCharCode(65 + index); // A, B, C
      teams[position] = {
        name: team.team,
        ranking: startIndex + index + 1, // Ranking based on position in mockStandings
      };
    });

    // Only create a tier if we have at least one team
    if (teams.A) {
      // Add tier to the schedule
      tiers.push({
        tierNumber: i + 1,
        location: locations[i % locations.length],
        time: timeSlots[i % timeSlots.length],
        court: `Court ${(i % 3) + 1}`,
        teams: teams,
        courts: courts,
      });
    }
  }

  return {
    week: 1,
    date: "June 5, 2025",
    tiers: tiers,
  };
};

// Generate the schedule
export const mockSchedule = [generateTieredSchedule()];

