import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { supabase } from '../../../lib/supabase';
import type { Tier, Team } from '../../LeagueDetailPage/utils/leagueUtils';

interface TierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: Tier;
  tierIndex: number;
  allTiers: Tier[];
  leagueId: string;
  leagueName: string;
  onSave: (updatedSchedule: Tier[], setAsDefaultInfo?: {location: boolean, time: boolean, court: boolean}, updatedTier?: Tier) => Promise<void>;
}

interface Gym {
  id: number;
  gym: string;
  address: string;
  locations: string[];
}

interface DefaultSettings {
  location: string;
  time: string;
  court: string;
}

const TIME_PRESETS = [
  '6:00-8:00pm',
  '6:30-8:00pm', 
  '8:00-10:00pm',
  '8:30-10:00pm',
  'Custom'
];

const GAME_FORMATS = [
  { value: '3-teams-6-sets', label: '3 teams (6 sets)', teamCount: 3 },
  { value: '2-teams-4-sets', label: '2 teams (4 sets)', teamCount: 2 },
  { value: '2-teams-best-of-5', label: '2 teams (Best of 5)', teamCount: 2 },
  { value: '2-teams-best-of-3', label: '2 teams (Best of 3)', teamCount: 2 },
  { value: '4-teams-head-to-head', label: '4 teams (Head-to-head)', teamCount: 4 },
  { value: '6-teams-head-to-head', label: '6 teams (head-to-head)', teamCount: 6 },
  { value: '2-teams-elite', label: '2 teams (Elite)', teamCount: 2 },
];

const getTeamCountForFormat = (format: string): number => {
  const gameFormat = GAME_FORMATS.find(f => f.value === format);
  return gameFormat?.teamCount || 3; // Default to 3 teams if format not found
};


