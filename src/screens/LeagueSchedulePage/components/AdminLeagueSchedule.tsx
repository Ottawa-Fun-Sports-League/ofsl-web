import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { MapPin, Clock, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { SubmitScoresModal } from './SubmitScoresModal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { TierEditModal } from './TierEditModal';
import { AddPlayoffWeeksModal } from './AddPlayoffWeeksModal';
import { AddTeamModal } from './AddTeamModal';
import type { WeeklyScheduleTier, TeamPositionId } from '../types';
import type { Tier } from '../../LeagueDetailPage/utils/leagueUtils';
import { getPositionsForFormat, getGridColsClass, getTeamCountForFormat } from '../utils/formatUtils';
import { getTeamForPosition } from '../utils/scheduleLogic';
import { addTierToAllWeeks, removeTierFromAllWeeks, moveWeekPlacements, getNextPlayableWeek } from '../database/scheduleDatabase';
import { calculateCurrentWeekToDisplay } from '../utils/weekCalculation';

interface AdminLeagueScheduleProps {
  leagueId: string;
  leagueName: string;
}

export function AdminLeagueSchedule({ leagueId, leagueName }: AdminLeagueScheduleProps) {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin === true;
  
  // Core state
  const [currentWeek, setCurrentWeek] = useState(1);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [weeklyTiers, setWeeklyTiers] = useState<WeeklyScheduleTier[]>([]);
  const [submittedTierNumbers, setSubmittedTierNumbers] = useState<Set<number>>(new Set());
  const [todayWeekNumber, setTodayWeekNumber] = useState<number | null>(null);
  const [loadingWeekData, setLoadingWeekData] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState<{
    start_date: string | null;
    end_date: string | null;
    playoff_weeks: number;
    schedule_visible?: boolean | null;
  } | null>(null);
  const [week1TierStructure, setWeek1TierStructure] = useState<WeeklyScheduleTier[]>([]);

  // Admin-specific state
  const [isEditScheduleMode, setIsEditScheduleMode] = useState(false);
  const [noGamesWeek, setNoGamesWeek] = useState(false);
  const [savingNoGames, setSavingNoGames] = useState(false);
  const [savingScheduleVisibility, setSavingScheduleVisibility] = useState(false);
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [editingTierIndex, setEditingTierIndex] = useState<number>(-1);
  const [editingWeeklyTier, setEditingWeeklyTier] = useState<WeeklyScheduleTier | null>(null);
  const [addPlayoffModalOpen, setAddPlayoffModalOpen] = useState(false);
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [addTeamModalData, setAddTeamModalData] = useState<{
    tierIndex: number;
    position: string;
  } | null>(null);
  const [teamPositions, setTeamPositions] = useState<Map<string, number>>(new Map());

  // Team deletion confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{
    tierIndex: number;
    position: string;
    teamName: string;
  } | null>(null);

  // Drag and drop state for team management
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedTeam: string | null;
    fromTier: number | null;
    fromPosition: string | null;
    hoverTier: number | null;
    hoverPosition: string | null;
    mouseX: number;
    mouseY: number;
  }>({
    isDragging: false,
    draggedTeam: null,
    fromTier: null,
    fromPosition: null,
    hoverTier: null,
    hoverPosition: null,
    mouseX: 0,
    mouseY: 0,
  });

  // Submit scores modal state
  const [submitScoresOpen, setSubmitScoresOpen] = useState(false);
  const [submitScoresTier, setSubmitScoresTier] = useState<WeeklyScheduleTier | null>(null);

  const openSubmitScores = (tier: WeeklyScheduleTier) => {
    setSubmitScoresTier(tier);
    setSubmitScoresOpen(true);
  };
  const closeSubmitScores = () => {
    setSubmitScoresOpen(false);
    setSubmitScoresTier(null);
  };

  // Auto-scroll functionality for drag and drop
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoScroll = (direction: "up" | "down") => {
    if (scrollIntervalRef.current) return; // Already scrolling

    const scrollAmount = direction === "up" ? -10 : 10;
    scrollIntervalRef.current = setInterval(() => {
      window.scrollBy(0, scrollAmount);
    }, 16); // ~60fps
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragMouseMove = (e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const scrollZoneHeight = 100; // 100px scroll zones at top and bottom
    const viewportHeight = window.innerHeight;
    const mouseY = e.clientY;

    // Check if mouse is in scroll zones
    if (mouseY < scrollZoneHeight) {
      // Top scroll zone - scroll up
      startAutoScroll("up");
    } else if (mouseY > viewportHeight - scrollZoneHeight) {
      // Bottom scroll zone - scroll down
      startAutoScroll("down");
    } else {
      // Not in scroll zone - stop scrolling
      stopAutoScroll();
    }

    // Update drag state with mouse position
    setDragState((prev) => ({
      ...prev,
      mouseX: e.clientX,
      mouseY: e.clientY,
    }));
  };

  // Setup drag event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("dragover", handleDragMouseMove);
      return () => {
        document.removeEventListener("dragover", handleDragMouseMove);
        stopAutoScroll();
      };
    }
  }, [dragState.isDragging, handleDragMouseMove]);

  // Cleanup scroll interval on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, []);

  useEffect(() => {
    loadWeekStartDate();
    loadWeeklySchedule(currentWeek);
    loadWeek1Structure();
    loadLeagueInfo();
    loadTeamPositions();
  }, [leagueId]);

  useEffect(() => {
    loadWeeklySchedule(currentWeek);
  }, [currentWeek]);

  const loadLeagueInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('start_date, end_date, playoff_weeks, day_of_week, schedule_visible')
        .eq('id', parseInt(leagueId))
        .single();

      if (error) throw error;

      if (data) {
        setLeagueInfo({
          start_date: data.start_date,
          end_date: data.end_date,
          playoff_weeks: data.playoff_weeks || 0,
          schedule_visible: data.schedule_visible ?? true
        });

        // Calculate and set the current week based on actual date
        const calculatedWeek = calculateCurrentWeekToDisplay(
          data.start_date,
          data.end_date,
          data.day_of_week,
        );
        setCurrentWeek(calculatedWeek);
        setTodayWeekNumber(calculatedWeek);
      }
    } catch (error) {
      console.error("Error loading league info:", error);
    }
  };

  const handleScheduleVisibilityToggle = async (visible: boolean) => {
    try {
      setSavingScheduleVisibility(true);
      const { error } = await supabase
        .from('leagues')
        .update({ schedule_visible: visible })
        .eq('id', parseInt(leagueId));
      if (error) throw error;
      setLeagueInfo((prev) => prev ? { ...prev, schedule_visible: visible } : prev);
    } catch (e: any) {
      console.error('Failed to update schedule visibility', e);
      if (e?.code === 'PGRST204') {
        alert("Schedule visibility setting isn't available yet. Apply the DB migration to add 'schedule_visible' to the 'leagues' table, then try again.");
      } else {
        alert('Failed to update schedule visibility. Please try again.');
      }
    } finally {
      setSavingScheduleVisibility(false);
    }
  };

  const loadWeekStartDate = async () => {
    try {
      const { data, error } = await supabase
        .from("leagues")
        .select("start_date")
        .eq("id", parseInt(leagueId))
        .single();

      if (error) {
        console.error("Error loading league start date:", error);
        return;
      }

      if (data?.start_date) {
        setStartDate(data.start_date);
      }
    } catch (error) {
      console.error("Error loading league start date:", error);
    }
  };

  const loadWeeklySchedule = async (weekNumber: number) => {
    try {
      setLoadingWeekData(true);

      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("league_id", parseInt(leagueId))
        .eq("week_number", weekNumber)
        .order("tier_number", { ascending: true });

      if (error) {
        console.error("Error loading weekly schedule:", error);
        setWeeklyTiers([]);
        return;
      }

      setWeeklyTiers(data || []);
      
      // Week is considered no-games only if ALL tiers are marked no_games
      const allNoGames = Array.isArray(data) && data.length > 0 && data.every((t: any) => !!t.no_games);
      setNoGamesWeek(allNoGames);

      // Load which tiers already have a submitted scorecard this week
      try {
        const { data: submitted } = await supabase
          .from('game_results')
          .select('tier_number')
          .eq('league_id', parseInt(leagueId))
          .eq('week_number', weekNumber)
          .limit(1000);
        const set = new Set<number>();
        (submitted || []).forEach((r: any) => set.add(r.tier_number));
        setSubmittedTierNumbers(set);
      } catch {}
      
    } catch (error) {
      console.error("Error loading weekly schedule:", error);
      setWeeklyTiers([]);
      setNoGamesWeek(false);
    } finally {
      setLoadingWeekData(false);
    }
  };

  const loadWeek1Structure = async () => {
    try {
      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("tier_number, location, time_slot, court, format")
        .eq("league_id", parseInt(leagueId))
        .eq("week_number", 1)
        .order("tier_number", { ascending: true });

      if (error) {
        console.error("Error loading Week 1 structure:", error);
        return;
      }

      if (data) {
        const templateTiers = data.map((tier, index) => ({
          id: -index - 1,
          tier_number: tier.tier_number,
          location: tier.location,
          time_slot: tier.time_slot,
          court: tier.court,
          format: tier.format,
          team_a_name: null,
          team_a_ranking: null,
          team_b_name: null,
          team_b_ranking: null,
          team_c_name: null,
          team_c_ranking: null,
          team_d_name: null,
          team_d_ranking: null,
          team_e_name: null,
          team_e_ranking: null,
          team_f_name: null,
          team_f_ranking: null,
          is_completed: false,
          no_games: false,
          is_playoff: false,
        }));
        setWeek1TierStructure(templateTiers);
      }
    } catch (error) {
      console.error("Error loading Week 1 structure:", error);
    }
  };

  // Helper functions

  const getWeekDate = (weekNumber: number): string => {
    if (!startDate) return "League start date not set";

    const baseDate = new Date(startDate + "T00:00:00");
    const weekOffset = weekNumber - 1;

    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    return baseDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const canNavigateToWeek = (weekNumber: number): boolean => {
    if (weekNumber < 1) return false;
    if (!leagueInfo) return true;

    if (leagueInfo.start_date && leagueInfo.end_date) {
      const start = new Date(leagueInfo.start_date + "T00:00:00");
      const end = new Date(leagueInfo.end_date + "T00:00:00");
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      const maxWeeks = regularSeasonWeeks + leagueInfo.playoff_weeks;
      return weekNumber <= maxWeeks;
    }

    return true;
  };

  const isPlayoffWeek = (weekNumber: number): boolean => {
    if (!leagueInfo || !leagueInfo.start_date || !leagueInfo.end_date) return false;

    const start = new Date(leagueInfo.start_date + "T00:00:00");
    const end = new Date(leagueInfo.end_date + "T00:00:00");
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

    return weekNumber > regularSeasonWeeks;
  };

  const loadTeamPositions = async () => {
    try {
      const { data: standingsData, error } = await supabase
        .from("standings")
        .select(
          `
          teams!inner(name),
          current_position
        `,
        )
        .eq("league_id", parseInt(leagueId))
        .order("current_position", { ascending: true, nullsFirst: false });

      if (error && error.code !== "PGRST116") {
        console.warn("Error loading team standings for admin positions:", error);
        return;
      }

      if (standingsData && standingsData.length > 0) {
        const positionsMap = new Map<string, number>();
        standingsData.forEach((standing: any) => {
          positionsMap.set(standing.teams.name, standing.current_position || 1);
        });

        setTeamPositions(positionsMap);
      }
    } catch (error) {
      console.warn("Error loading team positions for admin schedule:", error);
    }
  };

  // Admin handlers
  const handleEnterEditMode = () => {
    if (!isAdmin) return; // UI guard: only admins can enter edit mode
    setIsEditScheduleMode(true);
  };
  const handleExitEditMode = () => {
    setIsEditScheduleMode(false);
    setDragState((prev) => ({ ...prev, isDragging: false, draggedTeam: null }));
  };
  const handleSaveChanges = () => setIsEditScheduleMode(false);

  // Admin: reset scores for a specific tier/week (delete game_results and clear completion)
  const handleResetTierScores = async (tier: WeeklyScheduleTier) => {
    if (!isAdmin) return;
    const confirmReset = confirm(`Reset scores for Tier ${tier.tier_number} (Week ${currentWeek})? This will delete submitted results and mark the tier incomplete.`);
    if (!confirmReset) return;
    try {
      const leagueIdNum = parseInt(leagueId);
      // Snapshot existing per-team results for rollback before deletion
      const { data: existingResults, error: fetchResErr } = await supabase
        .from('game_results')
        .select('team_name,wins,losses,points_for,points_against,league_points')
        .eq('league_id', leagueIdNum)
        .eq('week_number', currentWeek)
        .eq('tier_number', tier.tier_number);
      if (fetchResErr) throw fetchResErr;

      // Roll back standings for affected teams
      const teamNames = (existingResults || []).map((r: any) => r.team_name).filter(Boolean);
      if (teamNames.length > 0) {
        const { data: teamRows, error: teamsErr } = await supabase
          .from('teams')
          .select('id,name')
          .eq('league_id', leagueIdNum)
          .in('name', teamNames);
        if (teamsErr) throw teamsErr;
        const nameToId = new Map<string, number>();
        (teamRows || []).forEach((t: any) => nameToId.set(t.name, t.id));

        for (const row of (existingResults || [])) {
          const teamId = nameToId.get(row.team_name as string);
          if (!teamId) continue;
          const addWins = Number(row.wins || 0);
          const addLosses = Number(row.losses || 0);
          const pf = Number(row.points_for || 0);
          const pa = Number(row.points_against || 0);
          const addDiff = pf - pa;
          const addPoints = Number(row.league_points || 0);

          const { data: standingRow, error: standingErr } = await supabase
            .from('standings')
            .select('id,wins,losses,points,point_differential')
            .eq('league_id', leagueIdNum)
            .eq('team_id', teamId)
            .maybeSingle();
          if (standingErr && (standingErr as any).code !== 'PGRST116') throw standingErr;
          if (!standingRow) continue;

          const { error: updErr } = await supabase
            .from('standings')
            .update({
              wins: (standingRow as any).wins - addWins,
              losses: (standingRow as any).losses - addLosses,
              points: (standingRow as any).points - addPoints,
              point_differential: (standingRow as any).point_differential - addDiff,
            })
            .eq('id', (standingRow as any).id);
          if (updErr) throw updErr;
        }

        // Recalculate standings positions after rollback
        const { error: recalcErr } = await supabase.rpc('recalculate_standings_positions', {
          p_league_id: leagueIdNum,
        });
        if (recalcErr) {
          console.warn('Positions recalculation after reset failed', recalcErr);
        }

        // Clear next-week movement placements for affected teams (remove any occurrences of these names)
        try {
          const nextWeek = currentWeek + 1;
          const { data: nextRows } = await supabase
            .from('weekly_schedules')
            .select('id, team_a_name, team_b_name, team_c_name, team_d_name, team_e_name, team_f_name')
            .eq('league_id', leagueIdNum)
            .eq('week_number', nextWeek);

          const namesToClear = new Set(teamNames);
          for (const row of (nextRows || [])) {
            const updates: Record<string, any> = {};
            (['a','b','c','d','e','f'] as const).forEach((p) => {
              const key = `team_${p}_name` as const;
              const rk = `team_${p}_ranking` as const;
              const val = (row as any)[key] as string | null;
              if (val && namesToClear.has(val)) {
                updates[key] = null;
                updates[rk] = null;
              }
            });
            if (Object.keys(updates).length > 0) {
              const { error: clrErr } = await supabase
                .from('weekly_schedules')
                .update(updates)
                .eq('id', (row as any).id);
              if (clrErr) throw clrErr;
            }
          }
        } catch (mvErr) {
          console.warn('Failed to clear next-week placements during reset', mvErr);
        }
      }

      // Delete game results for this league/week/tier
      const { error: delErr } = await supabase
        .from('game_results')
        .delete()
        .eq('league_id', leagueIdNum)
        .eq('week_number', currentWeek)
        .eq('tier_number', tier.tier_number);
      if (delErr) throw delErr;

      // Clear completion flag on the weekly_schedules row
      const { error: updErr } = await supabase
        .from('weekly_schedules')
        .update({ is_completed: false })
        .eq('id', tier.id);
      if (updErr) throw updErr;

      await loadWeeklySchedule(currentWeek);
      alert('Scores reset for this tier.');
    } catch (e) {
      console.error('Failed to reset tier scores', e);
      alert('Failed to reset scores for this tier. Please try again.');
    }
  };

  const handleNoGamesChange = async (noGames: boolean) => {
    try {
      // Guard: disable week-level no-games edits if week is completed or in the past
      const weekCompleted = weeklyTiers.length > 0 && weeklyTiers.every(t => submittedTierNumbers.has(t.tier_number) || !!t.is_completed);
      const isPastWeek = todayWeekNumber !== null && currentWeek < todayWeekNumber;
      if (weekCompleted || isPastWeek) return;

      setSavingNoGames(true);
      
        // Movement will be applied after flags are updated (via RPC)

      // Then persist the weekly no_games flag
      const { error } = await supabase.rpc('set_week_no_games', {
        p_league_id: parseInt(leagueId),
        p_week_number: currentWeek,
        p_no_games: noGames,
      });

      if (error) {
        console.error("Error setting no_games flag:", error);
        return;
      }

      setNoGamesWeek(noGames);

      // Align all tiers' no_games with weekly flag for consistent behavior
      const { error: updAllErr } = await supabase
        .from('weekly_schedules')
        .update({ no_games: noGames })
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', currentWeek);
      if (updAllErr) console.warn('Failed to update no_games across tiers for week', updAllErr);

        // Apply movement after flags are updated (RPC preferred, fallback to client)
        try {
          const leagueIdNum = parseInt(leagueId);
          if (noGames) {
            const { error: rpcErr } = await supabase.rpc('apply_week_bump_auto', {
              p_league_id: leagueIdNum,
              p_from_week: currentWeek,
            });
            if (rpcErr) {
              const toWeek = await getNextPlayableWeek(leagueIdNum, currentWeek + 1);
              await moveWeekPlacements({ leagueId: leagueIdNum, fromWeek: currentWeek, toWeek });
            }
          } else {
            const { error: rpcErr } = await supabase.rpc('apply_week_rewind_auto', {
              p_league_id: leagueIdNum,
              p_to_week: currentWeek,
            });
            if (rpcErr) {
              let fromWeek = currentWeek + 1;
              for (let i = 0; i < 52; i++) {
                const candidate = currentWeek + 1 + i;
                const { data } = await supabase
                  .from('weekly_schedules')
                  .select('id')
                  .eq('league_id', leagueIdNum)
                  .eq('week_number', candidate)
                  .limit(1);
                if (Array.isArray(data) && data.length > 0) { fromWeek = candidate; break; }
              }
              await moveWeekPlacements({ leagueId: leagueIdNum, fromWeek, toWeek: currentWeek });
            }
          }
        } catch (mvErr) {
          console.warn('Weekly no-games movement bump failed', mvErr);
        }

      await loadWeeklySchedule(currentWeek);
    } catch (error) {
      console.error("Error setting no_games flag:", error);
    } finally {
      setSavingNoGames(false);
    }
  };

  const handlePlayoffWeeksAdded = (_weeksAdded: number) => {
    loadLeagueInfo();
    // Added playoff weeks to the schedule
  };

  // Tier management
  const handleEditTier = (tier: WeeklyScheduleTier, tierIndex: number) => {
    setEditingTierIndex(tierIndex);

    // Convert to legacy format for modal
    const legacyTier: Tier = {
      tierNumber: tier.tier_number,
      location: tier.location,
      time: tier.time_slot,
      court: tier.court,
      format: tier.format,
      teams: {
        A: tier.team_a_name ? { name: tier.team_a_name, ranking: tier.team_a_ranking || 0 } : null,
        B: tier.team_b_name ? { name: tier.team_b_name, ranking: tier.team_b_ranking || 0 } : null,
        C: tier.team_c_name ? { name: tier.team_c_name, ranking: tier.team_c_ranking || 0 } : null,
        D: tier.team_d_name ? { name: tier.team_d_name, ranking: tier.team_d_ranking || 0 } : null,
        E: tier.team_e_name ? { name: tier.team_e_name, ranking: tier.team_e_ranking || 0 } : null,
        F: tier.team_f_name ? { name: tier.team_f_name, ranking: tier.team_f_ranking || 0 } : null,
      },
      courts: { [tier.tier_number.toString()]: tier.court },
    };

    setSelectedTier(legacyTier);
    setEditModalOpen(true);
    setEditingWeeklyTier(tier);
  };

  const handleAddTier = async (afterTierNumber: number) => {
    try {
      if (weeklyTiers.length === 0) {
        alert("Please generate a schedule first before adding tiers.");
        return;
      }

      // Use template from last tier or defaults
      const tierTemplate =
        weeklyTiers.length > 0
          ? {
              location: weeklyTiers[weeklyTiers.length - 1].location || "TBD",
              time_slot: weeklyTiers[weeklyTiers.length - 1].time_slot || "TBD",
              court: "TBD",
              format: weeklyTiers[weeklyTiers.length - 1].format || "3-teams-6-sets",
            }
          : {
              location: "TBD",
              time_slot: "TBD",
              court: "TBD",
              format: "3-teams-6-sets",
            };

      await addTierToAllWeeks(parseInt(leagueId), currentWeek, afterTierNumber, tierTemplate);
      await loadWeeklySchedule(currentWeek);
    } catch (error) {
      console.error("Error adding tier:", error);
      alert("Failed to add tier. Please try again.");
    }
  };

  const handleRemoveTier = async (tierNumber: number) => {
    try {
      // Find the tier to check for assigned teams
      const tierToRemove = weeklyTiers.find((t) => t.tier_number === tierNumber);
      if (!tierToRemove) return;

      // Check if tier has any teams assigned
      const hasTeams = [
        tierToRemove.team_a_name,
        tierToRemove.team_b_name,
        tierToRemove.team_c_name,
        tierToRemove.team_d_name,
        tierToRemove.team_e_name,
        tierToRemove.team_f_name,
      ].some((teamName) => teamName && teamName.trim() !== "");

      if (hasTeams) {
        alert(
          `Cannot remove Tier ${tierNumber} because it has teams assigned. Please remove all teams from this tier first.`,
        );
        return;
      }

      if (
        !confirm(
          `Are you sure you want to remove Tier ${tierNumber}? This will remove it from all current and future weeks.`,
        )
      ) {
        return;
      }

      await removeTierFromAllWeeks(parseInt(leagueId), currentWeek, tierNumber);
      await loadWeeklySchedule(currentWeek);
    } catch (error) {
      console.error("Error removing tier:", error);
      alert("Failed to remove tier. Please try again.");
    }
  };

  // Team management
  const handleDeleteTeam = (tierIndex: number, position: string, teamName: string) => {
    setTeamToDelete({ tierIndex, position, teamName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      const { tierIndex, position } = teamToDelete;
      const tier = weeklyTiers[tierIndex];
      const nameKey = `team_${position.toLowerCase()}_name`;
      const rankingKey = `team_${position.toLowerCase()}_ranking`;

      const { error } = await supabase
        .from("weekly_schedules")
        .update({
          [nameKey]: null,
          [rankingKey]: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tier.id);

      if (error) throw error;

      await loadWeeklySchedule(currentWeek);
      setDeleteConfirmOpen(false);
      setTeamToDelete(null);
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Failed to delete team. Please try again.");
    }
  };

  const handleAddTeam = (tierIndex: number, position: string) => {
    setAddTeamModalData({ tierIndex, position });
    setAddTeamModalOpen(true);
  };

  // Function to get a team's current ranking from standings (same logic as useLeagueStandings)
  const getTeamCurrentRanking = async (
    teamName: string,
    leagueId: number,
    _currentWeek: number,
  ): Promise<number> => {
    try {
      // Use the same logic as useLeagueStandings to determine team rankings
      // This ensures consistency between the standings display and schedule rankings

      // Get all teams for this league
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, created_at")
        .eq("league_id", leagueId)
        .eq("active", true);

      if (teamsError) throw teamsError;

      // Get current schedule data for rankings (from league_schedules table)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("league_schedules")
        .select("schedule_data")
        .eq("league_id", leagueId)
        .maybeSingle();

      if (scheduleError && scheduleError.code !== "PGRST116") {
        console.warn("Error loading schedule data:", scheduleError);
      }

      // Extract team rankings from schedule if available
      const teamRankings = new Map<string, number>();
      const scheduleExists = !!scheduleData?.schedule_data?.tiers;

      if (scheduleExists) {
        scheduleData.schedule_data.tiers.forEach(
          (tier: { teams?: Record<string, { name: string; ranking: number } | null> }) => {
            if (tier.teams) {
              Object.values(tier.teams).forEach(
                (team: { name: string; ranking: number } | null) => {
                  if (team && team.name && team.ranking) {
                    teamRankings.set(team.name, team.ranking);
                  }
                },
              );
            }
          },
        );
      }

      // Create standings data (same as useLeagueStandings)
      const standingsData = (teamsData || []).map((team) => ({
        id: team.id,
        name: team.name,
        created_at: team.created_at,
        schedule_ranking: teamRankings.get(team.name),
      }));

      // Sort by schedule ranking if available, otherwise by registration order (same as useLeagueStandings)
      const sortedStandings = standingsData.sort((a, b) => {
        // If both teams have schedule rankings, sort by ranking
        if (a.schedule_ranking && b.schedule_ranking) {
          return a.schedule_ranking - b.schedule_ranking;
        }
        // If only one has ranking, prioritize it
        if (a.schedule_ranking && !b.schedule_ranking) {
          return -1;
        }
        if (!a.schedule_ranking && b.schedule_ranking) {
          return 1;
        }
        // If neither has ranking, sort by registration order
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Find the team's position in the sorted standings (1-based ranking)
      const teamIndex = sortedStandings.findIndex((team) => team.name === teamName);
      if (teamIndex >= 0) {
        return teamIndex + 1; // Convert to 1-based ranking
      }

      // Team not found - this shouldn't happen, but return a safe default
      console.warn(`Team "${teamName}" not found in standings`);
      return 999;
    } catch (error) {
      console.error("Error getting team ranking:", error);
      return 999;
    }
  };

  const handleAddTeamToSchedule = async (teamName: string, tierIndex: number, position: string) => {
    try {
      // Find the tier to add the team to
      const targetTier = weeklyTiers[tierIndex];
      if (!targetTier) {
        throw new Error("Target tier not found");
      }

      // Look up the team's current ranking from the weekly schedules
      const teamRanking = await getTeamCurrentRanking(teamName, parseInt(leagueId), currentWeek);

      // Update the tier with the new team
      const updatePayload = {
        [`team_${position.toLowerCase()}_name`]: teamName,
        [`team_${position.toLowerCase()}_ranking`]: teamRanking,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("weekly_schedules")
        .update(updatePayload)
        .eq("id", targetTier.id);

      if (error) throw error;

      await loadWeeklySchedule(currentWeek);
      setAddTeamModalOpen(false);
      setAddTeamModalData(null);
    } catch (error) {
      console.error("Error adding team:", error);
      alert("Failed to add team to schedule. Please try again.");
    }
  };

  // Modal handlers
  const handleModalClose = () => {
    setEditModalOpen(false);
    setSelectedTier(null);
    setEditingTierIndex(-1);
    setEditingWeeklyTier(null);
  };

  const handleSaveTier = async (
    _updatedTiers: Tier[],
    setAsDefaultInfo?: { location: boolean; time: boolean; court: boolean },
    updatedTier?: Tier,
  ) => {
    try {
      if (!editingWeeklyTier || !updatedTier) return;

      // Convert the legacy Tier format back to WeeklyScheduleTier format for database update
      const updatePayload = {
        location: updatedTier.location,
        time_slot: updatedTier.time,
        court: updatedTier.court,
        format: updatedTier.format,
        team_a_name: updatedTier.teams.A?.name || null,
        team_a_ranking: updatedTier.teams.A?.ranking || null,
        team_b_name: updatedTier.teams.B?.name || null,
        team_b_ranking: updatedTier.teams.B?.ranking || null,
        team_c_name: updatedTier.teams.C?.name || null,
        team_c_ranking: updatedTier.teams.C?.ranking || null,
        team_d_name: updatedTier.teams.D?.name || null,
        team_d_ranking: updatedTier.teams.D?.ranking || null,
        team_e_name: updatedTier.teams.E?.name || null,
        team_e_ranking: updatedTier.teams.E?.ranking || null,
        team_f_name: updatedTier.teams.F?.name || null,
        team_f_ranking: updatedTier.teams.F?.ranking || null,
        updated_at: new Date().toISOString(),
      };

      // Update the current week's tier
      const { error: currentWeekError } = await supabase
        .from("weekly_schedules")
        .update(updatePayload)
        .eq("id", editingWeeklyTier.id);

      if (currentWeekError) throw currentWeekError;

      // Only apply changes to future weeks if "set as default" was checked for specific fields
      if (
        setAsDefaultInfo &&
        (setAsDefaultInfo.location || setAsDefaultInfo.time || setAsDefaultInfo.court)
      ) {
        const futureWeeksPayload: Record<string, string> = {
          updated_at: new Date().toISOString(),
        };

        // Only update fields that were marked as "set as default"
        if (setAsDefaultInfo.location) futureWeeksPayload.location = updatedTier.location;
        if (setAsDefaultInfo.time) futureWeeksPayload.time_slot = updatedTier.time;
        if (setAsDefaultInfo.court) futureWeeksPayload.court = updatedTier.court;

        const { error: futureWeeksError } = await supabase
          .from("weekly_schedules")
          .update(futureWeeksPayload)
          .eq("league_id", parseInt(leagueId))
          .eq("tier_number", editingWeeklyTier.tier_number)
          .gt("week_number", currentWeek);

        if (futureWeeksError) throw futureWeeksError;
      }

      // Apply format changes to future weeks only if format actually changed
      if (updatedTier.format !== editingWeeklyTier.format) {
        const { error: formatUpdateError } = await supabase
          .from("weekly_schedules")
          .update({
            format: updatedTier.format,
            updated_at: new Date().toISOString(),
          })
          .eq("league_id", parseInt(leagueId))
          .eq("tier_number", editingWeeklyTier.tier_number)
          .gt("week_number", currentWeek);

        if (formatUpdateError) throw formatUpdateError;
      }

      await loadWeeklySchedule(currentWeek);
      handleModalClose();
    } catch (error) {
      console.error("Error saving tier:", error);
      alert("Failed to save tier changes. Please try again.");
    }
  };

  // Team rendering function with admin controls
  const renderTeamSlot = (tier: WeeklyScheduleTier, position: string, tierIndex: number) => {
    const team = getTeamForPosition(tier, position as TeamPositionId);
    const maxTeamsForFormat = getTeamCountForFormat(tier.format);
    const positionIndex = ["A", "B", "C", "D", "E", "F"].indexOf(position);

    // Don't render slots beyond what the format supports
    if (positionIndex >= maxTeamsForFormat) {
      return null;
    }

    const isDragTarget = dragState.hoverTier === tierIndex && dragState.hoverPosition === position;
    const isBeingDragged =
      dragState.fromTier === tierIndex &&
      dragState.fromPosition === position &&
      dragState.isDragging;
    const isDragInProgress = dragState.isDragging && dragState.draggedTeam;
    const isValidDropTarget = isDragInProgress && !team?.name && !isBeingDragged;
    const isInvalidDropTarget = isDragInProgress && team?.name && !isBeingDragged;

    return (
      <div
        key={position}
        className={`text-center relative transition-all duration-200 ${
          isEditScheduleMode && !team?.name
            ? "group hover:bg-gray-50 rounded p-1 cursor-pointer"
            : ""
        } ${
          isDragTarget && isValidDropTarget
            ? "bg-green-100 border-2 border-green-400 border-dashed rounded"
            : ""
        } ${
          isDragTarget && isInvalidDropTarget
            ? "bg-red-100 border-2 border-red-400 border-dashed rounded"
            : ""
        } ${isBeingDragged ? "opacity-30 scale-95" : ""} ${
          isDragInProgress && isValidDropTarget && !isDragTarget
            ? "bg-green-50 border border-green-200 border-dashed rounded"
            : ""
        } ${
          isDragInProgress && isInvalidDropTarget && !isDragTarget
            ? "bg-red-50 border border-red-200 rounded opacity-60"
            : ""
        }`}
        onClick={() => {
          if (isEditScheduleMode && !team?.name) {
            handleAddTeam(tierIndex, position);
          }
        }}
        onDragOver={
          isEditScheduleMode
            ? (e) => {
                e.preventDefault();
                setDragState((prev) => ({
                  ...prev,
                  hoverTier: tierIndex,
                  hoverPosition: position,
                }));
              }
            : undefined
        }
        onDrop={
          isEditScheduleMode
            ? async (e) => {
                e.preventDefault();

                if (
                  !dragState.isDragging ||
                  !dragState.draggedTeam ||
                  dragState.fromTier === null ||
                  !dragState.fromPosition
                ) {
                  return;
                }

                // Don't drop on same position
                if (dragState.fromTier === tierIndex && dragState.fromPosition === position) {
                  setDragState((prev) => ({ ...prev, isDragging: false, draggedTeam: null }));
                  return;
                }

                // Don't drop on occupied position
                if (team?.name) {
                  alert("Cannot move team to an occupied position");
                  setDragState((prev) => ({ ...prev, isDragging: false, draggedTeam: null }));
                  return;
                }

                try {
                  // Get source and target tiers
                  const sourceTier = weeklyTiers[dragState.fromTier];
                  const targetTier = weeklyTiers[tierIndex];

                  if (!sourceTier || !targetTier) return;

                  // Update source tier (remove team)
                  const sourceUpdatePayload = {
                    [`team_${dragState.fromPosition.toLowerCase()}_name`]: null,
                    [`team_${dragState.fromPosition.toLowerCase()}_ranking`]: null,
                  };

                  const { error: sourceError } = await supabase
                    .from("weekly_schedules")
                    .update(sourceUpdatePayload)
                    .eq("id", sourceTier.id);

                  if (sourceError) throw sourceError;

                  // Update target tier (add team)
                  const targetUpdatePayload = {
                    [`team_${position.toLowerCase()}_name`]: dragState.draggedTeam,
                    [`team_${position.toLowerCase()}_ranking`]:
                      getTeamForPosition(sourceTier, dragState.fromPosition as TeamPositionId)
                        ?.ranking || 0,
                  };

                  const { error: targetError } = await supabase
                    .from("weekly_schedules")
                    .update(targetUpdatePayload)
                    .eq("id", targetTier.id);

                  if (targetError) throw targetError;

                  // Reload the schedule
                  await loadWeeklySchedule(currentWeek);
                } catch (error) {
                  console.error("Error moving team:", error);
                  alert("Failed to move team. Please try again.");
                }

                // Clear drag state
                setDragState({
                  isDragging: false,
                  draggedTeam: null,
                  fromTier: null,
                  fromPosition: null,
                  hoverTier: null,
                  hoverPosition: null,
                  mouseX: 0,
                  mouseY: 0,
                });
              }
            : undefined
        }
      >
        <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
        <div className="text-sm text-[#6F6F6F] relative">
          {team?.name ? (
            <div className="relative group">
              <span
                draggable={isEditScheduleMode}
                onDragStart={() => {
                  if (!isEditScheduleMode) return;
                  setDragState({
                    isDragging: true,
                    draggedTeam: team.name,
                    fromTier: tierIndex,
                    fromPosition: position,
                    hoverTier: null,
                    hoverPosition: null,
                    mouseX: 0,
                    mouseY: 0,
                  });
                }}
                onDragEnd={() => {
                  stopAutoScroll(); // Stop any active scrolling
                  setDragState((prev) => ({
                    ...prev,
                    isDragging: false,
                    draggedTeam: null,
                    fromTier: null,
                    fromPosition: null,
                    hoverTier: null,
                    hoverPosition: null,
                  }));
                }}
                className={isEditScheduleMode ? "cursor-move" : "cursor-default"}
              >
                {`${team.name} (${teamPositions.get(team.name) || team.ranking || "-"})`}
              </span>
              {isEditScheduleMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(tierIndex, position, team.name);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Remove team"
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            <span
              className={`italic ${
                isDragInProgress && isValidDropTarget
                  ? "text-green-600 font-medium"
                  : isDragInProgress && isInvalidDropTarget
                    ? "text-red-600"
                    : "text-gray-400"
              }`}
            >
              {isDragInProgress && isValidDropTarget
                ? "Drop here"
                : isDragInProgress && isInvalidDropTarget
                  ? "Unavailable"
                  : isEditScheduleMode
                    ? "Click to add team"
                    : "TBD"}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Scroll zone indicators during drag */}
      {dragState.isDragging && (
        <>
          {/* Top scroll zone */}
          <div className="fixed top-0 left-0 right-0 h-[100px] bg-blue-200 bg-opacity-30 border-b-2 border-blue-400 border-dashed z-50 pointer-events-none flex items-center justify-center">
            <div className="text-blue-700 font-semibold text-sm bg-white bg-opacity-75 px-3 py-1 rounded">
              ↑ Scroll Up Zone
            </div>
          </div>

          {/* Bottom scroll zone */}
          <div className="fixed bottom-0 left-0 right-0 h-[100px] bg-blue-200 bg-opacity-30 border-t-2 border-blue-400 border-dashed z-50 pointer-events-none flex items-center justify-center">
            <div className="text-blue-700 font-semibold text-sm bg-white bg-opacity-75 px-3 py-1 rounded">
              ↓ Scroll Down Zone
            </div>
          </div>
        </>
      )}

      {/* Admin Controls */}
      {userProfile?.is_admin && (
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          {/* Left controls */}
          <div className="flex flex-wrap gap-3 items-center">
            {!isEditScheduleMode ? (
              <button
                onClick={handleEnterEditMode}
                className="flex items-center gap-2 px-4 py-2 bg-[#B20000] text-white rounded-md hover:bg-[#8A0000] transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit Schedule
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleExitEditMode}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            <button
              onClick={() => setAddPlayoffModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {leagueInfo?.playoff_weeks && leagueInfo.playoff_weeks > 0
                ? `Edit Playoff Weeks (${leagueInfo.playoff_weeks})`
                : "Add Playoff Weeks"}
            </button>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noGamesWeek}
                onChange={(e) => handleNoGamesChange(e.target.checked)}
                disabled={(() => {
                  const weekCompleted = weeklyTiers.length > 0 && weeklyTiers.every(t => submittedTierNumbers.has(t.tier_number) || !!t.is_completed);
                  const isPastWeek = todayWeekNumber !== null && currentWeek < todayWeekNumber;
                  return savingNoGames || weekCompleted || isPastWeek;
                })()}
                className="rounded"
              />
              <span className="text-sm text-gray-700">No Games This Week</span>
              {savingNoGames && <span className="text-xs text-gray-500">(Saving...)</span>}
            </label>

          </div>

          {/* Right-side: Public visibility toggle */}
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-700">Visible to public</span>
            <button
              type="button"
              role="switch"
              aria-checked={(leagueInfo?.schedule_visible ?? true) ? 'true' : 'false'}
              aria-label="Toggle public schedule visibility"
              onClick={() => handleScheduleVisibilityToggle(!(leagueInfo?.schedule_visible ?? true))}
              disabled={savingScheduleVisibility}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                (leagueInfo?.schedule_visible ?? true) ? 'bg-[#B20000]' : 'bg-gray-300'
              } ${savingScheduleVisibility ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-flex h-5 w-5 transform rounded-full bg-white transition-transform items-center justify-center text-[10px] font-bold ${
                  (leagueInfo?.schedule_visible ?? true)
                    ? 'translate-x-5 text-[#B20000]'
                    : 'translate-x-1 text-gray-700'
                }`}
              >
                {(leagueInfo?.schedule_visible ?? true) ? 'Y' : 'N'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Week Navigation - Matching public schedule exactly */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            {/* Navigation buttons grouped together */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentWeek((prev) => Math.max(1, prev - 1))}
                disabled={currentWeek <= 1}
                className="px-2 py-1 text-[#6F6F6F] hover:text-[#B20000] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentWeek((prev) => prev + 1)}
                disabled={!canNavigateToWeek(currentWeek + 1)}
                className="px-2 py-1 text-[#6F6F6F] hover:text-[#B20000] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Next week"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Week and date */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[#6F6F6F]">
                    Week {currentWeek} - {getWeekDate(currentWeek)}
                  </p>
                  {isPlayoffWeek(currentWeek) && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-50 text-[#B20000] rounded-full border border-red-200">
                      Playoffs
                    </span>
                  )}
                  {currentWeek <= 2 && !isPlayoffWeek(currentWeek) && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">
                      Seeding week
                    </span>
                  )}
                </div>
              </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Previous week results message */}
            {currentWeek > 1 && week1TierStructure.length > 0 && !noGamesWeek && (
              <div className="text-xs text-gray-500 italic">
                Schedule updated each week based on previous week&apos;s results
              </div>
            )}

            {/* No games message */}
            {weeklyTiers.length > 0 && noGamesWeek && (
              <div className="px-2 py-1 rounded-full text-xs font-semibold bg-[#B20000] text-white">
                No games this week
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Display - EXACT same styling as public schedule */}
      <div className="space-y-6">
        {loadingWeekData ? (
          <div className="flex justify-center items-center py-12">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"
              role="status"
              aria-label="Loading"
            ></div>
          </div>
        ) : weeklyTiers.length > 0 ? (
          noGamesWeek ? (
            // No Games Week Display
            weeklyTiers.map((tier) => (
              <Card
                key={tier.id}
                className="shadow-md overflow-hidden rounded-lg opacity-60 bg-gray-50"
              >
                <CardContent className="p-0 overflow-hidden">
                  <div className="bg-gray-100 border-b px-8 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-400 text-xl leading-none m-0">
                          Tier {tier.tier_number}
                        </h3>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                          <span className="text-sm text-[#6F6F6F]">{tier.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                          <span className="text-sm text-[#6F6F6F]">{tier.time_slot}</span>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className="h-4 w-4 text-gray-400 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                            <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1" />
                            <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1" />
                          </svg>
                          <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div
                      className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || "3-teams-6-sets"))} gap-4`}
                    >
                      {getPositionsForFormat(tier.format || "3-teams-6-sets").map((position) => (
                        <div key={position} className="text-center">
                          <div className="font-medium text-gray-400 mb-1">{position}</div>
                          <div className="text-sm text-gray-400 italic">No Games</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Normal Schedule Display
            <>
              {/* Add tier at beginning (before Tier 1) */}
              {userProfile?.is_admin && isEditScheduleMode && weeklyTiers.length > 0 && (
                <div className="text-center pb-2">
                  <button
                    onClick={() => handleAddTier(0)}
                    className="text-sm text-green-600 hover:text-green-700 hover:underline"
                  >
                    + Add Tier
                  </button>
                </div>
              )}

              {weeklyTiers.map((tier, tierIndex) => (
                <Card key={tier.id} className={`shadow-md overflow-hidden rounded-lg ${tier.no_games ? 'bg-gray-100' : ''}`}>
                  <CardContent className="p-0 overflow-hidden">
                    {/* Tier Header - EXACT same as public */}
                    <div className={`${(tier.tier_number ?? 0) % 2 === 1 ? 'bg-red-50' : 'bg-[#F8F8F8]'} border-b px-8 py-3`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                      <h3 className={`font-bold text-[#6F6F6F] text-xl leading-none m-0 ${tier.no_games ? 'opacity-50' : ''}`}>
                        Tier {tier.tier_number}
                        {(tier.is_completed || submittedTierNumbers.has(tier.tier_number)) && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Completed
                          </span>
                        )}
                      </h3>
                          
                          {/* Submit Scores link (when not in edit mode) */}
                          {!isEditScheduleMode && !tier.no_games &&
                            (tier.format === '3-teams-6-sets' || tier.format === '2-teams-4-sets') &&
                            getPositionsForFormat(tier.format || '3-teams-6-sets').every(pos => getTeamForPosition(tier, pos)?.name) && (
                            <button
                              onClick={() => openSubmitScores(tier)}
                              className="ml-3 text-sm text-[#B20000] hover:text-[#8B0000] hover:underline font-medium transition-colors"
                            >
                              {submittedTierNumbers.has(tier.tier_number)
                                ? ((todayWeekNumber === null || currentWeek >= (todayWeekNumber - 1)) ? 'Edit scores' : 'View scores')
                                : 'Submit scores'}
                            </button>
                          )}
                          {isAdmin && (submittedTierNumbers.has(tier.tier_number) || tier.is_completed) && (
                              <button
                                onClick={() => handleResetTierScores(tier)}
                                className="ml-3 text-sm text-gray-500 hover:text-gray-700 hover:underline font-medium transition-colors"
                                title="Delete submitted results and mark this tier incomplete"
                              >
                                Reset scores
                              </button>
                            )}
                          {/* Removed duplicate status text; Completed badge covers this state */}

                          {tier.no_games && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-[#B20000] text-white rounded-full">
                              No games
                            </span>
                          )}

                          {/* Tier-specific No Games toggle (admin edit mode) */}
                          {isEditScheduleMode && (
                            <label className="ml-3 flex items-center gap-2 text-sm text-gray-700" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={!!tier.no_games}
                                onClick={(e) => e.stopPropagation()}
                                onChange={async (e) => {
                                  const nextValue = e.target.checked;
                                  // Optimistic UI update
                                  let previousValue = !!tier.no_games;
                                  setWeeklyTiers(prev => {
                                    const next = prev.map(t => t.id === tier.id ? { ...t, no_games: nextValue } : t);
                                    const allNoGamesLocal = next.length > 0 && next.every(t => !!t.no_games);
                                    setNoGamesWeek(allNoGamesLocal);
                                    return next;
                                  });
                                      try {
                                        const { error } = await supabase
                                          .from('weekly_schedules')
                                          .update({ no_games: nextValue })
                                          .eq('id', tier.id);
                                        if (error) throw error;
                                        // No automatic movement when toggling tier no-games; admins will manage placements manually
                                      } catch (err) {
                                      console.error('Failed to update tier no_games', err);
                                      alert('Failed to update tier No games setting. Reverting.');
                                      // Revert UI
                                      setWeeklyTiers(prev => {
                                      const next = prev.map(t => t.id === tier.id ? { ...t, no_games: previousValue } : t);
                                      const allNoGamesLocal = next.length > 0 && next.every(t => !!t.no_games);
                                      setNoGamesWeek(allNoGamesLocal);
                                      return next;
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              No games
                            </label>
                          )}
                          
                          {/* Admin Actions (only in edit mode) */}
                          {userProfile?.is_admin && isEditScheduleMode && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTier(tier, tierIndex)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit tier"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleRemoveTier(tier.tier_number)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove tier"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Location/Time/Court - EXACT same as public */}
                        <div className={`flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right ${tier.no_games ? 'opacity-50' : ''}`}>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                            <span className="text-sm text-[#6F6F6F]">{tier.location}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                            <span className="text-sm text-[#6F6F6F]">{tier.time_slot}</span>
                          </div>
                          <div className="flex items-center">
                            <svg
                              className="h-4 w-4 text-[#B20000] mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                              <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1" />
                              <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1" />
                            </svg>
                            <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teams Display - EXACT same as public but with admin controls */}
                    <div className="p-4">
                      <div
                        className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || "3-teams-6-sets"))} gap-4`}
                      >
                        {getPositionsForFormat(tier.format || "3-teams-6-sets")
                          .map((position) => renderTeamSlot(tier, position, tierIndex))
                          .filter(Boolean)}
                      </div>
                    </div>
                  </CardContent>

                  {/* Add Tier Button (Admin only, Edit mode only) */}
                  {userProfile?.is_admin && isEditScheduleMode && (
                    <div className="border-t bg-gray-50 p-2 text-center">
                      <button
                        onClick={() => handleAddTier(tier.tier_number)}
                        className="text-sm text-green-600 hover:text-green-700 hover:underline"
                      >
                        + Add Tier After {tier.tier_number}
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </>
          )
        ) : currentWeek === 1 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Schedule Available</h3>
            <p className="text-[#6F6F6F]">The league schedule hasn&apos;t been generated yet.</p>
          </div>
        ) : week1TierStructure.length > 0 ? (
          // Template tiers for future weeks
          week1TierStructure.map((tier) => (
            <Card key={tier.id} className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                <div className="bg-[#F8F8F8] border-b px-8 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-[#6F6F6F] text-xl leading-none m-0">
                        Tier {tier.tier_number}
                      </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className="text-sm text-[#6F6F6F]">{tier.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className="text-sm text-[#6F6F6F]">{tier.time_slot}</span>
                      </div>
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 text-[#B20000] mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1" />
                        </svg>
                        <span className="text-sm text-[#6F6F6F]">{tier.court}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div
                    className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || "3-teams-6-sets"))} gap-4`}
                  >
                    {getPositionsForFormat(tier.format || "3-teams-6-sets").map((position) => (
                      <div key={position} className="text-center">
                        <div className="font-medium text-[#6F6F6F] mb-1">{position}</div>
                        <div className="text-sm text-[#6F6F6F]">
                          {(tier as any)[`team_${position.toLowerCase()}_name`] ? (
                            <span>{(tier as any)[`team_${position.toLowerCase()}_name`]}</span>
                          ) : (
                            <span className="text-gray-400 italic">TBD</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Schedule Available</h3>
            <p className="text-[#6F6F6F]">Week {currentWeek} hasn&apos;t been scheduled yet.</p>
          </div>
        )}
      </div>

      {/* Drag Preview */}
      {dragState.isDragging && dragState.draggedTeam && (
        <div
          className="fixed pointer-events-none z-50 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium"
          style={{
            left: dragState.mouseX + 15,
            top: dragState.mouseY - 10,
          }}
        >
          Moving: {dragState.draggedTeam}
        </div>
      )}

      {/* Modals */}
      {selectedTier && (
        <TierEditModal
          isOpen={editModalOpen}
          onClose={handleModalClose}
          tier={selectedTier}
          tierIndex={editingTierIndex}
          allTiers={weeklyTiers.map((wt) => ({
            tierNumber: wt.tier_number,
            location: wt.location,
            time: wt.time_slot,
            court: wt.court,
            format: wt.format,
            teams: {
              A: wt.team_a_name ? { name: wt.team_a_name, ranking: wt.team_a_ranking || 0 } : null,
              B: wt.team_b_name ? { name: wt.team_b_name, ranking: wt.team_b_ranking || 0 } : null,
              C: wt.team_c_name ? { name: wt.team_c_name, ranking: wt.team_c_ranking || 0 } : null,
              D: wt.team_d_name ? { name: wt.team_d_name, ranking: wt.team_d_ranking || 0 } : null,
              E: wt.team_e_name ? { name: wt.team_e_name, ranking: wt.team_e_ranking || 0 } : null,
              F: wt.team_f_name ? { name: wt.team_f_name, ranking: wt.team_f_ranking || 0 } : null,
            },
            courts: { [wt.tier_number.toString()]: wt.court },
          }))}
          leagueId={leagueId}
          leagueName={leagueName}
          onSave={handleSaveTier}
      />
      )}

      <SubmitScoresModal
        isOpen={submitScoresOpen}
        onClose={closeSubmitScores}
        weeklyTier={submitScoresTier}
        onSuccess={async () => {
          try { await loadWeeklySchedule(currentWeek); } catch {}
        }}
      />

      <AddPlayoffWeeksModal
        isOpen={addPlayoffModalOpen}
        onClose={() => setAddPlayoffModalOpen(false)}
        leagueId={leagueId}
        currentPlayoffWeeks={leagueInfo?.playoff_weeks || 0}
        onPlayoffWeeksAdded={handlePlayoffWeeksAdded}
      />

      <AddTeamModal
        isOpen={addTeamModalOpen}
        onClose={() => {
          setAddTeamModalOpen(false);
          setAddTeamModalData(null);
        }}
        leagueId={leagueId}
        currentWeek={currentWeek}
        onAddTeam={handleAddTeamToSchedule}
        tierIndex={addTeamModalData?.tierIndex ?? 0}
        position={addTeamModalData?.position ?? ""}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && teamToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete Team</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove {teamToDelete.teamName} from this tier?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setTeamToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTeam}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
