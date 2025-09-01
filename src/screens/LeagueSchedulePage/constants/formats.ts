export const GAME_FORMATS = [
  { value: '3-teams-6-sets', label: '3 teams (6 sets)', teamCount: 3 },
  { value: '2-teams-4-sets', label: '2 teams (4 sets)', teamCount: 2 },
  { value: '2-teams-best-of-5', label: '2 teams (Best of 5)', teamCount: 2 },
  { value: '2-teams-best-of-3', label: '2 teams (Best of 3)', teamCount: 2 },
  { value: '4-teams-head-to-head', label: '4 teams (Head-to-head)', teamCount: 4 },
  { value: '6-teams-head-to-head', label: '6 teams (head-to-head)', teamCount: 6 },
  { value: '2-teams-elite', label: '2 teams (Elite)', teamCount: 2 },
] as const;

export const getTeamCountForFormat = (format: string): number => {
  const gameFormat = GAME_FORMATS.find(f => f.value === format);
  return gameFormat?.teamCount || 3;
};

export const getPositionsForFormat = (format: string): string[] => {
  const teamCount = getTeamCountForFormat(format);
  const positions = ['A', 'B', 'C', 'D', 'E', 'F'];
  return positions.slice(0, teamCount);
};

export const getGridColsClass = (teamCount: number): string => {
  switch (teamCount) {
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-3';
    case 4: return 'grid-cols-4';
    case 6: return 'grid-cols-6';
    default: return 'grid-cols-3';
  }
};