const redistributeTeams = (tiers: Tier[], changedTierIndex: number, newFormat: string, originalScheduleFormat: string | undefined): Tier[] => {
  console.log('=== TEAM REDISTRIBUTION DEBUG ===');
  console.log('Changed tier index:', changedTierIndex, 'New format:', newFormat);
  
  // Collect all teams from all tiers with their original rankings
  const allTeams: Array<{ name: string; ranking: number }> = [];
  const positions = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Gather all existing teams
  tiers.forEach((tier, tierIndex) => {
    Object.keys(tier.teams).forEach(position => {
      const team = tier.teams[position];
      if (team && team.name) {
        allTeams.push({ 
          name: team.name, 
          ranking: team.ranking || (tierIndex * 3 + positions.indexOf(position) + 1)
        });
      }
    });
  });
  
  // Sort teams by ranking to maintain competitive order
  allTeams.sort((a, b) => a.ranking - b.ranking);
  console.log('Total teams collected:', allTeams.length);
  console.log('Teams:', allTeams.map(t => `${t.name} (${t.ranking})`));
  
  // Create updated tiers with the format change
  const updatedTiers = tiers.map((tier, index) => ({
    ...tier,
    format: index === changedTierIndex ? newFormat : (tier.format || '3-teams-6-sets')
  }));
  
  // Calculate how many teams we can fit in existing tiers
  let totalCapacity = 0;
  updatedTiers.forEach((tier, index) => {
    const tierTeamCount = getTeamCountForFormat(tier.format!);
    totalCapacity += tierTeamCount;
    console.log(`Tier ${index + 1}: ${tier.format} = ${tierTeamCount} teams`);
  });
  
  console.log('Total capacity in existing tiers:', totalCapacity);
  console.log('Teams needing placement:', allTeams.length);
  
  // Add new tiers if we need more capacity
  while (totalCapacity < allTeams.length) {
    const newTierNumber = updatedTiers.length + 1;
    const newTeamCount = getTeamCountForFormat(originalScheduleFormat || '3-teams-6-sets');
    
    console.log(`Adding new Tier ${newTierNumber} with original schedule format ${originalScheduleFormat} (${newTeamCount} teams)`);
    
    const newTier = {
      tierNumber: newTierNumber,
      location: updatedTiers[0]?.location || 'TBD',
      time: updatedTiers[0]?.time || 'TBD', 
      court: updatedTiers[0]?.court || 'TBD',
      format: originalScheduleFormat || '3-teams-6-sets',
      teams: {} as Record<string, Team | null>,
      courts: {} as Record<string, string>
    };
    
    // Initialize all possible positions as null
    positions.forEach(position => {
      newTier.teams[position] = null;
      newTier.courts[position] = `Court ${newTierNumber}`;
    });
    
    updatedTiers.push(newTier);
    totalCapacity += newTeamCount;
  }
  
  console.log('Final tier count:', updatedTiers.length);
  console.log('Final total capacity:', totalCapacity);
  
  // Now redistribute all teams across all tiers
  let teamIndex = 0;
  
  updatedTiers.forEach((tier, tierIdx) => {
    const tierTeamCount = getTeamCountForFormat(tier.format!);
    console.log(`Filling Tier ${tierIdx + 1} (${tier.format}) with ${tierTeamCount} teams`);
    
    // Clear existing teams
    tier.teams = {};
    
    // Assign teams to positions A, B, C, etc.
    for (let i = 0; i < tierTeamCount && teamIndex < allTeams.length; i++) {
      const position = positions[i];
      tier.teams[position] = allTeams[teamIndex];
      console.log(`  ${position}: ${allTeams[teamIndex].name} (${allTeams[teamIndex].ranking})`);
      teamIndex++;
    }
    
    // Fill remaining positions with null
    for (let i = tierTeamCount; i < positions.length; i++) {
      const position = positions[i];
      tier.teams[position] = null;
    }
    
    // Ensure courts object is properly initialized
    if (!tier.courts || Object.keys(tier.courts).length === 0) {
      tier.courts = {};
      positions.forEach(pos => {
        tier.courts[pos] = tier.court || `Court ${tierIdx + 1}`;
      });
    }
  });
  
  // Only keep tiers that have at least one team
  const finalTiers = updatedTiers.filter(tier => {
    const hasTeams = Object.values(tier.teams).some(team => team?.name);
    if (!hasTeams) {
      console.log(`Removing empty Tier ${tier.tierNumber}`);
    }
    return hasTeams;
  });
  
  // Renumber tiers sequentially
  finalTiers.forEach((tier, index) => {
    tier.tierNumber = index + 1;
  });
  
  console.log('Final result: %s tiers with %s teams total', 
    finalTiers.length, 
    finalTiers.reduce((count, tier) => count + Object.values(tier.teams).filter(t => t?.name).length, 0)
  );
  console.log('=== END REDISTRIBUTION DEBUG ===');
  
  return finalTiers;
};

