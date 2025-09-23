import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { supabase } from '../../../lib/supabase';
import type { Tier } from '../../LeagueDetailPage/utils/leagueUtils';
import type { FormatValidationResult } from '../types';
import { GAME_FORMATS, getPositionsForFormat, getTierDisplayLabel, isFormatDisabled } from '../utils/formatUtils';
import { validateFormatChangeCompat, repackTeamsForFormatCompat } from '../utils/scheduleLogic';

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
  '6:00pm-8:00pm',
  '6:30pm-8:00pm', 
  '8:00pm-10:00pm',
  '8:30pm-10:00pm',
  'Custom'
];

const COURT_PRESETS = [
  'Court 1',
  'Court 2',
  'Court 3',
  'CUSTOM'
];


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
  
  // Custom time structured inputs (for consistent formatting)
  const [startHour, setStartHour] = useState<string>('');
  const [startMinute, setStartMinute] = useState<string>('');
  const [endHour, setEndHour] = useState<string>('');
  const [endMinute, setEndMinute] = useState<string>('');
  const [startMeridiem, setStartMeridiem] = useState<'am' | 'pm'>('pm');
  const [endMeridiem, setEndMeridiem] = useState<'am' | 'pm'>('pm');
  
  const [setAsDefault, setSetAsDefault] = useState({
    location: false,
    time: false,
    court: false
  });
  
  const [formatValidation, setFormatValidation] = useState<FormatValidationResult | null>(null);
  const [previewTeams, setPreviewTeams] = useState<typeof tier.teams | null>(null);

  // Treat placeholders like 'TBD' as unset
  const isUnsetCourt = (val: string) => {
    const t = (val || '').trim().toUpperCase();
    return t === '' || t === 'TBD' || t === 'TBA';
  };
  // Dropdown selection state for court: '', preset, or 'CUSTOM'
  const [courtSelection, setCourtSelection] = useState<'' | 'Court 1' | 'Court 2' | 'Court 3' | 'CUSTOM'>('');

  // When modal opens or tier changes, initialize selection from tier value
  useEffect(() => {
    const v = (tier.court || '').trim();
    if (isUnsetCourt(v)) {
      setCourtSelection('');
    } else if ((COURT_PRESETS as readonly string[]).includes(v)) {
      setCourtSelection(v as any);
    } else {
      // Existing non-preset value: select CUSTOM and show text input with saved value
      setCourtSelection('CUSTOM');
    }
  }, [isOpen, tier.court]);

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

  const loadDefaults = useCallback(async () => {
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
  }, [leagueId, tier.tierNumber, tierIndex]);

  useEffect(() => {
    if (isOpen) {
      loadGyms();
      loadDefaults();
    }
  }, [isOpen, loadDefaults]);

  useEffect(() => {
    if (isOpen) {
      setEditValues({
        location: tier.location,
        time: tier.time,
        court: tier.court,
        customTime: TIME_PRESETS.includes(tier.time) ? '' : tier.time,
        format: tier.format || '3-teams-6-sets'
      });
      // Initialize custom time fields from tier.time if it's not a preset
      const timeToParse = TIME_PRESETS.includes(tier.time) ? '' : (tier.time || '');
      if (timeToParse) {
        const parsed = parseCustomTime(timeToParse);
        if (parsed) {
          setStartHour(parsed.sh);
          setStartMinute(parsed.sm);
          setEndHour(parsed.eh);
          setEndMinute(parsed.em);
          setStartMeridiem(parsed.startMer);
          setEndMeridiem(parsed.endMer);
        }
      } else {
        // Default values
        setStartHour('6');
        setStartMinute('00');
        setEndHour('8');
        setEndMinute('00');
        setStartMeridiem('pm');
        setEndMeridiem('pm');
      }
      setSetAsDefault({ location: false, time: false, court: false });
      setFormatValidation(null);
      setPreviewTeams(null);
    }
  }, [isOpen, tier]);

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
        const validation = validateFormatChangeCompat(tier, editValues.format);
        if (!validation.isValid) {
          throw new Error(validation.reason || 'Format change not allowed');
        }
      }
      
      // Apply team repacking if format changed
      let updatedTeams = tier.teams;
      if (editValues.format !== (tier.format || '3-teams-6-sets')) {
        updatedTeams = repackTeamsForFormatCompat(tier, editValues.format);
      }
      
      // Create updated tier
      const updatedTier: Tier = {
        ...tier,
        location: editValues.location,
        time: finalTime,
        court: editValues.court,
        format: editValues.format,
        teams: updatedTeams
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
    if (value === 'Custom') {
      // Ensure custom fields are reflected in the string immediately
      const assembled = assembleCustomTime(startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem);
      setEditValues(prev => ({ ...prev, customTime: assembled }));
    }
  };
  
  const handleFormatChange = (newFormat: string) => {
    const validation = validateFormatChangeCompat(tier, newFormat);
    setFormatValidation(validation);
    
    if (validation.isValid) {
      const repackedTeams = repackTeamsForFormatCompat(tier, newFormat);
      setEditValues(prev => ({ ...prev, format: newFormat }));
      setPreviewTeams(repackedTeams);
    } else {
      setPreviewTeams(null);
    }
  };

  const getAllGymNames = () => {
    return gyms.map(gym => gym.gym).sort();
  };

  // Helpers to parse/assemble the standardized custom time
  function parseCustomTime(s: string): { sh: string; sm: string; startMer: 'am'|'pm'; eh: string; em: string; endMer: 'am'|'pm' } | null {
    const trimmed = s.trim();
    // Pattern 1: 6:00am-8:30pm
    let m = trimmed.match(/^(\d{1,2}):(\d{2})(am|pm)-(\d{1,2}):(\d{2})(am|pm)$/i);
    if (m) {
      const [, sh, sm, sMer, eh, em, eMer] = m;
      return {
        sh: String(Number(sh)),
        sm,
        startMer: sMer.toLowerCase() as 'am'|'pm',
        eh: String(Number(eh)),
        em,
        endMer: eMer.toLowerCase() as 'am'|'pm'
      };
    }
    // Pattern 2: 6:00-8:30pm (apply same meridiem to both)
    m = trimmed.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})(am|pm)$/i);
    if (m) {
      const [, sh, sm, eh, em, mer] = m;
      const merLower = mer.toLowerCase() as 'am'|'pm';
      return {
        sh: String(Number(sh)),
        sm,
        startMer: merLower,
        eh: String(Number(eh)),
        em,
        endMer: merLower
      };
    }
    return null;
  }

  function assembleCustomTime(sh: string, sm: string, sMer: 'am'|'pm', eh: string, em: string, eMer: 'am' | 'pm'): string {
    const pad2 = (v: string) => (v.length === 1 ? `0${v}` : v);
    const cleanHour = (v: string) => String(Math.max(1, Math.min(12, Number(v) || 0)));
    const cleanMin = (v: string) => {
      const n = Number(v);
      if (Number.isNaN(n)) return '00';
      const clamped = Math.max(0, Math.min(59, n));
      return pad2(String(clamped));
    };
    const h1 = sh ? cleanHour(sh) : '6';
    const m1 = sm ? cleanMin(sm) : '00';
    const h2 = eh ? cleanHour(eh) : '8';
    const m2 = em ? cleanMin(em) : '00';
    return `${h1}:${m1}${sMer}-${h2}:${m2}${eMer}`;
  }

  const tierLabel = getTierDisplayLabel(tier.format ?? '', tier.tierNumber ?? null) || String(tier.tierNumber ?? '');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">
              Tier {tierLabel}: {leagueName}
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
                value={TIME_PRESETS.includes(editValues.time) ? editValues.time : ''}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                <option value="" disabled>SET TIME</option>
                {TIME_PRESETS.map((time) => (
                  <option key={time} value={time}>
                    {time === 'Custom' ? 'CUSTOM' : time}
                  </option>
                ))}
              </select>
              
              {editValues.time === 'Custom' && (
                <div className="mt-2 space-y-2">
                  {/* Structured time inputs */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start hour</label>
                      <Input
                        value={startHour}
                        inputMode="numeric"
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setStartHour(v);
                          setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(v, startMinute, startMeridiem, endHour, endMinute, endMeridiem) }));
                        }}
                        placeholder="6"
                        className="w-16"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start min</label>
                      <Input
                        value={startMinute}
                        inputMode="numeric"
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setStartMinute(v);
                          setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, v, startMeridiem, endHour, endMinute, endMeridiem) }));
                        }}
                        placeholder="00"
                        className="w-16"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start AM / PM</label>
                      <div className="flex items-center gap-3 py-2">
                        <label className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="start-meridiem"
                            checked={startMeridiem === 'am'}
                            onChange={() => {
                              setStartMeridiem('am');
                              setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, startMinute, 'am', endHour, endMinute, endMeridiem) }));
                            }}
                          />
                          am
                        </label>
                        <label className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="start-meridiem"
                            checked={startMeridiem === 'pm'}
                            onChange={() => {
                              setStartMeridiem('pm');
                              setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, startMinute, 'pm', endHour, endMinute, endMeridiem) }));
                            }}
                          />
                          pm
                        </label>
                      </div>
                    </div>
                    <div className="px-1 text-gray-500 pb-2">to</div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End hour</label>
                      <Input
                        value={endHour}
                        inputMode="numeric"
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setEndHour(v);
                          setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, startMinute, startMeridiem, v, endMinute, endMeridiem) }));
                        }}
                        placeholder="8"
                        className="w-16"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End min</label>
                      <Input
                        value={endMinute}
                        inputMode="numeric"
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setEndMinute(v);
                          setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, startMinute, startMeridiem, endHour, v, endMeridiem) }));
                        }}
                        placeholder="00"
                        className="w-16"
                      />
                    </div>
                    <div className="ml-2">
                      <label className="block text-xs text-gray-600 mb-1">End AM / PM</label>
                      <div className="flex items-center gap-3 py-2">
                        <label className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="end-meridiem"
                            checked={endMeridiem === 'am'}
                            onChange={() => {
                              setEndMeridiem('am');
                              setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, startMinute, startMeridiem, endHour, endMinute, 'am') }));
                            }}
                          />
                          am
                        </label>
                        <label className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="end-meridiem"
                            checked={endMeridiem === 'pm'}
                            onChange={() => {
                              setEndMeridiem('pm');
                              setEditValues(prev => ({ ...prev, customTime: assembleCustomTime(startHour, startMinute, startMeridiem, endHour, endMinute, 'pm') }));
                            }}
                          />
                          pm
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Formatted as: {assembleCustomTime(startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem)}</div>
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
              <select
                value={courtSelection}
                onChange={(e) => {
                  const v = e.target.value as typeof courtSelection;
                  setCourtSelection(v);
                  setEditValues(prev => {
                    if (v === 'CUSTOM') {
                      const prevVal = prev.court || '';
                      const keep = (COURT_PRESETS as readonly string[]).includes(prevVal) ? '' : prevVal;
                      return { ...prev, court: keep };
                    }
                    if (v === '') {
                      return { ...prev, court: '' };
                    }
                    return { ...prev, court: v };
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                <option value="" disabled>SET COURT</option>
                {COURT_PRESETS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {courtSelection === 'CUSTOM' && (
                <div className="mt-2">
                  <Input
                    value={editValues.court}
                    onChange={(e) => setEditValues(prev => ({ ...prev, court: e.target.value }))}
                    placeholder="Enter court (e.g., Court 1, Court A)"
                    className="w-full"
                  />
                </div>
              )}
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
                  const validation = validateFormatChangeCompat(tier, format.value);
                  const disabledGlobally = isFormatDisabled(format.value);
                  const isDisabled = disabledGlobally || !validation.isValid;
                  
                  return (
                    <option 
                      key={format.value} 
                      value={format.value}
                      disabled={isDisabled}
                      style={isDisabled ? { color: '#999', backgroundColor: '#f5f5f5' } : {}}
                    >
                      {format.label} {disabledGlobally ? '(unavailable)' : (!validation.isValid ? '(incompatible)' : '')}
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
              
              {/* Team preview */}
              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-600 mb-1">
                  {previewTeams ? 'Preview after format change:' : 'Current tier teams:'}
                </div>
                {(() => {
                  const teamsToShow = previewTeams || tier.teams;
                  const positions = getPositionsForFormat(editValues.format);
                  const hasTeams = positions.some(pos => teamsToShow[pos]?.name);
                  
                  if (!hasTeams) {
                    return <div className="text-xs text-gray-500">No teams assigned</div>;
                  }
                  
                  return positions.map(position => {
                    const team = teamsToShow[position];
                    if (team?.name) {
                      return (
                        <div key={position} className="text-xs text-gray-700">
                          Position {position}: {team.name}
                        </div>
                      );
                    }
                    return (
                      <div key={position} className="text-xs text-gray-400">
                        Position {position}: (empty)
                      </div>
                    );
                  });
                })()}
              </div>
              
              <div className="mt-1 text-xs text-gray-500">
                Format changes apply to current week and all future weeks. Past weeks remain unchanged.
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
