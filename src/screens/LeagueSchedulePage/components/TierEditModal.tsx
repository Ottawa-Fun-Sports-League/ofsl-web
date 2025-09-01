import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { supabase } from '../../../lib/supabase';
import type { Tier } from '../../LeagueDetailPage/utils/leagueUtils';
import { GAME_FORMATS, getPositionsForFormat } from '../constants/formats';

interface TierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: Tier;
  tierIndex: number;
  allTiers: Tier[];
  leagueId: string;
  leagueName: string;
  onSave: (updatedTiers: Tier[], setAsDefaultInfo?: {location: boolean, time: boolean, court: boolean}, updatedTier?: Tier) => Promise<void>;
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

// Simple validation: prevent format changes that would remove teams
const validateFormatChange = (tier: Tier, newFormat: string): { isValid: boolean; reason?: string } => {
  const newPositions = getPositionsForFormat(newFormat);
  
  // Find occupied positions that would be removed
  const occupiedPositions: string[] = [];
  Object.entries(tier.teams).forEach(([position, team]) => {
    if (team && team.name) {
      occupiedPositions.push(position);
    }
  });
  
  const positionsToRemove = occupiedPositions.filter(pos => !newPositions.includes(pos));
  
  if (positionsToRemove.length > 0) {
    const teamsToRemove = positionsToRemove.map(pos => tier.teams[pos]?.name).filter(Boolean);
    return {
      isValid: false,
      reason: `Cannot change to this format because it would remove teams: ${teamsToRemove.join(', ')}. Please remove these teams first.`
    };
  }
  
  return { isValid: true };
};

export function TierEditModal({ isOpen, onClose, tier, tierIndex, allTiers, leagueId, leagueName, onSave }: TierEditModalProps) {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<DefaultSettings>({ location: '', time: '', court: '' });
  
  const [editValues, setEditValues] = useState({
    location: tier.location,
    time: tier.time,
    court: tier.court,
    customTime: '',
    format: tier.format || '3-teams-6-sets'
  });
  
  const [setAsDefault, setSetAsDefault] = useState({
    location: false,
    time: false,
    court: false
  });
  
  const [formatValidation, setFormatValidation] = useState<{ isValid: boolean; reason?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGyms();
      loadDefaults();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setEditValues({
        location: tier.location,
        time: tier.time,
        court: tier.court,
        customTime: TIME_PRESETS.includes(tier.time) ? '' : tier.time,
        format: tier.format || '3-teams-6-sets'
      });
      setSetAsDefault({ location: false, time: false, court: false });
    }
  }, [isOpen, tier]);

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
        const tierNumber = tier.tierNumber?.toString() || (tierIndex + 1).toString();
        const tierSpecificDefaults = data.defaults[tierNumber] || {};
        
        setDefaults({
          location: tierSpecificDefaults.location || '',
          time: tierSpecificDefaults.time || '',
          court: tierSpecificDefaults.court || ''
        });
      } else {
        setDefaults({ location: '', time: '', court: '' });
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
    }
  };

  const saveDefaults = async (newDefaults: DefaultSettings) => {
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('league_schedules')
        .select('defaults')
        .eq('league_id', parseInt(leagueId))
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const allDefaults = currentData?.defaults || {};
      const tierNumber = tier.tierNumber?.toString() || (tierIndex + 1).toString();
      
      allDefaults[tierNumber] = {
        location: newDefaults.location || '',
        time: newDefaults.time || '',
        court: newDefaults.court || ''
      };

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
      const finalTime = editValues.time === 'Custom' ? editValues.customTime : editValues.time;
      
      // Validate format change
      if (editValues.format !== (tier.format || '3-teams-6-sets')) {
        const validation = validateFormatChange(tier, editValues.format);
        if (!validation.isValid) {
          throw new Error(validation.reason || 'Format change not allowed');
        }
      }
      
      // Create updated tier
      const updatedTier: Tier = {
        ...tier,
        location: editValues.location,
        time: finalTime,
        court: editValues.court,
        format: editValues.format
      };

      // Update the tiers array
      const finalTiers = [...allTiers];
      finalTiers[tierIndex] = updatedTier;

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
      alert(error instanceof Error ? error.message : 'Failed to save tier changes');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (value: string) => {
    setEditValues(prev => ({ ...prev, time: value }));
  };
  
  const handleFormatChange = (newFormat: string) => {
    const validation = validateFormatChange(tier, newFormat);
    setFormatValidation(validation);
    
    if (validation.isValid) {
      setEditValues(prev => ({ ...prev, format: newFormat }));
    }
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
                onChange={(e) => handleFormatChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                <option value="">Select format...</option>
                {GAME_FORMATS.map((format) => {
                  const validation = validateFormatChange(tier, format.value);
                  const isDisabled = !validation.isValid;
                  
                  return (
                    <option 
                      key={format.value} 
                      value={format.value}
                      disabled={isDisabled}
                      style={isDisabled ? { color: '#999', backgroundColor: '#f5f5f5' } : {}}
                    >
                      {format.label} {isDisabled ? '(incompatible)' : ''}
                    </option>
                  );
                })}
              </select>
              
              {/* Format validation message */}
              {formatValidation && !formatValidation.isValid && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Format change not allowed</p>
                      <p className="mt-1">{formatValidation.reason}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Current tier team information */}
              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-600 mb-1">Current tier teams:</div>
                {Object.entries(tier.teams).map(([position, team]) => {
                  if (team && team.name) {
                    const newPositions = getPositionsForFormat(editValues.format);
                    const willBeRemoved = !newPositions.includes(position);
                    
                    return (
                      <div key={position} className={`text-xs ${willBeRemoved ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                        Position {position}: {team.name} {willBeRemoved ? '(would be removed)' : ''}
                      </div>
                    );
                  }
                  return null;
                }).filter(Boolean).length === 0 && (
                  <div className="text-xs text-gray-500">No teams assigned</div>
                )}
              </div>
              
              <div className="mt-1 text-xs text-gray-500">
                Format changes are only allowed if they don't interfere with existing team assignments.
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