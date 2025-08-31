import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { MapPin, Clock, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { TierEditModal } from './TierEditModal';
import { AddPlayoffWeeksModal } from './AddPlayoffWeeksModal';
import { SubmitScoresModal } from '../../LeagueDetailPage/components/SubmitScoresModal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Schedule, Tier } from '../../LeagueDetailPage/utils/leagueUtils';
import { useLeagueStandings } from '../../LeagueDetailPage/hooks/useLeagueStandings';

const getTeamCountForFormat = (format: string): number => {
  const formatMap: Record<string, number> = {
    '3-teams-6-sets': 3,
    '2-teams-4-sets': 2,
    '2-teams-best-of-5': 2,
    '2-teams-best-of-3': 2,
    '4-teams-head-to-head': 4,
    '6-teams-head-to-head': 6,
    '2-teams-elite': 2,
  };
  return formatMap[format] || 3; // Default to 3 teams if format not found
};

interface WeeklyScheduleTier {
  id: number;
  tier_number: number;
  location: string;
  time_slot: string;
  court: string;
  format: string;
  team_a_name: string | null;
  team_a_ranking: number | null;
  team_b_name: string | null;
  team_b_ranking: number | null;
  team_c_name: string | null;
  team_c_ranking: number | null;
  is_completed: boolean;
  no_games?: boolean;
  is_playoff?: boolean;
}

interface AdminLeagueScheduleProps {
  openScoreSubmissionModal: (tierNumber: number) => void;
  leagueId: string;
  leagueName: string;
}

export function AdminLeagueSchedule({ openScoreSubmissionModal, leagueId, leagueName }: AdminLeagueScheduleProps) {
  const { userProfile } = useAuth();
  const { teams: standingsTeams } = useLeagueStandings(leagueId);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(-1);
  const [editingWeeklyTier, setEditingWeeklyTier] = useState<WeeklyScheduleTier | null>(null);
  const [, setDefaults] = useState<{location?: string, time?: string, court?: string}>({});
  
  // Submit Scores modal state
  const [selectedTierForScores, setSelectedTierForScores] = useState<WeeklyScheduleTier | null>(null);
  const [isScoresModalOpen, setIsScoresModalOpen] = useState(false);
  
  // Team reordering state
  const [isEditScheduleMode, setIsEditScheduleMode] = useState(false);
  const [showAddPlayoffModal, setShowAddPlayoffModal] = useState(false);
  
  // Legacy drag state variables (keep for compatibility)
  const [draggedTeam, setDraggedTeam] = useState<{
    name: string;
    ranking: number;
    fromTier: number;
    fromPosition: string;
  } | null>(null);
  const [cascadePreview, setCascadePreview] = useState<any[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<{ tierIndex: number; position: string } | null>(null);

  // Simple drag and drop state
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
    mouseY: 0
  });
  
  
  // Add team modal state
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Array<{
    id: number;
    name: string;
    onSchedule: boolean;
  }>>([]);
  
  // Delete team confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{
    tierIndex: number;
    position: string;
    teamName: string;
  } | null>(null);
  
  // Position for adding team
  
  // Week management state
  const [currentWeek, setCurrentWeek] = useState(1);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [leagueStartDate, setLeagueStartDate] = useState<string | null>(null);
  const [leagueEndDate, setLeagueEndDate] = useState<string | null>(null);
  const [maxWeeks, setMaxWeeks] = useState(10); // Default to 10 weeks
  const [currentPlayoffWeeks, setCurrentPlayoffWeeks] = useState(0);
  
  // Weekly schedule data state
  const [weeklyTiers, setWeeklyTiers] = useState<WeeklyScheduleTier[]>([]);
  const [loadingWeekData, setLoadingWeekData] = useState(false);
  const [week1TierStructure, setWeek1TierStructure] = useState<WeeklyScheduleTier[]>([]);
  const [noGamesWeek, setNoGamesWeek] = useState(false);
  const [savingNoGames, setSavingNoGames] = useState(false);
  const [addTeamPosition, setAddTeamPosition] = useState<{
    tierIndex: number;
    position: string;
  } | null>(null);

  // Remove tier confirmation state
  const [removeTierConfirmOpen, setRemoveTierConfirmOpen] = useState(false);
  const [tierToRemove, setTierToRemove] = useState<{
    tierIndex: number;
    tierNumber: number;
  } | null>(null);
  
  // Drag scrolling state  
  const [isDragging, setIsDragging] = useState(false);
  const scrollAnimationRef = useRef<number | null>(null);
  const dragOverThrottleRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDefaults();
    loadLeagueDates();
    loadWeeklySchedule(currentWeek);
    loadWeek1Structure();
  }, [leagueId]);
  
  // Load weekly schedule data when week changes
  useEffect(() => {
    loadWeeklySchedule(currentWeek);
  }, [currentWeek]);

  // Stub functions for compatibility
  const calculateCascadePreview = (tierIndex: number, position: string) => {
    return [];
  };

  const enterEditScheduleMode = () => {
    setIsEditScheduleMode(true);
  };

  const exitEditScheduleMode = () => {
    setIsEditScheduleMode(false);
    setDraggedTeam(null);
    setDragOverTarget(null);
    setCascadePreview([]);
  };

  const saveScheduleChanges = () => {
    setIsEditScheduleMode(false);
    setDraggedTeam(null);
    setDragOverTarget(null);
    setCascadePreview([]);
  };

  // Helper functions for managing tier-specific defaults
  const updateTierDefaults = async (defaultsUpdate: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('league_schedules')
        .upsert({
          league_id: parseInt(leagueId),
          defaults: defaultsUpdate,
          format: '3-teams-6-sets',
          schedule_data: {}
        });
      
      if (error) {
        console.error('Error updating tier defaults:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating tier defaults:', error);
      throw error;
    }
  };

  const shiftTierDefaultsUp = async (fromTier: number) => {
    // When inserting a tier, shift existing defaults up by 1
    // e.g., if inserting at position 2, tier 2 becomes tier 3, tier 3 becomes tier 4, etc.
    try {
      const { data: leagueData } = await supabase
        .from('league_schedules')
        .select('defaults')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();
      
      const currentDefaults = leagueData?.defaults || {};
      const newDefaults: Record<string, any> = {};
      
      // Copy defaults for tiers before the insertion point (unchanged)
      for (let i = 1; i < fromTier; i++) {
        if (currentDefaults[i.toString()]) {
          newDefaults[i.toString()] = currentDefaults[i.toString()];
        }
      }
      
      // Shift defaults for tiers at and after the insertion point
      Object.keys(currentDefaults).forEach(tierKey => {
        const tierNum = parseInt(tierKey);
        if (tierNum >= fromTier) {
          newDefaults[(tierNum + 1).toString()] = currentDefaults[tierKey];
        }
      });
      
      // The new tier at fromTier gets no defaults (will use pure placeholders)
      
      await updateTierDefaults(newDefaults);
    } catch (error) {
      console.error('Error shifting tier defaults up:', error);
      throw error;
    }
  };

  const shiftTierDefaultsDown = async (removedTier: number) => {
    // When removing a tier, shift existing defaults down by 1
    // e.g., if removing tier 3, tier 4 becomes tier 3, tier 5 becomes tier 4, etc.
    try {
      const { data: leagueData } = await supabase
        .from('league_schedules')
        .select('defaults')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();
      
      const currentDefaults = leagueData?.defaults || {};
      const newDefaults: Record<string, any> = {};
      
      // Copy defaults for tiers before the removed tier (unchanged)
      for (let i = 1; i < removedTier; i++) {
        if (currentDefaults[i.toString()]) {
          newDefaults[i.toString()] = currentDefaults[i.toString()];
        }
      }
      
      // Remove the defaults for the deleted tier
      // Shift defaults for tiers after the removed tier
      Object.keys(currentDefaults).forEach(tierKey => {
        const tierNum = parseInt(tierKey);
        if (tierNum > removedTier) {
          newDefaults[(tierNum - 1).toString()] = currentDefaults[tierKey];
        }
      });
      
      await updateTierDefaults(newDefaults);
    } catch (error) {
      console.error('Error shifting tier defaults down:', error);
      throw error;
    }
  };

  // Additional stub functions
  const removeTeamFromSchedule = async (teamName: string) => {
    console.log('removeTeamFromSchedule called with:', teamName);
  };

  const handleTeamSelection = (teamName: string) => {
    console.log('handleTeamSelection called with:', teamName);
  };

  const confirmDeleteTeam = () => {
    console.log('confirmDeleteTeam called');
  };

  const confirmRemoveTier = () => {
    console.log('confirmRemoveTier called');
  };

  // Edge scrolling optimization - only working method during HTML5 drag
  useEffect(() => {
    // HTML5 drag blocks keyboard/wheel events, so we focus on edge scrolling
    // which works reliably via mouse position tracking
    return () => {
      // Cleanup any remaining animations on unmount
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    };
  }, []);

  // Create invisible scroll zones during drag for proper edge scrolling
  useEffect(() => {
    let scrollZones: HTMLDivElement[] = [];

    const createScrollZones = () => {
      // Remove existing zones
      scrollZones.forEach(zone => {
        if (zone.parentNode) zone.parentNode.removeChild(zone);
      });
      scrollZones = [];

      // Create top scroll zone (15% of viewport height)
      const zoneHeight = Math.floor(window.innerHeight * 0.15);
      const topZone = document.createElement('div');
      topZone.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: ${zoneHeight}px;
        z-index: 1000;
        pointer-events: auto;
        background: rgba(59, 130, 246, 0.1);
      `;
      
      topZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        const viewportY = e.clientY;
        console.log('Top zone dragover during drag:', viewportY);
        startEdgeScrolling(viewportY);
      });

      topZone.addEventListener('dragleave', () => {
        console.log('Left top zone - stopping scroll');
        stopEdgeScrolling();
      });

      // Create bottom scroll zone (same height as top)
      const bottomZone = document.createElement('div');
      bottomZone.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${zoneHeight}px;
        z-index: 1000;
        pointer-events: auto;
        background: rgba(59, 130, 246, 0.1);
      `;
      
      bottomZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        const viewportY = e.clientY;
        console.log('Bottom zone dragover during drag:', viewportY);
        startEdgeScrolling(viewportY);
      });

      bottomZone.addEventListener('dragleave', () => {
        console.log('Left bottom zone - stopping scroll');
        stopEdgeScrolling();
      });

      // Add zones to document
      document.body.appendChild(topZone);
      document.body.appendChild(bottomZone);
      scrollZones.push(topZone, bottomZone);
    };

    const removeScrollZones = () => {
      scrollZones.forEach(zone => {
        if (zone.parentNode) zone.parentNode.removeChild(zone);
      });
      scrollZones = [];
    };

    if (dragState.draggedTeam && isEditScheduleMode) {
      createScrollZones();
    } else {
      removeScrollZones();
    }

    return () => {
      removeScrollZones();
    };
  }, [dragState.draggedTeam, isEditScheduleMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEdgeScrolling();
      if (dragOverThrottleRef.current) {
        clearTimeout(dragOverThrottleRef.current);
      }
    };
  }, []);

  const loadDefaults = async () => {
    try {
      const { data, error } = await supabase
        .from('league_schedules')
        .select('defaults')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading defaults:', error);
      } else if (data?.defaults) {
        setDefaults(data.defaults);
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
    }
  };

  const loadLeagueDates = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('start_date, end_date, day_of_week, playoff_weeks')
        .eq('id', parseInt(leagueId))
        .single();

      if (error) {
        console.error('Error loading league dates:', error);
        return;
      }

      if (data) {
        setLeagueStartDate(data.start_date);
        setLeagueEndDate(data.end_date);
        
        // Calculate max weeks based on league start/end dates only
        if (data.start_date && data.end_date) {
          // Parse dates as local dates to avoid timezone shifts
          const startDate = new Date(data.start_date + 'T00:00:00');
          const endDate = new Date(data.end_date + 'T00:00:00');
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
          const playoffWeeks = data.playoff_weeks || 0; // Start with 0 playoff weeks
          const totalWeeks = regularSeasonWeeks + playoffWeeks;
          
          console.log(`Admin: Setting maxWeeks to ${totalWeeks} (${regularSeasonWeeks} regular + ${playoffWeeks} playoff)`);
          setMaxWeeks(totalWeeks);
          setCurrentPlayoffWeeks(playoffWeeks);
        }

        // Use league's start_date directly as the week start date
        if (data.start_date) {
          setStartDate(data.start_date);
        }
      }
    } catch (error) {
      console.error('Error loading league dates:', error);
    }
  };

  const getWeekDate = (weekNumber: number): string => {
    if (!startDate) return 'League start date not set';
    
    // Always calculate from start date for consistency
    // This ensures both admin and public views show the same dates
    const baseDate = new Date(startDate + 'T00:00:00');
    const weekOffset = weekNumber - 1;
    
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    
    return baseDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const canNavigateToWeek = (weekNumber: number): boolean => {
    return weekNumber >= 1 && weekNumber <= maxWeeks;
  };

  const isPlayoffWeek = (weekNumber: number): boolean => {
    if (!leagueStartDate || !leagueEndDate) return false;
    
    const start = new Date(leagueStartDate + 'T00:00:00');
    const end = new Date(leagueEndDate + 'T00:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const regularSeasonWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    return weekNumber > regularSeasonWeeks;
  };

  const handlePlayoffWeeksAdded = (weeksAdded: number) => {
    // Reload league dates to get updated playoff weeks
    loadLeagueDates();
    // Optionally show success message
    console.log(`Added ${weeksAdded} playoff weeks to the schedule`);
  };

  const handleNoGamesChange = async (noGames: boolean) => {
    try {
      setSavingNoGames(true);
      console.log(`Setting no_games flag for week ${currentWeek} to:`, noGames);
      
      const { error } = await supabase.rpc('set_week_no_games', {
        p_league_id: parseInt(leagueId),
        p_week_number: currentWeek,
        p_no_games: noGames
      });

      if (error) {
        console.error('Error setting no_games flag:', error);
        return;
      }

      setNoGamesWeek(noGames);
      console.log('Successfully set no_games flag');
      
      // Reload the weekly schedule to reflect changes
      await loadWeeklySchedule(currentWeek);
      
    } catch (error) {
      console.error('Error setting no_games flag:', error);
    } finally {
      setSavingNoGames(false);
    }
  };

  const navigateToWeek = (weekNumber: number) => {
    if (canNavigateToWeek(weekNumber)) {
      setCurrentWeek(weekNumber);
    }
  };

  const loadWeeklySchedule = async (weekNumber: number) => {
    try {
      setLoadingWeekData(true);
      console.log('Loading weekly schedule for week:', weekNumber, 'league:', leagueId);
      
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', weekNumber)
        .order('tier_number', { ascending: true });

      if (error) {
        console.error('Error loading weekly schedule:', error);
        setWeeklyTiers([]);
        return;
      }

      console.log('Loaded weekly schedule data:', data);
      setWeeklyTiers(data || []);
      
      // Set no_games flag based on first tier (all tiers should have same flag)
      const firstTier = data && data.length > 0 ? data[0] : null;
      setNoGamesWeek(firstTier?.no_games || false);
      
    } catch (error) {
      console.error('Error loading weekly schedule:', error);
      setWeeklyTiers([]);
      setNoGamesWeek(false);
    } finally {
      setLoadingWeekData(false);
    }
  };

  const loadWeek1Structure = async () => {
    try {
      console.log('Loading Week 1 structure for future week templates, league:', leagueId);
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('tier_number, location, time_slot, court, format')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', 1)
        .order('tier_number', { ascending: true });

      if (error) {
        console.error('Error loading Week 1 structure:', error);
        return;
      }

      console.log('Loaded Week 1 structure:', data);
      if (data) {
        // Convert to template format without team assignments
        const templateTiers = data.map((tier, index) => ({
          id: -index - 1, // Negative IDs for templates
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
          is_completed: false
        }));
        setWeek1TierStructure(templateTiers);
      }
    } catch (error) {
      console.error('Error loading Week 1 structure:', error);
    }
  };

  const loadAvailableTeams = async () => {
    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', parseInt(leagueId))
        .eq('active', true)
        .order('name');

      if (error) throw error;

      // Get teams currently on schedule from weekly schedules
      const teamsOnSchedule = new Set<string>();
      weeklyTiers.forEach((tier) => {
        if (tier.team_a_name) teamsOnSchedule.add(tier.team_a_name);
        if (tier.team_b_name) teamsOnSchedule.add(tier.team_b_name);
        if (tier.team_c_name) teamsOnSchedule.add(tier.team_c_name);
      });

      // Mark teams as on schedule or available
      const availableTeamsList = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        onSchedule: teamsOnSchedule.has(team.name)
      }));

      setAvailableTeams(availableTeamsList);
    } catch (error) {
      console.error('Error loading available teams:', error);
    }
  };

  const handleEditClick = (tierIndex: number, tier: Tier) => {
    setSelectedTier(tier);
    setSelectedTierIndex(tierIndex);
    setEditModalOpen(true);
  };

  const handleEditWeeklyTier = (weeklyTier: WeeklyScheduleTier, tierIndex: number) => {
    // Convert WeeklyScheduleTier to Tier format for the modal
    const convertedTier: Tier = {
      tierNumber: weeklyTier.tier_number,
      location: weeklyTier.location,
      time: weeklyTier.time_slot,
      court: weeklyTier.court,
      format: weeklyTier.format,
      teams: {
        A: weeklyTier.team_a_name ? { name: weeklyTier.team_a_name, ranking: weeklyTier.team_a_ranking || 0 } : null,
        B: weeklyTier.team_b_name ? { name: weeklyTier.team_b_name, ranking: weeklyTier.team_b_ranking || 0 } : null,
        C: weeklyTier.team_c_name ? { name: weeklyTier.team_c_name, ranking: weeklyTier.team_c_ranking || 0 } : null,
      },
      courts: {
        A: weeklyTier.court,
        B: weeklyTier.court,
        C: weeklyTier.court,
      }
    };
    
    setSelectedTier(convertedTier);
    setSelectedTierIndex(tierIndex);
    setEditModalOpen(true);
    setEditingWeeklyTier(weeklyTier); // Store the original weekly tier for saving
  };

  const handleCreateAndEditWeeklyTier = async (templateTier: WeeklyScheduleTier, weekNumber: number) => {
    try {
      // First, create a weekly schedule entry for this week and tier if it doesn't exist
      const { data: existingEntry } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', weekNumber)
        .eq('tier_number', templateTier.tier_number)
        .single();

      let weeklyTier: WeeklyScheduleTier;

      if (existingEntry) {
        // Use existing entry
        weeklyTier = existingEntry;
      } else {
        // Create new entry based on template
        const { data: newEntry, error } = await supabase
          .from('weekly_schedules')
          .insert({
            league_id: parseInt(leagueId),
            week_number: weekNumber,
            tier_number: templateTier.tier_number,
            location: templateTier.location,
            time_slot: templateTier.time_slot,
            court: templateTier.court,
            format: templateTier.format,
            team_a_name: null,
            team_a_ranking: null,
            team_b_name: null,
            team_b_ranking: null,
            team_c_name: null,
            team_c_ranking: null,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating weekly schedule entry:', error);
          return;
        }

        weeklyTier = newEntry;
      }

      // Now edit the weekly tier (existing or newly created)
      handleEditWeeklyTier(weeklyTier, templateTier.tier_number - 1);
      
    } catch (error) {
      console.error('Error in handleCreateAndEditWeeklyTier:', error);
    }
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
    setSelectedTier(null);
    setSelectedTierIndex(-1);
    setEditingWeeklyTier(null);
  };

  const handleSaveWeeklyTier = async (updatedTiers: Tier[], setAsDefaultInfo?: {location: boolean, time: boolean, court: boolean}, updatedTier?: Tier) => {
    if (!editingWeeklyTier || updatedTiers.length === 0) return;
    
    const tierToSave = updatedTier || updatedTiers[0]; // The modal only edits one tier
    
    try {
      // Update the current weekly_schedules entry
      const { error } = await supabase
        .from('weekly_schedules')
        .update({
          location: tierToSave.location,
          time_slot: tierToSave.time,
          court: tierToSave.court,
          format: tierToSave.format,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingWeeklyTier.id);

      if (error) {
        console.error('Error updating weekly tier:', error);
        return;
      }

      // If any defaults were set, update both the tier-specific defaults AND all future weeks for this tier
      if (setAsDefaultInfo && (setAsDefaultInfo.location || setAsDefaultInfo.time || setAsDefaultInfo.court)) {
        // First, get current defaults from league_schedules
        const { data: currentDefaults } = await supabase
          .from('league_schedules')
          .select('defaults')
          .eq('league_id', parseInt(leagueId))
          .maybeSingle();
          
        const allDefaults = currentDefaults?.defaults || {};
        const tierNumber = editingWeeklyTier.tier_number.toString();
        
        // Get current tier-specific defaults or create empty object
        const tierDefaults = allDefaults[tierNumber] || {};
        
        // Update only the specified tier's defaults
        const newTierDefaults = { ...tierDefaults };
        if (setAsDefaultInfo.location) newTierDefaults.location = tierToSave.location;
        if (setAsDefaultInfo.time) newTierDefaults.time = tierToSave.time;
        if (setAsDefaultInfo.court) newTierDefaults.court = tierToSave.court;
        
        // Update the tier-specific defaults in the main defaults object
        const newAllDefaults = { ...allDefaults };
        newAllDefaults[tierNumber] = newTierDefaults;
        
        // Save updated defaults to league_schedules
        const { error: defaultsError } = await supabase
          .from('league_schedules')
          .update({
            defaults: newAllDefaults,
            updated_at: new Date().toISOString()
          })
          .eq('league_id', parseInt(leagueId));
          
        if (defaultsError) {
          console.error('Error updating tier-specific defaults:', defaultsError);
        } else {
          console.log(`Updated Tier ${tierNumber} defaults:`, newTierDefaults);
          console.log('All defaults now:', newAllDefaults);
        }
        
        // Second, update all future weeks (current week and beyond) for this tier
        const updateData: any = {};
        if (setAsDefaultInfo.location) updateData.location = tierToSave.location;
        if (setAsDefaultInfo.time) updateData.time_slot = tierToSave.time;
        if (setAsDefaultInfo.court) updateData.court = tierToSave.court;
        
        const { error: futureError } = await supabase
          .from('weekly_schedules')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('league_id', parseInt(leagueId))
          .eq('tier_number', editingWeeklyTier.tier_number)
          .gte('week_number', currentWeek); // Current week and all future weeks

        if (futureError) {
          console.error('Error updating future weeks:', futureError);
        } else {
          console.log(`Updated ${setAsDefaultInfo.location ? 'location' : ''}${setAsDefaultInfo.time ? ' time' : ''}${setAsDefaultInfo.court ? ' court' : ''} for all future weeks of Tier ${editingWeeklyTier.tier_number}`);
        }
      }

      // Reload the weekly schedule to reflect changes
      await loadWeeklySchedule(currentWeek);
      
    } catch (error) {
      console.error('Error saving weekly tier:', error);
    }
  };


  // Future functionality - add team modal
  // const handleOpenAddTeamModal = async () => {
  //   console.log('handleOpenAddTeamModal called');
  //   await loadAvailableTeams();
  //   setAddTeamModalOpen(true);
  // };

  const handleCloseAddTeamModal = () => {
    setAddTeamModalOpen(false);
    setAddTeamPosition(null);
  };


  // Remove tier functions
  const handleRemoveTier = (tierIndex: number, tierNumber: number) => {
    setTierToRemove({ tierIndex, tierNumber });
    setRemoveTierConfirmOpen(true);
  };


  const cancelRemoveTier = () => {
    setRemoveTierConfirmOpen(false);
    setTierToRemove(null);
  };

  // Future functionality - add team to schedule  
  // const addTeamToSchedule = async (teamName: string) => {
  //   console.log('addTeamToSchedule called with:', teamName);
  //   try {
  //     // Get original schedule format for the new tier
  //     const { data } = await supabase
  //       .from('league_schedules')
  //       .select('format')
  //       .eq('league_id', parseInt(leagueId))
  //       .maybeSingle();

  //     const originalFormat = data?.format || '3-teams-6-sets';
  //     
  //     // Create new tier for this team
  //     const newTierNumber = mockSchedule[0].tiers.length + 1;
  //     const newTier: Tier = {
  //       tierNumber: newTierNumber,
  //       location: mockSchedule[0].tiers[0]?.location || 'TBD',
  //       time: mockSchedule[0].tiers[0]?.time || 'TBD',
  //       court: mockSchedule[0].tiers[0]?.court || 'TBD',
  //       format: originalFormat,
  //       teams: {
  //         A: { name: teamName, ranking: getCurrentRanking(teamName) },
  //         B: null,
  //         C: null,
  //         D: null,
  //         E: null,
  //         F: null
  //       },
  //       courts: {
  //         A: `Court ${newTierNumber}`,
  //         B: `Court ${newTierNumber}`,
  //         C: `Court ${newTierNumber}`,
  //         D: `Court ${newTierNumber}`,
  //         E: `Court ${newTierNumber}`,
  //         F: `Court ${newTierNumber}`
  //       }
  //     };

  //     // Add the new tier to the schedule
  //     const updatedSchedule = [...mockSchedule];
  //     updatedSchedule[0].tiers = [...updatedSchedule[0].tiers, newTier];
  //     
  //     await onScheduleUpdate(updatedSchedule);
  //     await loadAvailableTeams(); // Refresh the teams list
  //   } catch (error) {
  //     console.error('Error adding team to schedule:', error);
  //   }
  // };



  // Delete team functions
  const handleDeleteTeam = (tierIndex: number, position: string, teamName: string) => {
    setTeamToDelete({ tierIndex, position, teamName });
    setDeleteConfirmOpen(true);
  };


  const cancelDeleteTeam = () => {
    setDeleteConfirmOpen(false);
    setTeamToDelete(null);
  };

  // Add team functions
  const handleAddTeamToPosition = async (tierIndex: number, position: string) => {
    setAddTeamPosition({ tierIndex, position });
    await loadAvailableTeams();
    setAddTeamModalOpen(true);
  };

  // Start dragging with mouse events
  const startDrag = (teamName: string, tierIndex: number, position: string, event: React.MouseEvent) => {
    event.preventDefault();
    setDragState({
      isDragging: true,
      draggedTeam: teamName,
      fromTier: tierIndex,
      fromPosition: position,
      hoverTier: null,
      hoverPosition: null,
      mouseX: event.clientX,
      mouseY: event.clientY
    });
  };

  // Handle hover over drop zone
  const handleDragHover = (tierIndex: number, position: string) => {
    if (!dragState.isDragging) return;
    
    setDragState(prev => ({
      ...prev,
      hoverTier: tierIndex,
      hoverPosition: position
    }));
  };

  // Handle mouse move during drag
  const handleMouseMove = (event: MouseEvent) => {
    if (!dragState.isDragging) return;
    
    setDragState(prev => ({
      ...prev,
      mouseX: event.clientX,
      mouseY: event.clientY
    }));
  };

  // Handle mouse up (drop)
  const handleMouseUp = async (event: MouseEvent) => {
    if (!dragState.isDragging) return;

    // Find the element under the cursor
    const elementUnderCursor = document.elementFromPoint(event.clientX, event.clientY);
    const dropZone = elementUnderCursor?.closest('[data-drop-zone]');
    
    if (dropZone) {
      const tierIndex = parseInt(dropZone.getAttribute('data-tier-index') || '0');
      const position = dropZone.getAttribute('data-position') || 'A';
      
      // Perform the actual move (async)
      await moveTeam(dragState.fromTier!, dragState.fromPosition!, tierIndex, position);
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
      mouseY: 0
    });
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, dragState.fromTier, dragState.fromPosition]);

  // Simple team move function with database persistence
  const moveTeam = async (fromTier: number, fromPos: string, toTier: number, toPos: string) => {
    console.log(`Moving team from T${fromTier + 1}${fromPos} to T${toTier + 1}${toPos}`);
    
    // Don't allow moving to the same position
    if (fromTier === toTier && fromPos === toPos) {
      console.log('Same position - no move needed');
      return;
    }
    
    // Find the team being moved
    const sourceTier = weeklyTiers[fromTier];
    const targetTier = weeklyTiers[toTier];
    
    if (!sourceTier || !targetTier) {
      console.error('Invalid tier index');
      return;
    }
    
    const teamField = `team_${fromPos.toLowerCase()}_name` as keyof WeeklyScheduleTier;
    const rankingField = `team_${fromPos.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
    
    const teamName = (sourceTier as any)[teamField];
    const teamRanking = (sourceTier as any)[rankingField];
    
    if (!teamName) return;

    // Check if target position is occupied
    const targetField = `team_${toPos.toLowerCase()}_name` as keyof WeeklyScheduleTier;
    const targetRankingField = `team_${toPos.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
    const targetTeam = (targetTier as any)[targetField];
    
    // Don't allow dropping on occupied positions
    if (targetTeam) {
      console.log('Target position is occupied - move not allowed');
      return;
    }

    // Create new tiers array
    const newTiers = [...weeklyTiers];
    
    // Clear source position
    (newTiers[fromTier] as any)[teamField] = null;
    (newTiers[fromTier] as any)[rankingField] = null;
    
    // Place in target position
    (newTiers[toTier] as any)[targetField] = teamName;
    (newTiers[toTier] as any)[targetRankingField] = teamRanking;
    
    // Update state optimistically
    setWeeklyTiers(newTiers);
    
    // Save to database
    try {
      // Check if tiers have IDs (they might be newly created without IDs)
      if (!sourceTier.id || !targetTier.id) {
        console.error('Cannot save move - one or more tiers missing database ID. Save the schedule first.');
        // Revert the optimistic update
        await loadWeeklySchedule(currentWeek);
        return;
      }
      
      // Update source tier - clear the position
      const sourceUpdate: any = {
        [`team_${fromPos.toLowerCase()}_name`]: null,
        [`team_${fromPos.toLowerCase()}_ranking`]: null
      };
      
      const { error: sourceError } = await supabase
        .from('weekly_schedules')
        .update(sourceUpdate)
        .eq('id', sourceTier.id);
        
      if (sourceError) throw sourceError;
      
      // Update target tier - set the team
      const targetUpdate: any = {
        [`team_${toPos.toLowerCase()}_name`]: teamName,
        [`team_${toPos.toLowerCase()}_ranking`]: teamRanking
      };
      
      const { error: targetError } = await supabase
        .from('weekly_schedules')
        .update(targetUpdate)
        .eq('id', targetTier.id);
        
      if (targetError) throw targetError;
      
      console.log('Team move saved to database successfully');
    } catch (error) {
      console.error('Error saving team move to database:', error);
      // Revert on error by reloading from database
      loadWeeklySchedule(currentWeek);
    }
  };

  const startEdgeScrolling = (clientY: number) => {
    const zoneHeightPercent = 0.15; // 15% of viewport height
    const topThreshold = Math.floor(window.innerHeight * zoneHeightPercent);
    const bottomThreshold = Math.floor(window.innerHeight * zoneHeightPercent);
    const baseScrollSpeed = 10; // Base scroll speed per frame
    
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    const viewportHeight = window.innerHeight;
    const topZone = clientY < topThreshold;
    const bottomZone = clientY > (viewportHeight - bottomThreshold);
    const distanceFromBottom = viewportHeight - clientY;
    
    console.log('Edge scroll check:', {
      clientY,
      viewportHeight,
      topThreshold,
      topZone: `${topZone} (< ${topThreshold})`,
      bottomZone: `${bottomZone} (> ${viewportHeight - bottomThreshold})`,
      distanceFromBottom: `${distanceFromBottom} (< ${bottomThreshold}?)`,
      shouldScrollDown: distanceFromBottom < bottomThreshold
    });

    if (topZone) {
      // Scroll up - faster the closer to edge
      const intensity = Math.max(0.5, (topThreshold - clientY) / topThreshold);
      const speed = baseScrollSpeed * intensity;
      
      const animate = () => {
        window.scrollBy(0, -speed);
        scrollAnimationRef.current = requestAnimationFrame(animate);
      };
      scrollAnimationRef.current = requestAnimationFrame(animate);
    } else if (distanceFromBottom < bottomThreshold) {
      // Scroll down - faster the closer to bottom edge
      const intensity = Math.max(0.5, (bottomThreshold - distanceFromBottom) / bottomThreshold);
      const speed = baseScrollSpeed * intensity;
      
      const animate = () => {
        window.scrollBy(0, speed);
        scrollAnimationRef.current = requestAnimationFrame(animate);
      };
      scrollAnimationRef.current = requestAnimationFrame(animate);
    }
  };

  const stopEdgeScrolling = () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
      console.log('Stopped edge scrolling');
    }
  };


  // Check if a tier is empty (no teams assigned)
  const isTierEmpty = (tier: Tier): boolean => {
    return Object.values(tier.teams).every(team => team === null);
  };

  // Get current ranking from standings (source of truth)
  const getCurrentRanking = (teamName: string): number => {
    const teamIndex = standingsTeams.findIndex(team => team.name === teamName);
    return teamIndex === -1 ? 0 : teamIndex + 1; // Return 0 if team not found, otherwise ranking
  };


  // Create a new tier for overflow teams
  const createNewTier = (tierNumber: number, isBlankTier: boolean = false): Tier => {
    if (isBlankTier) {
      // Create a tier with sensible defaults for manual insertion
      return {
        tierNumber,
        location: 'TBD',
        time: '6:00-8:00',
        court: 'Court 1',
        format: '3-teams-6-sets', // Default format
        teams: {
          A: null,
          B: null,
          C: null,
        },
        courts: {
          A: 'Court 1',
          B: 'Court 1',
          C: 'Court 1',
        },
      };
    }

    // Original logic for overflow/cascade tiers
    const locations = [
      "Carleton University",
      "University of Ottawa", 
      "Glebe Collegiate",
      "Nepean Sportsplex",
      "Orleans Recreation Complex",
    ];
    
    const timeSlots = [
      "7:00 PM - 8:30 PM",
      "8:30 PM - 10:00 PM", 
      "6:00 PM - 7:30 PM",
      "7:30 PM - 9:00 PM",
    ];

    // Use modulo to cycle through locations and times
    const locationIndex = (tierNumber - 1) % locations.length;
    const timeIndex = (tierNumber - 1) % timeSlots.length;
    const courtIndex = (tierNumber - 1) % 3;

    return {
      tierNumber,
      location: locations[locationIndex],
      time: timeSlots[timeIndex],
      court: `Court ${courtIndex + 1}`,
      format: '3-teams-6-sets', // Default format
      teams: {
        A: null,
        B: null,
        C: null,
      },
      courts: {
        A: `Court ${courtIndex + 1}`,
        B: `Court ${courtIndex + 1}`,
        C: `Court ${courtIndex + 1}`,
      },
    };
  };

  // Helper function to get the display team for a position (actual team or preview)
  const getDisplayTeam = (tierIndex: number, position: string, actualTeam: { name: string; ranking: number } | null) => {
    // Check if there's a preview for this position
    const previewTeam = cascadePreview.find(p => p.tierIndex === tierIndex && p.position === position);
    if (previewTeam) {
      return {
        team: previewTeam.team,
        isPreview: true,
        isOriginalPosition: draggedTeam?.fromTier === tierIndex && draggedTeam?.fromPosition === position
      };
    }

    // Check if this is the original position of the dragged team
    const isOriginalPosition = draggedTeam?.fromTier === tierIndex && draggedTeam?.fromPosition === position;
    
    // Only hide the original team if there's an active cascade preview
    // This ensures the team shows in its original position when not hovering over drop zones
    if (isOriginalPosition && cascadePreview.length > 0) {
      return {
        team: null,
        isPreview: false,
        isOriginalPosition: true
      };
    }

    // Return actual team (including showing dragged team in original position when no preview)
    return {
      team: actualTeam,
      isPreview: false,
      isOriginalPosition: isOriginalPosition
    };
  };

  const handleDragOver = (e: React.DragEvent, tierIndex: number, position: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only proceed if we have a dragged team
    if (!draggedTeam) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    e.dataTransfer.dropEffect = 'move';
    
    // Only update if the target actually changed to prevent unnecessary re-renders
    const currentTarget = dragOverTarget;
    if (!currentTarget || currentTarget.tierIndex !== tierIndex || currentTarget.position !== position) {
      // Clear any existing throttle
      if (dragOverThrottleRef.current) {
        clearTimeout(dragOverThrottleRef.current);
      }
      
      // Throttle the preview calculation to reduce flickering
      dragOverThrottleRef.current = setTimeout(() => {
        setDragOverTarget({ tierIndex, position });
        
        // Calculate and set cascade preview
        const preview = calculateCascadePreview(tierIndex, position);
        setCascadePreview(preview);
      }, 10); // Small delay to reduce rapid updates
    }
    // Edge scrolling now handled by global mouse tracking
  };




  // Weekly Schedule specific drag/drop handlers
  const handleWeeklyDrop = async (e: React.DragEvent, targetTierIndex: number, targetPosition: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTeam) return;


    try {
      // Directly simulate the cascade without relying on preview state
      const newWeeklyTiers = [...weeklyTiers];
      
      // FIRST: Always clear the source position immediately
      const sourceTier = newWeeklyTiers[draggedTeam.fromTier];
      if (sourceTier) {
        const sourceField = `team_${draggedTeam.fromPosition.toLowerCase()}_name` as keyof WeeklyScheduleTier;
        const sourceRankingField = `team_${draggedTeam.fromPosition.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
        (sourceTier as any)[sourceField] = null;
        (sourceTier as any)[sourceRankingField] = null;
      }
      
      // SECOND: Simulate fresh cascade from target position
      let currentTeamToBump = {
        name: draggedTeam.name,
        ranking: draggedTeam.ranking
      };
      let currentTierIndex = targetTierIndex;
      let currentPosition = targetPosition;

      // Execute cascade through weekly tiers
      while (currentTierIndex < newWeeklyTiers.length) {
        const currentTier = newWeeklyTiers[currentTierIndex];
        
        const teamField = `team_${currentPosition.toLowerCase()}_name` as keyof WeeklyScheduleTier;
        const existingTeam = (currentTier as any)[teamField];
        const existingRanking = (currentTier as any)[`team_${currentPosition.toLowerCase()}_ranking`] || 0;
        
        // Place the current team
        (currentTier as any)[teamField] = currentTeamToBump.name;
        (currentTier as any)[`team_${currentPosition.toLowerCase()}_ranking`] = currentTeamToBump.ranking;
        
        // If no existing team, we're done
        if (!existingTeam) {
          break;
        }
        
        // Prepare to bump the existing team
        currentTeamToBump = { name: existingTeam, ranking: existingRanking };
        
        // Find next position
        if (currentPosition === 'A') {
          currentPosition = 'B';
        } else if (currentPosition === 'B') {
          currentPosition = 'C';
        } else {
          // Move to next tier, position A
          currentTierIndex++;
          currentPosition = 'A';
        }
      }

      // Handle overflow - if we still have a team to place, create new tier
      if (currentTierIndex >= newWeeklyTiers.length && currentTeamToBump) {
        
        // Create new tier for overflow
        const templateTier = newWeeklyTiers[0] || {};
        const newTier: WeeklyScheduleTier = {
          id: Date.now(), // Temporary ID
          tier_number: newWeeklyTiers.length + 1,
          location: templateTier.location || 'TBD',
          time_slot: templateTier.time_slot || 'TBD',
          court: `Court ${newWeeklyTiers.length + 1}`,
          team_a_name: currentPosition === 'A' ? currentTeamToBump.name : null,
          team_a_ranking: currentPosition === 'A' ? currentTeamToBump.ranking : null,
          team_b_name: currentPosition === 'B' ? currentTeamToBump.name : null,
          team_b_ranking: currentPosition === 'B' ? currentTeamToBump.ranking : null,
          team_c_name: currentPosition === 'C' ? currentTeamToBump.name : null,
          team_c_ranking: currentPosition === 'C' ? currentTeamToBump.ranking : null,
          is_completed: false,
          no_games: false,
          format: '3-teams-6-sets'
        };
        
        newWeeklyTiers.push(newTier);
      }

      // Update weekly tiers in state
      setWeeklyTiers(newWeeklyTiers);
      
    } catch (error) {
      console.error('Error updating weekly schedule:', error);
    }

    // Clear drag state
    setDraggedTeam(null);
    setDragOverTarget(null);
    setCascadePreview([]);
    setIsDragging(false);
    stopEdgeScrolling();
  };

  const handleWeeklyInsertTier = async (position: number) => {
    console.log('Insert tier at position:', position);
    console.log('League ID:', leagueId);
    console.log('Current Week:', currentWeek);
    console.log('Existing tiers:', weeklyTiers);
    
    try {
      // FIRST: Update tier numbers for all existing tiers at or after the insertion position
      // We need to do this BEFORE inserting to avoid duplicate key violations
      const tiersToUpdate = weeklyTiers.filter((tier, index) => index >= position);
      
      console.log('Tiers to renumber:', tiersToUpdate.length);
      
      if (tiersToUpdate.length > 0) {
        // Update tier numbers in reverse order to avoid conflicts
        // Start from the last tier and work backwards
        for (let i = tiersToUpdate.length - 1; i >= 0; i--) {
          const tier = tiersToUpdate[i];
          if (!tier.id) {
            console.warn('Skipping tier without ID:', tier);
            continue;
          }
          
          const oldTierNumber = tier.tier_number;
          const newTierNumber = oldTierNumber + 1;
          console.log(`Updating tier ${tier.id} from tier_number ${oldTierNumber} to ${newTierNumber}`);
          
          const { error: updateError } = await supabase
            .from('weekly_schedules')
            .update({ tier_number: newTierNumber })
            .eq('id', tier.id);
            
          if (updateError) {
            console.error('Error updating tier number:', updateError);
            alert(`Failed to update tier numbers: ${updateError.message}`);
            throw updateError;
          }
        }
      }
      
      // SECOND: Update tier-specific defaults before inserting
      const tierNumber = position + 1;
      console.log('Shifting tier defaults up from position:', tierNumber);
      await shiftTierDefaultsUp(tierNumber);
      
      // Create new tier structure with pure placeholders (no tier-specific defaults)
      const insertData = {
        league_id: leagueId,
        week_number: currentWeek,
        tier_number: tierNumber,
        location: 'SET_LOCATION', // New tier gets pure placeholders
        time_slot: 'SET_TIME', // New tier gets pure placeholders
        court: 'SET_COURT', // New tier gets pure placeholders
        team_a_name: null,
        team_a_ranking: null,
        team_b_name: null,
        team_b_ranking: null,
        team_c_name: null,
        team_c_ranking: null,
        is_completed: false,
        no_games: false,
        format: '3-teams-6-sets'
      };
      
      console.log('Inserting new tier with data:', insertData);
      
      const { data: newTierData, error: insertError } = await supabase
        .from('weekly_schedules')
        .insert(insertData)
        .select()
        .single();
        
      if (insertError) {
        console.error('Error inserting tier to database:', insertError);
        alert(`Failed to insert tier: ${insertError.message}`);
        // Try to restore original tier numbers on failure
        await loadWeeklySchedule(currentWeek);
        throw insertError;
      }
      
      console.log('New tier saved to database with ID:', newTierData?.id);
      
      // Reload the weekly schedule to get the updated data
      console.log('Reloading weekly schedule...');
      await loadWeeklySchedule(currentWeek);
      console.log('Weekly schedule reloaded after tier insertion');
      
    } catch (error) {
      console.error('Error inserting tier:', error);
      // Reload to ensure UI is in sync with database
      await loadWeeklySchedule(currentWeek);
    }
  };

  const handleWeeklyDeleteTeam = async (tierIndex: number, position: string, teamName: string) => {
    console.log('Delete team:', teamName, 'from', `T${tierIndex + 1}${position}`);
    
    try {
      const tier = weeklyTiers[tierIndex];
      
      if (tier && tier.id) {
        // Update in database
        const updateData: any = {
          [`team_${position.toLowerCase()}_name`]: null,
          [`team_${position.toLowerCase()}_ranking`]: null
        };
        
        const { error } = await supabase
          .from('weekly_schedules')
          .update(updateData)
          .eq('id', tier.id);
          
        if (error) {
          console.error('Error deleting team from database:', error);
          throw error;
        }
        
        // Update local state
        const newWeeklyTiers = [...weeklyTiers];
        const localTier = newWeeklyTiers[tierIndex];
        const teamField = `team_${position.toLowerCase()}_name` as keyof WeeklyScheduleTier;
        const rankingField = `team_${position.toLowerCase()}_ranking` as keyof WeeklyScheduleTier;
        (localTier as any)[teamField] = null;
        (localTier as any)[rankingField] = null;
        
        setWeeklyTiers(newWeeklyTiers);
        console.log('Team deleted from database and local state');
      }
    } catch (error) {
      console.error('Error deleting team from weekly schedule:', error);
    }
  };

  const handleWeeklyRemoveTier = async (tierIndex: number, tierNumber: number) => {
    console.log('Remove weekly tier:', tierNumber, 'at index:', tierIndex);
    
    // Don't allow removing tiers with teams
    const tier = weeklyTiers[tierIndex];
    if (!tier) return;
    
    const hasTeams = tier.team_a_name || tier.team_b_name || tier.team_c_name;
    if (hasTeams) {
      alert('Cannot remove tier with teams. Remove all teams first.');
      return;
    }
    
    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to remove Tier ${tierNumber}? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      // FIRST: Update tier-specific defaults before deleting
      console.log('Shifting tier defaults down for removed tier:', tierNumber);
      await shiftTierDefaultsDown(tierNumber);
      
      // SECOND: Delete the tier from database
      const { error: deleteError } = await supabase
        .from('weekly_schedules')
        .delete()
        .eq('id', tier.id);
        
      if (deleteError) {
        console.error('Error deleting tier from database:', deleteError);
        alert(`Failed to delete tier: ${deleteError.message}`);
        throw deleteError;
      }
      
      console.log('Tier deleted from database');
      
      // THIRD: Update tier numbers for all remaining tiers that come after the deleted one
      const tiersToRenumber = weeklyTiers.filter((t, index) => index > tierIndex);
      
      if (tiersToRenumber.length > 0) {
        for (const tierToUpdate of tiersToRenumber) {
          if (!tierToUpdate.id) continue;
          
          const newTierNumber = tierToUpdate.tier_number - 1;
          console.log(`Renumbering tier ${tierToUpdate.id} from ${tierToUpdate.tier_number} to ${newTierNumber}`);
          
          const { error: updateError } = await supabase
            .from('weekly_schedules')
            .update({ tier_number: newTierNumber })
            .eq('id', tierToUpdate.id);
            
          if (updateError) {
            console.error('Error renumbering tier:', updateError);
            // Don't fail completely on renumbering errors
          }
        }
      }
      
      // Reload the weekly schedule to show updated state
      await loadWeeklySchedule(currentWeek);
      console.log('Weekly schedule reloaded after tier deletion');
      
    } catch (error) {
      console.error('Error removing weekly tier:', error);
      // Reload to ensure UI is in sync with database
      await loadWeeklySchedule(currentWeek);
    }
  };

  const handleWeeklyAddTeamToPosition = (tierIndex: number, position: string) => {
    console.log('Add team to:', `T${tierIndex + 1}${position}`);
    
    setAddTeamPosition({ tierIndex, position });
    setAddTeamModalOpen(true);
  };

  const handleWeeklyDragOver = (e: React.DragEvent, targetTierIndex: number, targetPosition: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTeam || !isEditScheduleMode) {
      return;
    }

    // Set drag over target
    setDragOverTarget({ tierIndex: targetTierIndex, position: targetPosition });

    // Generate cascade preview for weekly schedule
    const preview: typeof cascadePreview = [];
    let currentTeamToBump = {
      name: draggedTeam.name,
      ranking: draggedTeam.ranking
    };
    let currentTierIndex = targetTierIndex;
    let currentPosition = targetPosition;

    // Simulate cascade through weekly tiers
    while (currentTierIndex < weeklyTiers.length) {
      const currentTier = weeklyTiers[currentTierIndex];
      
      const teamField = `team_${currentPosition.toLowerCase()}_name` as keyof WeeklyScheduleTier;
      let existingTeam = (currentTier as any)[teamField];
      let existingRanking = (currentTier as any)[`team_${currentPosition.toLowerCase()}_ranking`] || 0;
      
      // Treat the dragged team's source position as empty to avoid circular cascade
      if (currentTierIndex === draggedTeam.fromTier && currentPosition === draggedTeam.fromPosition) {
        existingTeam = null;
        existingRanking = 0;
      }
      
      // Add current team to preview
      preview.push({
        tierIndex: currentTierIndex,
        position: currentPosition,
        team: currentTeamToBump,
        isPreview: true
      });
      
      // If no existing team, we're done
      if (!existingTeam) {
        break;
      }
      
      // Prepare to bump the existing team
      currentTeamToBump = { name: existingTeam, ranking: existingRanking };
      
      // Find next position
      if (currentPosition === 'A') {
        currentPosition = 'B';
      } else if (currentPosition === 'B') {
        currentPosition = 'C';
      } else {
        // Move to next tier, position A
        currentTierIndex++;
        currentPosition = 'A';
      }
    }

    // If we need to create a new tier for overflow
    if (currentTierIndex >= weeklyTiers.length && currentTeamToBump) {
      preview.push({
        tierIndex: currentTierIndex,
        position: 'A',
        team: currentTeamToBump,
        isPreview: true
      });
    }

    setCascadePreview(preview);
  };


  return (
    <div>
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#6F6F6F]">League Schedule</h2>
        
        {!isEditScheduleMode ? (
          <div className="flex gap-3">
            {userProfile?.is_admin && (
              <>
                <button
                  onClick={enterEditScheduleMode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded border border-gray-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Schedule
                </button>
                <button
                  onClick={() => setShowAddPlayoffModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#B20000] text-sm rounded border border-red-200 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {currentPlayoffWeeks > 0 ? 'Edit Playoff Weeks' : 'Add Playoff Weeks'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={exitEditScheduleMode}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveScheduleChanges}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>


      {/* Scroll zone indicators during drag */}
      {draggedTeam && isEditScheduleMode && (
        <>
          {/* Top scroll zone indicator */}
          <div 
            className="fixed top-0 left-0 right-0 pointer-events-none z-40 bg-gradient-to-b from-blue-200 to-transparent opacity-30"
            style={{ height: `${Math.floor(window.innerHeight * 0.15)}px` }}
          >
            <div className="flex items-center justify-center text-blue-800 font-medium" style={{ height: `${Math.floor(window.innerHeight * 0.075)}px` }}>
              ↑ Scroll Up Zone (15%)
            </div>
          </div>
          
          {/* Bottom scroll zone indicator */}
          <div 
            className="fixed bottom-0 left-0 right-0 pointer-events-none z-40 bg-gradient-to-t from-blue-200 to-transparent opacity-30"
            style={{ height: `${Math.floor(window.innerHeight * 0.15)}px` }}
          >
            <div className="flex items-center justify-center text-blue-800 font-medium" style={{ height: `${Math.floor(window.innerHeight * 0.075)}px`, marginTop: `${Math.floor(window.innerHeight * 0.075)}px` }}>
              ↓ Scroll Down Zone (15%)
            </div>
          </div>
        </>
      )}
      
      {/* Week header with navigation */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Navigation buttons grouped together */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateToWeek(currentWeek - 1)}
              disabled={!canNavigateToWeek(currentWeek - 1)}
              className="px-2 py-1 text-[#6F6F6F] hover:text-[#B20000] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigateToWeek(currentWeek + 1)}
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
            </div>
          </div>
          
          {/* No Games checkbox outside navigation */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noGamesWeek}
                onChange={(e) => handleNoGamesChange(e.target.checked)}
                disabled={savingNoGames}
                className="rounded border-gray-300 text-[#B20000] focus:ring-[#B20000] focus:ring-offset-0"
              />
              <span className="text-sm text-[#6F6F6F]">
                No Games This Week
                {savingNoGames && (
                  <span className="ml-1 text-xs text-gray-400">(Saving...)</span>
                )}
              </span>
            </label>
          </div>
        </div>
        
        {/* Right side message - always visible */}
        <div className="flex items-center">
          {/* Previous week results message */}
          {currentWeek > 1 && week1TierStructure.length > 0 && (
            <div className="text-xs text-gray-500 italic">
              Schedule updated each week based on previous week's results
            </div>
          )}
        </div>
      </div>
      
      {/* Display tiers for the current week */}
      <div className="space-y-6">
        {loadingWeekData ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
          </div>
        ) : weeklyTiers.length > 0 ? (
          // NEW: Display weekly schedule data with edit features
          (() => {
            const elements: React.ReactElement[] = [];
            
            weeklyTiers.forEach((tier, tierIndex) => {
              // Add insert tier button before each tier (in edit mode)
              if (isEditScheduleMode && userProfile?.is_admin) {
                elements.push(
                  <div key={`insert-before-weekly-${tierIndex}`} className="flex justify-center py-1">
                    <button
                      onClick={() => handleWeeklyInsertTier(tierIndex)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-dashed border-blue-300 hover:border-blue-500 rounded-md transition-all duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Insert Tier
                    </button>
                  </div>
                );
              }
              
              elements.push(
                <Card key={tier.id} className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                {/* Tier Header */}
                <div className="bg-[#F8F8F8] border-b px-8 py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {/* Remove tier button - only for empty tiers in edit mode */}
                      {isEditScheduleMode && userProfile?.is_admin && (!tier.team_a_name && !tier.team_b_name && !tier.team_c_name) && (
                        <button
                          onClick={() => handleWeeklyRemoveTier(tierIndex, tier.tier_number)}
                          className="flex items-center gap-1 text-sm text-[#B20000] hover:text-[#8A0000] hover:underline"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      )}
                      
                      <h3 className="font-bold text-[#6F6F6F] text-xl leading-none m-0">
                        Tier {tier.tier_number}
                        {tier.is_completed && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Completed
                          </span>
                        )}
                      </h3>
                      
                      {/* Submit Scores link for weekly tiers */}
                      {(() => {
                        const canSubmitScores = userProfile?.is_admin || userProfile?.is_facilitator;
                        const showSubmitLink = canSubmitScores && 
                          !tier.is_completed && 
                          !tier.no_games && 
                          tier.team_a_name && 
                          tier.team_b_name && 
                          tier.team_c_name;
                        
                        return showSubmitLink && (
                          <button 
                            onClick={() => {
                              setSelectedTierForScores(tier);
                              setIsScoresModalOpen(true);
                            }}
                            className="text-sm text-[#B20000] hover:text-[#8B0000] hover:underline"
                          >
                            Submit scores
                          </button>
                        );
                      })()}
                      
                      {/* Edit button for weekly tiers - only in edit mode */}
                      {userProfile?.is_admin && isEditScheduleMode && (
                        <button
                          onClick={() => handleEditWeeklyTier(tier, tierIndex)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className={`text-sm ${tier.location && !['LOCATION_REQUIRED', 'SET_LOCATION'].includes(tier.location) ? 'text-[#6F6F6F]' : 'text-red-500 italic'}`}>
                          {tier.location && !['LOCATION_REQUIRED', 'SET_LOCATION'].includes(tier.location) ? tier.location : 'Set location'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className={`text-sm ${tier.time_slot && !['TIME_REQUIRED', 'SET_TIME'].includes(tier.time_slot) ? 'text-[#6F6F6F]' : 'text-red-500 italic'}`}>
                          {tier.time_slot && !['TIME_REQUIRED', 'SET_TIME'].includes(tier.time_slot) ? tier.time_slot : 'Set time'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-[#B20000] mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                          <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1"/>
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                        </svg>
                        <span className={`text-sm ${tier.court && !['COURT_REQUIRED', 'SET_COURT'].includes(tier.court) ? 'text-[#6F6F6F]' : 'text-red-500 italic'}`}>
                          {tier.court && !['COURT_REQUIRED', 'SET_COURT'].includes(tier.court) ? tier.court : 'Set court'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Teams Display */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Team A Position */}
                    <div 
                      className={`text-center p-3 rounded border-2 transition-all ${
                        isEditScheduleMode 
                          ? dragState.isDragging 
                            ? !tier.team_a_name || (dragState.fromTier === tierIndex && dragState.fromPosition === 'A')
                              ? 'border-green-400 bg-green-50 border-dashed cursor-pointer' // Valid drop zone (empty or source position)
                              : 'border-red-300 bg-red-50 border-dashed cursor-not-allowed' // Invalid drop zone (occupied)
                            : 'border-transparent'
                          : 'border-transparent'
                      }`}
                      data-drop-zone="true"
                      data-tier-index={tierIndex}
                      data-position="A"
                      onMouseEnter={() => isEditScheduleMode && handleDragHover(tierIndex, 'A')}
                    >
                      <div className="font-medium text-[#6F6F6F] mb-1">A</div>
                      {(() => {
                        // Check for cascade preview team for this position
                        const previewTeam = cascadePreview.find(p => p.tierIndex === tierIndex && p.position === 'A');
                        const isOriginalPosition = draggedTeam?.fromTier === tierIndex && draggedTeam?.fromPosition === 'A';
                        
                        
                        if (previewTeam) {
                          return (
                            <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-blue-50 border-2 border-blue-300 rounded">
                              <div className="text-blue-500 select-none">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
                                </svg>
                              </div>
                              <div className="text-center flex-1">
                                <div className="font-medium text-blue-800">{previewTeam.team.name}</div>
                                <div className="text-xs text-blue-600">(Rank {previewTeam.team.ranking || '-'}) • Preview</div>
                              </div>
                            </div>
                          );
                        } else if (tier.team_a_name && !isOriginalPosition) {
                          return (
                            <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-white border-2 border-gray-200 rounded">
                              {isEditScheduleMode && (
                                <div className="text-gray-400 cursor-grab active:cursor-grabbing select-none">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="9" cy="5" r="1"/>
                                    <circle cx="15" cy="5" r="1"/>
                                    <circle cx="9" cy="12" r="1"/>
                                    <circle cx="15" cy="12" r="1"/>
                                    <circle cx="9" cy="19" r="1"/>
                                    <circle cx="15" cy="19" r="1"/>
                                  </svg>
                                </div>
                              )}
                              <div
                                className={`text-center flex-1 ${isEditScheduleMode ? 'cursor-pointer select-none' : ''} ${
                                  dragState.isDragging && dragState.fromTier === tierIndex && dragState.fromPosition === 'A' 
                                    ? 'opacity-50' : ''
                                }`}
                                onMouseDown={(e) => {
                                  if (isEditScheduleMode && tier.team_a_name) {
                                    startDrag(tier.team_a_name, tierIndex, 'A', e);
                                  }
                                }}
                              >
                                <div className="font-medium">{tier.team_a_name}</div>
                                <div className="text-xs text-gray-500">(Rank {tier.team_a_ranking || '-'})</div>
                              </div>
                              {isEditScheduleMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    tier.team_a_name && handleWeeklyDeleteTeam(tierIndex, 'A', tier.team_a_name);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                  title="Remove team"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        } else if (isOriginalPosition && draggedTeam) {
                          return (
                            <div className="h-[60px] min-h-[60px] flex items-center justify-center p-2 w-full bg-gray-100 border-2 border-gray-200 text-gray-400 opacity-50 rounded">
                              <span className="text-xs">Moving...</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="h-[60px] min-h-[60px] flex items-center justify-center text-xs p-2 w-full">
                              {isEditScheduleMode ? (
                                <div className="flex flex-col items-center justify-center w-full h-full">
                                  <button
                                    onClick={() => handleWeeklyAddTeamToPosition(tierIndex, 'A')}
                                    className="flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors mb-1"
                                    title="Add team to this position"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                  <div className="text-xs font-medium text-gray-600">Add Team</div>
                                  <div className="text-xs text-gray-500">or drop here</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-sm">Empty</span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </div>
                    
                    {/* Team B Position */}
                    <div 
                      className={`text-center p-3 rounded border-2 transition-all ${
                        isEditScheduleMode 
                          ? dragState.isDragging 
                            ? !tier.team_b_name || (dragState.fromTier === tierIndex && dragState.fromPosition === 'B')
                              ? 'border-green-400 bg-green-50 border-dashed cursor-pointer' // Valid drop zone (empty or source position)
                              : 'border-red-300 bg-red-50 border-dashed cursor-not-allowed' // Invalid drop zone (occupied)
                            : 'border-transparent'
                          : 'border-transparent'
                      }`}
                      data-drop-zone="true"
                      data-tier-index={tierIndex}
                      data-position="B"
                      onMouseEnter={() => isEditScheduleMode && handleDragHover(tierIndex, 'B')}
                    >
                      <div className="font-medium text-[#6F6F6F] mb-1">B</div>
                      {(() => {
                        const previewTeam = cascadePreview.find(p => p.tierIndex === tierIndex && p.position === 'B');
                        const isOriginalPosition = draggedTeam?.fromTier === tierIndex && draggedTeam?.fromPosition === 'B';
                        
                        if (previewTeam) {
                          return (
                            <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-blue-50 border-2 border-blue-300 rounded">
                              <div className="text-blue-500 select-none">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
                                </svg>
                              </div>
                              <div className="text-center flex-1">
                                <div className="font-medium text-blue-800">{previewTeam.team.name}</div>
                                <div className="text-xs text-blue-600">(Rank {previewTeam.team.ranking || '-'}) • Preview</div>
                              </div>
                            </div>
                          );
                        } else if (tier.team_b_name && !isOriginalPosition) {
                          return (
                            <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-white border-2 border-gray-200 rounded">
                              {isEditScheduleMode && (
                                <div className="text-gray-400 cursor-grab active:cursor-grabbing select-none">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="9" cy="5" r="1"/>
                                    <circle cx="15" cy="5" r="1"/>
                                    <circle cx="9" cy="12" r="1"/>
                                    <circle cx="15" cy="12" r="1"/>
                                    <circle cx="9" cy="19" r="1"/>
                                    <circle cx="15" cy="19" r="1"/>
                                  </svg>
                                </div>
                              )}
                              <div
                                className={`text-center flex-1 ${isEditScheduleMode ? 'cursor-pointer select-none' : ''} ${
                                  dragState.isDragging && dragState.fromTier === tierIndex && dragState.fromPosition === 'B' 
                                    ? 'opacity-50' : ''
                                }`}
                                onMouseDown={(e) => {
                                  if (isEditScheduleMode && tier.team_b_name) {
                                    startDrag(tier.team_b_name, tierIndex, 'B', e);
                                  }
                                }}
                              >
                                <div className="font-medium">{tier.team_b_name}</div>
                                <div className="text-xs text-gray-500">(Rank {tier.team_b_ranking || '-'})</div>
                              </div>
                              {isEditScheduleMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    tier.team_b_name && handleWeeklyDeleteTeam(tierIndex, 'B', tier.team_b_name);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                  title="Remove team"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        } else if (isOriginalPosition && draggedTeam) {
                          return (
                            <div className="h-[60px] min-h-[60px] flex items-center justify-center p-2 w-full bg-gray-100 border-2 border-gray-200 text-gray-400 opacity-50 rounded">
                              <span className="text-xs">Moving...</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="h-[60px] min-h-[60px] flex items-center justify-center text-xs p-2 w-full">
                              {isEditScheduleMode ? (
                                <div className="flex flex-col items-center justify-center w-full h-full">
                                  <button
                                    onClick={() => handleWeeklyAddTeamToPosition(tierIndex, 'B')}
                                    className="flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors mb-1"
                                    title="Add team to this position"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                  <div className="text-xs font-medium text-gray-600">Add Team</div>
                                  <div className="text-xs text-gray-500">or drop here</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-sm">Empty</span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </div>
                    
                    {/* Team C Position */}
                    <div 
                      className={`text-center p-3 rounded border-2 transition-all ${
                        isEditScheduleMode 
                          ? dragState.isDragging 
                            ? !tier.team_c_name || (dragState.fromTier === tierIndex && dragState.fromPosition === 'C')
                              ? 'border-green-400 bg-green-50 border-dashed cursor-pointer' // Valid drop zone (empty or source position)
                              : 'border-red-300 bg-red-50 border-dashed cursor-not-allowed' // Invalid drop zone (occupied)
                            : 'border-transparent'
                          : 'border-transparent'
                      }`}
                      data-drop-zone="true"
                      data-tier-index={tierIndex}
                      data-position="C"
                      onMouseEnter={() => isEditScheduleMode && handleDragHover(tierIndex, 'C')}
                    >
                      <div className="font-medium text-[#6F6F6F] mb-1">C</div>
                      {(() => {
                        const previewTeam = cascadePreview.find(p => p.tierIndex === tierIndex && p.position === 'C');
                        const isOriginalPosition = draggedTeam?.fromTier === tierIndex && draggedTeam?.fromPosition === 'C';
                        
                        if (previewTeam) {
                          return (
                            <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-blue-50 border-2 border-blue-300 rounded">
                              <div className="text-blue-500 select-none">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
                                </svg>
                              </div>
                              <div className="text-center flex-1">
                                <div className="font-medium text-blue-800">{previewTeam.team.name}</div>
                                <div className="text-xs text-blue-600">(Rank {previewTeam.team.ranking || '-'}) • Preview</div>
                              </div>
                            </div>
                          );
                        } else if (tier.team_c_name && !isOriginalPosition) {
                          return (
                            <div className="flex items-center gap-2 h-[60px] min-h-[60px] p-2 w-full bg-white border-2 border-gray-200 rounded">
                              {isEditScheduleMode && (
                                <div className="text-gray-400 cursor-grab active:cursor-grabbing select-none">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="9" cy="5" r="1"/>
                                    <circle cx="15" cy="5" r="1"/>
                                    <circle cx="9" cy="12" r="1"/>
                                    <circle cx="15" cy="12" r="1"/>
                                    <circle cx="9" cy="19" r="1"/>
                                    <circle cx="15" cy="19" r="1"/>
                                  </svg>
                                </div>
                              )}
                              <div
                                className={`text-center flex-1 ${isEditScheduleMode ? 'cursor-pointer select-none' : ''} ${
                                  dragState.isDragging && dragState.fromTier === tierIndex && dragState.fromPosition === 'C' 
                                    ? 'opacity-50' : ''
                                }`}
                                onMouseDown={(e) => {
                                  if (isEditScheduleMode && tier.team_c_name) {
                                    startDrag(tier.team_c_name, tierIndex, 'C', e);
                                  }
                                }}
                              >
                                <div className="font-medium">{tier.team_c_name}</div>
                                <div className="text-xs text-gray-500">(Rank {tier.team_c_ranking || '-'})</div>
                              </div>
                              {isEditScheduleMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    tier.team_c_name && handleWeeklyDeleteTeam(tierIndex, 'C', tier.team_c_name);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                  title="Remove team"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        } else if (isOriginalPosition && draggedTeam) {
                          return (
                            <div className="h-[60px] min-h-[60px] flex items-center justify-center p-2 w-full bg-gray-100 border-2 border-gray-200 text-gray-400 opacity-50 rounded">
                              <span className="text-xs">Moving...</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="h-[60px] min-h-[60px] flex items-center justify-center text-xs p-2 w-full">
                              {isEditScheduleMode ? (
                                <div className="flex flex-col items-center justify-center w-full h-full">
                                  <button
                                    onClick={() => handleWeeklyAddTeamToPosition(tierIndex, 'C')}
                                    className="flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors mb-1"
                                    title="Add team to this position"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                  <div className="text-xs font-medium text-gray-600">Add Team</div>
                                  <div className="text-xs text-gray-500">or drop here</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-sm">Empty</span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              );
            });
            
            // Add final insert tier button after all tiers (in edit mode)
            if (isEditScheduleMode && userProfile?.is_admin) {
              elements.push(
                <div key="insert-after-all-weekly" className="flex justify-center py-3">
                  <button
                    onClick={() => handleWeeklyInsertTier(weeklyTiers.length)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 border border-dashed border-green-300 hover:border-green-500 rounded-md transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Tier
                  </button>
                </div>
              );
            }
            
            return elements;
          })()
        ) : currentWeek === 1 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">No Schedule Generated</h3>
            <p className="text-[#6F6F6F]">Generate a schedule from the Teams Management page first.</p>
          </div>
        ) : week1TierStructure.length > 0 ? (
          // Show empty tier structure for future weeks
          week1TierStructure.map((tier) => (
            <Card key={tier.id} className="shadow-md overflow-hidden rounded-lg">
              <CardContent className="p-0 overflow-hidden">
                {/* Tier Header */}
                <div className="bg-[#F8F8F8] border-b px-8 py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-[#6F6F6F] text-xl leading-none m-0">
                        Tier {tier.tier_number}
                      </h3>
                      
                      {/* Edit button for future weeks (week1TierStructure) - only in edit mode */}
                      {userProfile?.is_admin && isEditScheduleMode && (
                        <button
                          onClick={() => handleCreateAndEditWeeklyTier(tier, currentWeek)}
                          className="flex items-center gap-1 text-sm text-[#B20000] hover:text-[#8A0000] hover:underline"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end sm:items-center text-right">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className={`text-sm ${tier.location && !['LOCATION_REQUIRED', 'SET_LOCATION'].includes(tier.location) ? 'text-[#6F6F6F]' : 'text-red-500 italic'}`}>
                          {tier.location && !['LOCATION_REQUIRED', 'SET_LOCATION'].includes(tier.location) ? tier.location : 'Set location'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#B20000] mr-1.5" />
                        <span className={`text-sm ${tier.time_slot && !['TIME_REQUIRED', 'SET_TIME'].includes(tier.time_slot) ? 'text-[#6F6F6F]' : 'text-red-500 italic'}`}>
                          {tier.time_slot && !['TIME_REQUIRED', 'SET_TIME'].includes(tier.time_slot) ? tier.time_slot : 'Set time'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-[#B20000] mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                          <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1"/>
                          <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                        </svg>
                        <span className={`text-sm ${tier.court && !['COURT_REQUIRED', 'SET_COURT'].includes(tier.court) ? 'text-[#6F6F6F]' : 'text-red-500 italic'}`}>
                          {tier.court && !['COURT_REQUIRED', 'SET_COURT'].includes(tier.court) ? tier.court : 'Set court'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Teams Display - Empty positions */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">A</div>
                      <div className="text-sm text-gray-400 italic">
                        TBD
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">B</div>
                      <div className="text-sm text-gray-400 italic">
                        TBD
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[#6F6F6F] mb-1">C</div>
                      <div className="text-sm text-gray-400 italic">
                        TBD
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-2">Week {currentWeek}</h3>
            <p className="text-[#6F6F6F] mb-4">This week&apos;s schedule will be populated once the previous week&apos;s games are completed and scored.</p>
            <div className="text-sm text-gray-500">
              Complete Week {currentWeek - 1} scoring to unlock this week&apos;s schedule.
            </div>
          </div>
        )}

        {/* Show message when no weekly schedule exists */}
        {weeklyTiers.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-bold text-[#6F6F6F] mb-4">No Schedule Generated</h3>
            <p className="text-[#6F6F6F] mb-4">This week doesn't have a schedule yet. Generate a schedule from the Teams page.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedTier && (
        <TierEditModal
          isOpen={editModalOpen}
          onClose={handleModalClose}
          tier={selectedTier}
          tierIndex={selectedTierIndex}
          allTiers={[]}
          leagueId={leagueId}
          leagueName={leagueName}
          onSave={handleSaveWeeklyTier}
        />
      )}

      {/* Add Team Modal */}
      {addTeamModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#6F6F6F]">Manage Teams on Schedule</h2>
                <button 
                  onClick={handleCloseAddTeamModal}
                  className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Teams List */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Add teams to the schedule or remove existing teams. Teams not on the schedule can be added, teams on the schedule can be removed.
                </p>
                
                {availableTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Loading teams...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableTeams.map((team) => (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          team.onSchedule
                            ? 'bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100'
                            : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`font-medium ${team.onSchedule ? 'text-[#6F6F6F]' : 'text-[#6F6F6F]'}`}>
                            {team.name}
                          </div>
                          {team.onSchedule && (
                            <div className="ml-2 text-xs text-green-600 italic">
                              (On schedule)
                            </div>
                          )}
                        </div>
                        
                        {team.onSchedule ? (
                          <button
                            onClick={() => removeTeamFromSchedule(team.name)}
                            className="px-3 py-1 text-sm rounded transition-colors bg-red-500 text-white hover:bg-red-600"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTeamSelection(team.name)}
                            className="px-3 py-1 text-sm rounded transition-colors bg-[#B20000] text-white hover:bg-[#8A0000]"
                          >
                            Add Team
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Added teams will be placed in a new tier at the end of the schedule. Removing teams will delete empty tiers and renumber remaining tiers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={cancelDeleteTeam}></div>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 relative z-10">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Remove Team from Schedule
                </h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove <strong>{teamToDelete.teamName}</strong> from the schedule? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDeleteTeam}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTeam}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Remove Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Tier Confirmation Modal */}
      {removeTierConfirmOpen && tierToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={cancelRemoveTier}></div>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 relative z-10">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Remove Tier from Schedule
                </h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove <strong>Tier {tierToRemove.tierNumber}</strong> from the schedule? All teams in this tier will be removed and remaining tiers will be renumbered. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelRemoveTier}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveTier}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Remove Tier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Playoff Weeks Modal */}
      {showAddPlayoffModal && (
        <AddPlayoffWeeksModal
          isOpen={showAddPlayoffModal}
          onClose={() => setShowAddPlayoffModal(false)}
          leagueId={leagueId}
          currentPlayoffWeeks={currentPlayoffWeeks}
          onPlayoffWeeksAdded={handlePlayoffWeeksAdded}
        />
      )}

      {/* Submit Scores Modal */}
      {selectedTierForScores && (
        <SubmitScoresModal
          isOpen={isScoresModalOpen}
          onClose={() => {
            setIsScoresModalOpen(false);
            setSelectedTierForScores(null);
          }}
          tierData={{
            tier_number: selectedTierForScores.tier_number,
          }}
        />
      )}

      {/* Floating drag element */}
      {dragState.isDragging && dragState.draggedTeam && (
        <div
          className="fixed pointer-events-none z-50 bg-white border-2 border-blue-400 rounded-lg shadow-lg px-3 py-2"
          style={{
            left: dragState.mouseX + 10,
            top: dragState.mouseY - 30,
            transform: 'none'
          }}
        >
          <div className="text-sm font-medium text-blue-800">{dragState.draggedTeam}</div>
          <div className="text-xs text-blue-600">Dragging...</div>
        </div>
      )}
    </div>
  );
}