export function TierEditModal({ isOpen, onClose, tier, tierIndex, allTiers, leagueId, leagueName, onSave }: TierEditModalProps) {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [, _setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<DefaultSettings>({ location: '', time: '', court: '' });
  const [scheduleFormat, setScheduleFormat] = useState<string>('');
  
  const [editValues, setEditValues] = useState({
    location: tier.location,
    time: tier.time,
    court: tier.court,
    customTime: '',
    format: tier.format || ''
  });

  const [setAsDefault, setSetAsDefault] = useState({
    location: false,
    time: false,
    court: false
  });


  useEffect(() => {
    if (isOpen) {
      loadGyms();
      loadDefaults();
      loadScheduleFormat();
    }
  }, [isOpen]);

  // Separate effect to update form values when tier or scheduleFormat changes
  useEffect(() => {
    if (isOpen) {
      setEditValues({
        location: tier.location,
        time: tier.time,
        court: tier.court,
        customTime: TIME_PRESETS.includes(tier.time) ? '' : tier.time,
        format: tier.format || scheduleFormat || ''
      });
      setSetAsDefault({ location: false, time: false, court: false });
      
    }
  }, [isOpen, tier, scheduleFormat]);

  const loadGyms = async () => {
    try {
      const { data: gymsData, error } = await supabase
        .from('gyms')
        .select('id, gym, address, locations')
        .eq('active', true)
        .order('gym');

      if (error) throw error;
      if (gymsData) setGyms(gymsData);
    } catch (error) {
      console.error('Error loading gyms:', error);
    }
  };

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
        // Get tier-specific defaults for this tier only
        const tierNumber = tier.tierNumber?.toString() || (tierIndex + 1).toString();
        const tierSpecificDefaults = data.defaults[tierNumber] || {};
        
        setDefaults({
          location: tierSpecificDefaults.location || '',
          time: tierSpecificDefaults.time || '',
          court: tierSpecificDefaults.court || ''
        });
        
        console.log(`Loaded defaults for Tier ${tierNumber}:`, tierSpecificDefaults);
      } else {
        // If no defaults exist, ensure we start with blank values
        setDefaults({ location: '', time: '', court: '' });
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
    }
  };

  const loadScheduleFormat = async () => {
    try {
      const { data, error } = await supabase
        .from('league_schedules')
        .select('format')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading schedule format:', error);
      } else if (data?.format) {
        setScheduleFormat(data.format);
      }
    } catch (error) {
      console.error('Error loading schedule format:', error);
    }
  };


  const saveDefaults = async (newDefaults: DefaultSettings) => {
    try {
      // First, get the current all-tier defaults from the database
      const { data: currentData, error: fetchError } = await supabase
        .from('league_schedules')
        .select('defaults')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Get current all-tier defaults or start with empty object
      const allDefaults = currentData?.defaults || {};
      
      // Update only this tier's defaults
      const tierNumber = tier.tierNumber?.toString() || (tierIndex + 1).toString();
      allDefaults[tierNumber] = {
        location: newDefaults.location || '',
        time: newDefaults.time || '',
        court: newDefaults.court || ''
      };
      
      console.log(`Saving defaults for Tier ${tierNumber}:`, allDefaults[tierNumber]);
      console.log('All tier defaults:', allDefaults);

      // Save the updated all-tier defaults back to database
      const { error } = await supabase
        .from('league_schedules')
        .update({ 
          defaults: allDefaults,
          updated_at: new Date().toISOString()
        })
        .eq('league_id', parseInt(leagueId));

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tier-specific defaults:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Determine the final time value
      const finalTime = editValues.time === 'Custom' ? editValues.customTime : editValues.time;
      
      // Update this tier with new values
      const updatedTier: Tier = {
        ...tier,
        location: editValues.location,
        time: finalTime,
        court: editValues.court,
        format: editValues.format
      };

      // Apply the updated tier
      let workingTiers = [...allTiers];
      workingTiers[tierIndex] = updatedTier;

      // Check if format changed and requires team redistribution
      let finalTiers: Tier[];
      if (editValues.format !== (tier.format || scheduleFormat)) {
        // Format changed - redistribute teams
        finalTiers = redistributeTeams(workingTiers, tierIndex, editValues.format, scheduleFormat || '3-teams-6-sets');
      } else {
        // Format didn't change - use working tiers as-is
        finalTiers = workingTiers;
      }

      // Update defaults if requested
      const newDefaults = { ...defaults };
      if (setAsDefault.location) newDefaults.location = editValues.location;
      if (setAsDefault.time) newDefaults.time = finalTime;
      if (setAsDefault.court) newDefaults.court = editValues.court;

      // Save defaults if any were set
      if (setAsDefault.location || setAsDefault.time || setAsDefault.court) {
        await saveDefaults(newDefaults);
      }

      await onSave(finalTiers, setAsDefault, updatedTier);
      onClose();
    } catch (error) {
      console.error('Error saving tier:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (value: string) => {
    setEditValues(prev => ({ ...prev, time: value }));
  };


  const getAllGymNames = () => {
    return gyms.map(gym => gym.gym).sort();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">
              Tier {tier.tierNumber}: {leagueName}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Location
              </label>
              <select
                value={editValues.location}
                onChange={(e) => setEditValues(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                <option value="">Select gym...</option>
                {getAllGymNames().map((gymName) => (
                  <option key={gymName} value={gymName}>
                    {gymName}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={setAsDefault.location}
                    onChange={(e) => setSetAsDefault(prev => ({ ...prev, location: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">
                    Set as default location
                    {defaults.location && defaults.location.trim() !== '' && (
                      <span className="ml-2 text-gray-500">
                        (current: {defaults.location}
                        {setAsDefault.location && editValues.location && editValues.location !== defaults.location && (
                          <span className="text-[#B20000]"> → {editValues.location}</span>
                        )})
                      </span>
                    )}
                    {setAsDefault.location && editValues.location && (!defaults.location || defaults.location.trim() === '') && (
                      <span className="ml-2 text-[#B20000]">
                        (will set: {editValues.location})
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Time
              </label>
              <select
                value={TIME_PRESETS.includes(editValues.time) ? editValues.time : 'Custom'}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                {TIME_PRESETS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              
              {/* Custom time input */}
              {editValues.time === 'Custom' && (
                <div className="mt-2">
                  <Input
                    value={editValues.customTime}
                    onChange={(e) => setEditValues(prev => ({ ...prev, customTime: e.target.value }))}
                    placeholder="Enter custom time (e.g., 7:00-9:00pm)"
                    className="w-full"
                  />
                </div>
              )}
              
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={setAsDefault.time}
                    onChange={(e) => setSetAsDefault(prev => ({ ...prev, time: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">
                    Set as default time
                    {defaults.time && defaults.time.trim() !== '' && (
                      <span className="ml-2 text-gray-500">
                        (current: {defaults.time}
                        {setAsDefault.time && (() => {
                          const finalTime = editValues.time === 'Custom' ? editValues.customTime : editValues.time;
                          return finalTime && finalTime !== defaults.time && (
                            <span className="text-[#B20000]"> → {finalTime}</span>
                          );
                        })()})
                      </span>
                    )}
                    {setAsDefault.time && (() => {
                      const finalTime = editValues.time === 'Custom' ? editValues.customTime : editValues.time;
                      return finalTime && (!defaults.time || defaults.time.trim() === '') && (
                        <span className="ml-2 text-[#B20000]">
                          (will set: {finalTime})
                        </span>
                      );
                    })()}
                  </span>
                </label>
              </div>
            </div>

            {/* Court */}
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Court
              </label>
              <Input
                value={editValues.court}
                onChange={(e) => setEditValues(prev => ({ ...prev, court: e.target.value }))}
                placeholder="Enter court (e.g., Court 1, Court A)"
                className="w-full"
              />
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={setAsDefault.court}
                    onChange={(e) => setSetAsDefault(prev => ({ ...prev, court: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">
                    Set as default court
                    {defaults.court && defaults.court.trim() !== '' && (
                      <span className="ml-2 text-gray-500">
                        (current: {defaults.court}
                        {setAsDefault.court && editValues.court && editValues.court !== defaults.court && (
                          <span className="text-[#B20000]"> → {editValues.court}</span>
                        )})
                      </span>
                    )}
                    {setAsDefault.court && editValues.court && (!defaults.court || defaults.court.trim() === '') && (
                      <span className="ml-2 text-[#B20000]">
                        (will set: {editValues.court})
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Game Format
              </label>
              <select
                value={editValues.format}
                onChange={(e) => setEditValues(prev => ({ ...prev, format: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                <option value="">Select format...</option>
                {GAME_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500">
                This format applies only to this tier
              </div>
            </div>


          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#B20000] hover:bg-[#8A0000] text-white"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}