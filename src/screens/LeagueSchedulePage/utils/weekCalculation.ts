/**
 * Week Calculation Utilities
 * 
 * Calculates which week should be displayed based on the current date
 * and league schedule information.
 */

/**
 * Calculates which week should be displayed based on the current date
 * 
 * @param leagueStartDate - The start date of the league (YYYY-MM-DD format)
 * @param leagueEndDate - The end date of the league (YYYY-MM-DD format)
 * @param leagueDayOfWeek - The day of week the league plays (0 = Sunday, 1 = Monday, etc.)
 * @returns The week number that should be displayed
 */
export function calculateCurrentWeekToDisplay(
  leagueStartDate: string | null,
  leagueEndDate: string | null,
  leagueDayOfWeek?: number | null
): number {
  // If no start date, default to week 1
  if (!leagueStartDate) return 1;

  const today = new Date();
  const startDate = new Date(leagueStartDate + 'T00:00:00');
  
  // If league hasn't started yet, show week 1
  if (today < startDate) return 1;

  // Calculate the current week number based on elapsed time
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(diffDays / 7);
  
  // Calculate which week we're currently in
  let currentWeek = weeksSinceStart + 1;

  // If we have the league day of week, check if we've passed this week's game day
  if (leagueDayOfWeek !== null && leagueDayOfWeek !== undefined) {
    const todayDayOfWeek = today.getDay();
    
    // Calculate the date of the current week's game day
    const currentWeekStartDate = new Date(startDate);
    currentWeekStartDate.setDate(startDate.getDate() + (weeksSinceStart * 7));
    
    // If today is after the game day for this week, show next week
    // For example: If league plays on Monday (1) and today is Tuesday (2)
    if (todayDayOfWeek > leagueDayOfWeek) {
      currentWeek++;
    } else if (todayDayOfWeek === leagueDayOfWeek) {
      // If it's the game day, check the time
      // After 11 PM on game day, show next week's schedule
      const currentHour = today.getHours();
      if (currentHour >= 23) {
        currentWeek++;
      }
    }
  }

  // Calculate max weeks if we have end date
  if (leagueEndDate) {
    const endDate = new Date(leagueEndDate + 'T00:00:00');
    const totalDiffTime = endDate.getTime() - startDate.getTime();
    // Inclusive week count: include the start week when end lands on a later matching week
    const totalWeeks = Math.floor(totalDiffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
    
    // Don't go beyond the total weeks
    if (currentWeek > totalWeeks) {
      return totalWeeks;
    }
  }

  // Ensure we don't return less than 1
  return Math.max(1, currentWeek);
}

/**
 * Determines if a given week is in the past, present, or future
 * 
 * @param weekNumber - The week number to check
 * @param leagueStartDate - The start date of the league
 * @param leagueDayOfWeek - The day of week the league plays
 * @returns 'past' | 'current' | 'future'
 */
export function getWeekStatus(
  weekNumber: number,
  leagueStartDate: string | null,
  leagueDayOfWeek?: number | null
): 'past' | 'current' | 'future' {
  if (!leagueStartDate) return 'future';

  const today = new Date();
  const startDate = new Date(leagueStartDate + 'T00:00:00');
  
  // Calculate the date for this week
  const weekStartDate = new Date(startDate);
  weekStartDate.setDate(startDate.getDate() + ((weekNumber - 1) * 7));
  
  // If we have the day of week, calculate the exact game date
  if (leagueDayOfWeek !== null && leagueDayOfWeek !== undefined) {
    const daysUntilGame = (leagueDayOfWeek - weekStartDate.getDay() + 7) % 7;
    weekStartDate.setDate(weekStartDate.getDate() + daysUntilGame);
    
    // Add 23 hours to consider the day complete after 11 PM
    const weekEndTime = new Date(weekStartDate);
    weekEndTime.setHours(23, 0, 0, 0);
    
    if (today < weekStartDate) {
      return 'future';
    } else if (today > weekEndTime) {
      return 'past';
    } else {
      return 'current';
    }
  }
  
  // Without day of week, just check if the week has started
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 7);
  
  if (today < weekStartDate) {
    return 'future';
  } else if (today >= weekEndDate) {
    return 'past';
  } else {
    return 'current';
  }
}
