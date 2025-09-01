import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { MapPin, Clock, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { TierEditModal } from './TierEditModal';
import { AddPlayoffWeeksModal } from './AddPlayoffWeeksModal';
import { AddTeamModal } from './AddTeamModal';
import { getTeamCountForFormat, getGridColsClass } from '../constants/formats';
import { SubmitScoresModal } from '../../LeagueDetailPage/components/SubmitScoresModal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Tier } from '../../LeagueDetailPage/utils/leagueUtils';


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
  leagueId: string;
  leagueName: string;
}

export function AdminLeagueSchedule({ leagueId, leagueName }: AdminLeagueScheduleProps) {
  const { userProfile } = useAuth();
  
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
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [addTeamModalData, setAddTeamModalData] = useState<{ tierIndex: number; position: string } | null>(null);
  
  // Legacy drag state variables (keep for compatibility)
  const [draggedTeam, setDraggedTeam] = useState<{
    name: string;
    ranking: number;
    fromTier: number;
    fromPosition: string;
  } | null>(null);
  const [cascadePreview, setCascadePreview] = useState<any[]>([]);

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
  
  // Drag scrolling state
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


  const enterEditScheduleMode = () => {
    setIsEditScheduleMode(true);
  };

  const exitEditScheduleMode = () => {
    setIsEditScheduleMode(false);
    setDraggedTeam(null);
    setCascadePreview([]);
  };

  const saveScheduleChanges = () => {
    setIsEditScheduleMode(false);
    setDraggedTeam(null);
    setCascadePreview([]);
  };


  // REMOVED: Old tier defaults shifting function

  // REMOVED: Old tier defaults shifting function

  // Additional stub functions

  const confirmDeleteTeam = () => {
    console.log('confirmDeleteTeam called');
  };

  // REMOVED: Old broken tier removal function

  // REMOVED: Old tier gap fixing function

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
          const playoffWeeks = data.playoff_weeks || 0; // Database default should now be 0
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
        
        // Second, update ALL weeks for this tier when setting as default
        // This ensures the default applies to all instances of this tier across the entire season
        const updateData: any = {};
        if (setAsDefaultInfo.location) updateData.location = tierToSave.location;
        if (setAsDefaultInfo.time) updateData.time_slot = tierToSave.time;
        if (setAsDefaultInfo.court) updateData.court = tierToSave.court;
        
        console.log(`Applying defaults to ALL weeks for Tier ${editingWeeklyTier.tier_number}:`, updateData);
        
        // Apply to ALL weeks (not just future weeks) when setting as default
        const { error: futureError } = await supabase
          .from('weekly_schedules')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('league_id', parseInt(leagueId))
          .eq('tier_number', editingWeeklyTier.tier_number);
          // No week filter - applies to ALL weeks for this tier

        if (futureError) {
          console.error('Error updating all weeks:', futureError);
        } else {
          const fieldsUpdated = [
            setAsDefaultInfo.location ? 'location' : '',
            setAsDefaultInfo.time ? 'time' : '',
            setAsDefaultInfo.court ? 'court' : ''
          ].filter(f => f).join(', ');
          console.log(`Successfully applied ${fieldsUpdated} to ALL weeks for Tier ${editingWeeklyTier.tier_number}`);
        }
      }

      // Reload the weekly schedule to reflect changes
      await loadWeeklySchedule(currentWeek);
      
    } catch (error) {
      console.error('Error saving weekly tier:', error);
    }
  };



  // Delete team functions


  const cancelDeleteTeam = () => {
    setDeleteConfirmOpen(false);
    setTeamToDelete(null);
  };

  // Add team functions

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









  // === CLEAN TIER MANAGEMENT FUNCTIONS ===
  
  const addTier = async (afterTierNumber: number) => {
    console.log(`Adding new tier after tier ${afterTierNumber}`);
    
    try {
      // OPTIMIZED: Use single transaction with pure SQL for maximum performance
      const { error } = await supabase.rpc('add_tier_optimized', {
        p_league_id: parseInt(leagueId),
        p_current_week: currentWeek,
        p_after_tier: afterTierNumber
      });
      
      if (error) throw error;
      
      // Refresh UI
      await loadWeeklySchedule(currentWeek);
      console.log(`Successfully added tier after ${afterTierNumber}`);
      
    } catch (error) {
      console.error('Error adding tier:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'No message',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      
      // Fallback to old method if RPC doesn't exist
      if ((error as any)?.code === 'PGRST202' || (error as any)?.code === '42883' || (error as any)?.message?.includes('does not exist') || (error as any)?.message?.includes('no matches were found')) {
        console.log('RPC function does not exist, using fallback method for add tier');
        try {
          await addTierFallback(afterTierNumber);
          await loadWeeklySchedule(currentWeek);
          console.log('Fallback method completed successfully');
        } catch (fallbackError) {
          console.error('Fallback method failed:', fallbackError);
          alert(`Failed to add tier: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'}`);
        }
      } else {
        alert(`Failed to add tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await loadWeeklySchedule(currentWeek); // Reload to fix any inconsistencies
      }
    }
  };

  // Fallback method for add tier (original implementation)
  const addTierFallback = async (afterTierNumber: number) => {
    // 1. Get max week for this league
    const { data: maxWeekData, error: maxWeekError } = await supabase
      .from('weekly_schedules')
      .select('week_number')
      .eq('league_id', parseInt(leagueId))
      .order('week_number', { ascending: false })
      .limit(1);
    
    if (maxWeekError) throw maxWeekError;
    const maxWeek = maxWeekData?.[0]?.week_number || currentWeek;
    
    // 2. Get all tiers that need to be shifted
    const { data: tiersToShift, error: fetchError } = await supabase
      .from('weekly_schedules')
      .select('id, tier_number')
      .eq('league_id', parseInt(leagueId))
      .gte('week_number', currentWeek)
      .gt('tier_number', afterTierNumber);
    
    if (fetchError) throw fetchError;
    
    // 3. Insert new tier for current week and all future weeks
    const newTierNumber = afterTierNumber + 1;
    const insertRows = [];
    
    for (let week = currentWeek; week <= maxWeek; week++) {
      insertRows.push({
        league_id: parseInt(leagueId),
        week_number: week,
        tier_number: newTierNumber,
        location: 'SET_LOCATION',
        time_slot: 'SET_TIME',
        court: 'SET_COURT',
        team_a_name: null,
        team_b_name: null,
        team_c_name: null,
        team_a_ranking: null,
        team_b_ranking: null,
        team_c_ranking: null,
        is_completed: false,
        no_games: false,
        format: '3-teams-6-sets'
      });
    }
    
    const { error: insertError } = await supabase
      .from('weekly_schedules')
      .insert(insertRows);
    
    if (insertError) throw insertError;
    
    // 4. Shift existing tiers up by 1 in descending order
    const sortedTiers = (tiersToShift || []).sort((a, b) => b.tier_number - a.tier_number);
    const updatePromises = sortedTiers.map(tier => 
      supabase
        .from('weekly_schedules')
        .update({ tier_number: tier.tier_number + 1 })
        .eq('id', tier.id)
    );
    
    const updateResults = await Promise.all(updatePromises);
    const updateErrors = updateResults.filter(result => result.error);
    
    if (updateErrors.length > 0) {
      throw new Error(`Failed to update ${updateErrors.length} tiers`);
    }
  };
  
  const removeTier = async (tierNumber: number) => {
    console.log(`Removing tier ${tierNumber}`);
    
    // 1. Check if tier has teams
    const tier = weeklyTiers.find(t => t.tier_number === tierNumber);
    if (tier && (tier.team_a_name || tier.team_b_name || tier.team_c_name)) {
      alert('Cannot remove tier with teams. Remove all teams first.');
      return;
    }
    
    // 2. Confirm deletion
    const confirmed = confirm(`Remove Tier ${tierNumber} from week ${currentWeek} and all future weeks?`);
    if (!confirmed) return;
    
    try {
      // OPTIMIZED: Use single transaction with pure SQL for maximum performance
      const { error } = await supabase.rpc('remove_tier_optimized', {
        p_league_id: parseInt(leagueId),
        p_current_week: currentWeek,
        p_tier_number: tierNumber
      });
      
      if (error) throw error;
      
      // Refresh UI
      await loadWeeklySchedule(currentWeek);
      console.log(`Successfully removed tier ${tierNumber}`);
      
    } catch (error) {
      console.error('Error removing tier:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'No message',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      
      // Fallback to old method if RPC doesn't exist
      if ((error as any)?.code === 'PGRST202' || (error as any)?.code === '42883' || (error as any)?.message?.includes('does not exist') || (error as any)?.message?.includes('no matches were found')) {
        console.log('RPC function does not exist, using fallback method for remove tier');
        try {
          await removeTierFallback(tierNumber);
          await loadWeeklySchedule(currentWeek);
          console.log('Fallback method completed successfully');
        } catch (fallbackError) {
          console.error('Fallback method failed:', fallbackError);
          alert(`Failed to remove tier: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'}`);
        }
      } else {
        alert(`Failed to remove tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await loadWeeklySchedule(currentWeek); // Reload to fix any inconsistencies
      }
    }
  };

  // Fallback method for remove tier (original implementation)
  const removeTierFallback = async (tierNumber: number) => {
    // 1. Delete tier from current week and all future weeks
    const { error: deleteError } = await supabase
      .from('weekly_schedules')
      .delete()
      .eq('league_id', parseInt(leagueId))
      .gte('week_number', currentWeek)
      .eq('tier_number', tierNumber);
    
    if (deleteError) throw deleteError;
    
    // 2. Shift remaining tier numbers down using batched operations
    const { data: tiersToShift, error: fetchError } = await supabase
      .from('weekly_schedules')
      .select('id, tier_number')
      .eq('league_id', parseInt(leagueId))
      .gte('week_number', currentWeek)
      .gt('tier_number', tierNumber)
      .order('tier_number', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    // Use Promise.all to batch the updates
    const updatePromises = (tiersToShift || []).map(tier => 
      supabase
        .from('weekly_schedules')
        .update({ tier_number: tier.tier_number - 1 })
        .eq('id', tier.id)
    );
    
    const updateResults = await Promise.all(updatePromises);
    const updateErrors = updateResults.filter(result => result.error);
    
    if (updateErrors.length > 0) {
      throw new Error(`Failed to update ${updateErrors.length} tiers`);
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


  const handleWeeklyAddTeamToPosition = (tierIndex: number, position: string) => {
    setAddTeamModalData({ tierIndex, position });
    setAddTeamModalOpen(true);
  };

  const handleAddTeamToSchedule = async (teamName: string, tierIndex: number, position: string) => {
    try {
      // First, get the team's ranking from the schedule data
      let teamRanking: number | null = null;
      
      try {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('league_schedules')
          .select('schedule_data')
          .eq('league_id', parseInt(leagueId))
          .maybeSingle();

        if (scheduleError && scheduleError.code !== 'PGRST116') {
          console.warn('Error loading schedule data for ranking:', scheduleError);
        } else if (scheduleData?.schedule_data?.tiers) {
          // Find the team's ranking in the schedule data
          for (const tier of scheduleData.schedule_data.tiers) {
            if (tier.teams) {
              for (const teamData of Object.values(tier.teams)) {
                if (teamData && (teamData as any).name === teamName && (teamData as any).ranking) {
                  teamRanking = (teamData as any).ranking;
                  break;
                }
              }
            }
            if (teamRanking) break;
          }
        }
      } catch (err) {
        console.warn('Error fetching team ranking:', err);
      }

      // If no ranking found in schedule data, try to determine from standings position
      if (teamRanking === null) {
        try {
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, name, created_at')
            .eq('league_id', parseInt(leagueId))
            .eq('active', true)
            .order('created_at', { ascending: true });

          if (!teamsError && teamsData) {
            const teamIndex = teamsData.findIndex(team => team.name === teamName);
            if (teamIndex !== -1) {
              teamRanking = teamIndex + 1; // 1-based ranking
            }
          }
        } catch (err) {
          console.warn('Error calculating team ranking from standings:', err);
        }
      }

      // Update the weekly schedule with the new team
      const updatedTiers = [...weeklyTiers];
      const positionKey = `team_${position.toLowerCase()}_name` as 'team_a_name' | 'team_b_name' | 'team_c_name';
      const rankingKey = `team_${position.toLowerCase()}_ranking` as 'team_a_ranking' | 'team_b_ranking' | 'team_c_ranking';
      
      updatedTiers[tierIndex] = {
        ...updatedTiers[tierIndex],
        [positionKey]: teamName,
        [rankingKey]: teamRanking
      };

      // Save to database
      const { error } = await supabase
        .from('weekly_schedules')
        .update({
          [positionKey]: teamName,
          [rankingKey]: teamRanking,
          updated_at: new Date().toISOString()
        })
        .eq('league_id', parseInt(leagueId))
        .eq('week_number', currentWeek)
        .eq('tier_number', tierIndex + 1);

      if (error) throw error;

      // Update local state
      setWeeklyTiers(updatedTiers);
      
      // Close modal
      setAddTeamModalOpen(false);
      setAddTeamModalData(null);
      
      console.log(`Added team ${teamName} to Tier ${tierIndex + 1}, Position ${position} with ranking ${teamRanking}`);
    } catch (error) {
      console.error('Error adding team to schedule:', error);
      alert('Failed to add team to schedule. Please try again.');
    }
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
                      onClick={() => addTier(tier.tier_number - 1)}
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
                          onClick={() => removeTier(tier.tier_number)}
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
                  <div className={`grid ${getGridColsClass(getTeamCountForFormat(tier.format || '3-teams-6-sets'))} gap-4`}>
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
                    
                    {/* Team C Position - Only show for 3+ team formats */}
                    {getTeamCountForFormat(tier.format || '3-teams-6-sets') >= 3 && (
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
                    )}
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
                    onClick={() => addTier(weeklyTiers.length > 0 ? Math.max(...weeklyTiers.map(t => t.tier_number)) : 0)}
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
      {addTeamModalOpen && addTeamModalData && (
        <AddTeamModal
          isOpen={addTeamModalOpen}
          onClose={() => {
            setAddTeamModalOpen(false);
            setAddTeamModalData(null);
          }}
          leagueId={leagueId}
          currentWeek={currentWeek}
          tierIndex={addTeamModalData.tierIndex}
          position={addTeamModalData.position}
          onAddTeam={handleAddTeamToSchedule}
        />
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

      {/* REMOVED: Old tier removal modal - now using simple confirm() */}

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