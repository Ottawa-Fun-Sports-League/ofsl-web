import { getPositionsForFormat, ALL_POSITIONS } from '../constants/formats';
import type { Tier } from '../../LeagueDetailPage/utils/leagueUtils';

export interface FormatValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates if a tier can be changed to a new format without losing teams
 */
export const validateFormatChange = (tier: Tier, newFormat: string): FormatValidationResult => {
  const newPositions = getPositionsForFormat(newFormat);
  
  // Count existing teams
  let existingTeamCount = 0;
  ALL_POSITIONS.forEach(position => {
    const team = tier.teams[position];
    if (team && team.name) {
      existingTeamCount++;
    }
  });
  
  // Check if new format can accommodate existing teams
  if (existingTeamCount > newPositions.length) {
    const existingTeams: string[] = [];
    ALL_POSITIONS.forEach(position => {
      const team = tier.teams[position];
      if (team && team.name) {
        existingTeams.push(team.name);
      }
    });
    
    return {
      isValid: false,
      reason: `Cannot change to this format. Current tier has ${existingTeamCount} teams (${existingTeams.join(', ')}), but ${newFormat} only supports ${newPositions.length} teams. Remove teams first.`
    };
  }
  
  return { isValid: true };
};

/**
 * Repacks teams into sequential positions when format changes (only when validation passes)
 */
export const repackTeamsForFormat = (tier: Tier, newFormat: string): typeof tier.teams => {
  const newPositions = getPositionsForFormat(newFormat);
  
  // Collect all existing teams with their current positions
  const existingTeams: Array<{ position: string; team: { name: string; ranking: number } }> = [];
  ALL_POSITIONS.forEach(position => {
    const team = tier.teams[position];
    if (team && team.name) {
      existingTeams.push({ position, team: { name: team.name, ranking: team.ranking } });
    }
  });
  
  // Create new teams object with sequential positioning
  const repackedTeams: typeof tier.teams = {};
  ALL_POSITIONS.forEach(position => {
    repackedTeams[position] = { name: '', ranking: 0 };
  });
  
  // Assign existing teams to sequential positions
  existingTeams.forEach((teamData, index) => {
    if (index < newPositions.length) {
      const newPosition = newPositions[index];
      repackedTeams[newPosition] = { name: teamData.team.name, ranking: teamData.team.ranking };
    }
  });
  
  return repackedTeams;
};

/**
 * Gets team data for a specific position
 */
export const getTeamForPosition = (tier: Record<string, string | number | boolean | null | undefined>, position: string) => {
  const nameKey = `team_${position.toLowerCase()}_name`;
  const rankingKey = `team_${position.toLowerCase()}_ranking`;
  
  const teamName = tier[nameKey] as string | null;
  const teamRanking = tier[rankingKey] as number | null;
  
  return teamName ? { name: teamName, ranking: teamRanking || 0 } : null;
};