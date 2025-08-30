import { useState, useEffect, useCallback } from 'react';
import { LeagueCard } from './LeagueCard';
import { LeagueWithTeamCount } from '../types';
import { groupLeaguesByDay, getOrderedDayNames } from '../../../../../lib/leagues';
import { supabase } from '../../../../../lib/supabase';

interface LeaguesListProps {
  leagues: LeagueWithTeamCount[];
  onDelete: (leagueId: number) => Promise<void>;
  onCopy: (league: LeagueWithTeamCount) => void;
  onManageSchedule?: (leagueId: number) => void;
}

export function LeaguesList({ leagues, onDelete, onCopy, onManageSchedule }: LeaguesListProps) {
  const [leaguesWithEmptySpots, setLeaguesWithEmptySpots] = useState<Set<number>>(new Set());

  // Batch check for empty spots in league schedules
  const checkForEmptySpots = useCallback(async () => {
    const leaguesWithSchedules = leagues.filter(league => league.has_schedule);
    if (leaguesWithSchedules.length === 0) return;

    const leagueIds = leaguesWithSchedules.map(league => league.id);
    
    try {
      const { data, error } = await supabase
        .from('league_schedules')
        .select('league_id, schedule_data')
        .in('league_id', leagueIds);

      if (error) {
        console.error('Error loading schedules:', error);
        return;
      }

      const leaguesWithEmpty = new Set<number>();
      data?.forEach(schedule => {
        if (schedule.schedule_data?.tiers) {
          const tiers = schedule.schedule_data.tiers;
          
          // Check only the used positions based on tier format (typically A, B, C for 3-team volleyball)
          const hasEmpty = tiers.some((tier: any) => {
            const teams = tier.teams || {};
            const format = tier.format || '3-teams-6-sets';
            
            // Define which positions are actually used based on format
            let usedPositions: string[] = [];
            if (format.includes('3-teams') || format === '3-teams-6-sets') {
              usedPositions = ['A', 'B', 'C'];
            } else if (format.includes('2-teams')) {
              usedPositions = ['A', 'B'];
            } else if (format.includes('4-teams')) {
              usedPositions = ['A', 'B', 'C', 'D'];
            } else if (format.includes('6-teams')) {
              usedPositions = ['A', 'B', 'C', 'D', 'E', 'F'];
            } else {
              // Default to 3-team format
              usedPositions = ['A', 'B', 'C'];
            }
            
            // Only check the positions that should be used for this format
            return usedPositions.some(position => teams[position] === null);
          });
          
          console.log(`League ${schedule.league_id} schedule check (FIXED):`);
          console.log(`  tierCount: ${tiers.length}, hasEmpty: ${hasEmpty}`);
          
          if (hasEmpty) {
            leaguesWithEmpty.add(schedule.league_id);
          }
        }
      });

      setLeaguesWithEmptySpots(leaguesWithEmpty);
    } catch (err) {
      console.error('Error checking for empty spots:', err);
    }
  }, [leagues]);

  useEffect(() => {
    checkForEmptySpots();
  }, [leagues]);

  // Also re-check when the page becomes visible (user returns from schedule management)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForEmptySpots();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForEmptySpots]);

  if (leagues.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No leagues found</h3>
        <p className="text-[#6F6F6F]">Create your first league to get started.</p>
      </div>
    );
  }

  // Group leagues by day of the week
  const groupedLeagues = groupLeaguesByDay(leagues);
  const orderedDayNames = getOrderedDayNames();
  
  // Only show days that have leagues
  const activeDays = orderedDayNames.filter(dayName => 
    groupedLeagues[dayName] && groupedLeagues[dayName].length > 0
  );

  return (
    <div className="space-y-8">
      {activeDays.map(dayName => (
        <div key={dayName}>
          {/* Day Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#6F6F6F] mb-1">{dayName}</h2>
            <div className="w-12 h-0.5 bg-[#B20000] rounded"></div>
          </div>
          
          {/* League Cards for this Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedLeagues[dayName].map(league => (
              <LeagueCard
                key={league.id}
                league={league}
                onDelete={onDelete}
                onCopy={onCopy}
                onManageSchedule={onManageSchedule}
                hasEmptySpots={leaguesWithEmptySpots.has(league.id)}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Leagues without a day specified */}
      {leagues.filter(league => league.day_of_week === null || league.day_of_week === undefined).length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#6F6F6F] mb-1">No Day Specified</h2>
            <div className="w-12 h-0.5 bg-[#B20000] rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues
              .filter(league => league.day_of_week === null || league.day_of_week === undefined)
              .map(league => (
                <LeagueCard
                  key={league.id}
                  league={league}
                  onDelete={onDelete}
                  onCopy={onCopy}
                  onManageSchedule={onManageSchedule}
                  hasEmptySpots={leaguesWithEmptySpots.has(league.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}