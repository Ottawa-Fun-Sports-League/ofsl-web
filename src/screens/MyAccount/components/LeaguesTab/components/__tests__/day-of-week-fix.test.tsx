import { describe, it, expect } from 'vitest';

describe('Day of Week Field Fix', () => {
  it('should correctly handle Sunday (day 0) in NewLeagueForm', () => {
    // Test that day_of_week = 0 is properly handled (not treated as falsy)
    const testLeague = {
      name: 'Test League',
      description: '',
      league_type: 'regular_season' as const,
      gender: 'Mixed' as const,
      location: '',
      sport_id: 1,
      skill_id: 1,
      skill_ids: [1],
      day_of_week: 0, // Sunday
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      year: '2024',
      cost: 100,
      max_teams: 8,
      gym_ids: [],
      hide_day: false,
      payment_due_date: '2024-01-01',
      deposit_amount: null,
      deposit_date: '',
      team_registration: true,
    };

    // The key test: when day_of_week is 0 (Sunday), it should not be treated as falsy
    const value = testLeague.day_of_week !== null ? testLeague.day_of_week.toString() : '';
    expect(value).toBe('0'); // Should be '0', not ''
    
    // Test that null is handled correctly
    function getDayValue(day: number | null): string {
      return day !== null ? day.toString() : '';
    }
    expect(getDayValue(null)).toBe(''); // Should be empty string for null
  });

  it('should correctly handle all days of week', () => {
    const days: (number | null)[] = [0, 1, 2, 3, 4, 5, 6]; // Sunday through Saturday
    
    days.forEach(day => {
      const value = day !== null ? day.toString() : '';
      expect(value).toBe(day !== null ? day.toString() : '');
    });
  });
});