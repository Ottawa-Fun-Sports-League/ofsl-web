import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';
import { AlertCircle, Users, Phone, Mail, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import {
  GENDER_OPTIONS,
  VOLLEYBALL_POSITIONS,
  getSportBranding
} from './sparesOptions';

interface Sport {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

interface Skill {
  id: number;
  name: string;
  description: string;
}

interface SparesSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  sportFilter?: string; // Optional filter to show only specific sport
  onSuccess?: () => void;
}

export const SparesSignupModal: React.FC<SparesSignupModalProps> = ({ 
  isOpen,
  onClose,
  sportFilter,
  onSuccess 
}) => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [availability, setAvailability] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
  });
  const [sharePhone, setSharePhone] = useState<boolean>(false);
  const [genderIdentity, setGenderIdentity] = useState<string>('');
  const [genderIdentityOther, setGenderIdentityOther] = useState<string>('');
  const [volleyballPositions, setVolleyballPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [existingRegistrations, setExistingRegistrations] = useState<number[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSport('');
      setSkillLevel('');
      setAvailability({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      });
      setSharePhone(false);
      setLoading(false);
      setGenderIdentity('');
      setGenderIdentityOther('');
      setVolleyballPositions([]);
    }
  }, [isOpen]);

  // Fetch active sports on component mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchSports = async () => {
      try {
        const { data, error } = await supabase
          .from('sports')
          .select('id, name, description, active')
          .eq('active', true)
          .order('name');

        if (error) {
          logger.error('Error fetching sports', error);
          showToast('Failed to load sports. Please try again.', 'error');
          return;
        }

        let filteredSports = data || [];
        
        // Apply sport filter if provided
        if (sportFilter) {
          filteredSports = filteredSports.filter(sport => 
            sport.name.toLowerCase() === sportFilter.toLowerCase()
          );
        }

        setSports(filteredSports);
        
        // Auto-select sport if only one option
        if (filteredSports.length === 1) {
          setSelectedSport(filteredSports[0].id.toString());
        }
      } catch (error) {
        logger.error('Error in fetchSports', error);
        showToast('Failed to load sports. Please try again.', 'error');
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, [isOpen, showToast, sportFilter]);

  // Fetch skills on component mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchSkills = async () => {
      try {
        const { data, error } = await supabase
          .from('skills')
          .select('id, name, description')
          .order('order_index');

        if (error) {
          logger.error('Error fetching skills', error);
          showToast('Failed to load skill levels. Please try again.', 'error');
          return;
        }

        setSkills(data || []);
      } catch (error) {
        logger.error('Error in fetchSkills', error);
        showToast('Failed to load skill levels. Please try again.', 'error');
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, [isOpen, showToast]);

  // Fetch existing spare registrations for this user
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchExistingRegistrations = async () => {
      try {
        const { data, error } = await supabase
          .from('spares')
          .select('sport_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) {
          logger.error('Error fetching existing registrations', error);
          return;
        }

        setExistingRegistrations(data?.map(reg => reg.sport_id) || []);
      } catch (error) {
        logger.error('Error in fetchExistingRegistrations', error);
      }
    };

    fetchExistingRegistrations();
  }, [isOpen, user]);

  useEffect(() => {
    if (!selectedSport) {
      setVolleyballPositions([]);
      return;
    }

    const sport = sports.find((item) => item.id.toString() === selectedSport);
    if (!sport || sport.name.toLowerCase() !== 'volleyball') {
      setVolleyballPositions([]);
    }
  }, [selectedSport, sports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showToast('Please log in to join the spares list', 'error');
      return;
    }

    if (!selectedSport) {
      showToast('Please select a sport', 'error');
      return;
    }

    if (!skillLevel) {
      showToast('Please select your skill level', 'error');
      return;
    }

    const sportId = parseInt(selectedSport);
    const sportRecord = sports.find((sport) => sport.id === sportId);
    const isVolleyball = sportRecord?.name?.toLowerCase() === 'volleyball';

    // Check if user already registered for this sport
    if (existingRegistrations.includes(sportId)) {
      showToast('You are already registered as a spare for this sport', 'error');
      return;
    }

    if (isVolleyball && volleyballPositions.length === 0) {
      showToast('Select at least one volleyball position you play.', 'error');
      return;
    }

    if (genderIdentity === 'self-described' && !genderIdentityOther.trim()) {
      showToast('Please add a quick note about how you describe your gender.', 'error');
      return;
    }

    setLoading(true);

    try {
      // Use the helper function from the migration with availability days and optional demographics
      const payload: Record<string, unknown> = {
        p_sport_id: sportId,
        p_skill_level: skillLevel,
        p_share_phone: sharePhone,
        p_available_monday: availability.monday,
        p_available_tuesday: availability.tuesday,
        p_available_wednesday: availability.wednesday,
        p_available_thursday: availability.thursday,
        p_available_friday: availability.friday,
        p_available_saturday: availability.saturday,
        p_available_sunday: availability.sunday
      };

      if (genderIdentity) {
        payload.p_gender_identity = genderIdentity;
        if (genderIdentity === 'self-described') {
          payload.p_gender_identity_other = genderIdentityOther.trim();
        }
      }

      if (isVolleyball && volleyballPositions.length > 0) {
        payload.p_volleyball_positions = volleyballPositions;
      }

      const { error } = await supabase.rpc('register_spare', payload);

      if (error) {
        logger.error('Error registering as spare', error);
        showToast('Failed to join spares list. Please try again.', 'error');
        return;
      }

      // Update existing registrations
      setExistingRegistrations(prev => [...prev, sportId]);
      
      const selectedSportName = sportRecord?.name || 'this sport';
      showToast(`Successfully joined the ${selectedSportName} spares list! Team captains can now contact you.`, 'success');

      setGenderIdentity('');
      setGenderIdentityOther('');
      setVolleyballPositions([]);
      
      // Call success callback and wait for parent to refresh data
      if (onSuccess) {
        onSuccess();
      }
      
      // Small delay to ensure the parent component refreshes before closing modal
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      logger.error('Error in handleSubmit', error);
      showToast('Failed to join spares list. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedSportRecord = selectedSport
    ? sports.find((sport) => sport.id.toString() === selectedSport)
    : undefined;
  const isVolleyballSelected = selectedSportRecord?.name?.toLowerCase() === 'volleyball';
  const sportBranding = selectedSportRecord ? getSportBranding(selectedSportRecord.name) : null;

  const toggleVolleyballPosition = (position: string) => {
    setVolleyballPositions((prev) =>
      prev.includes(position)
        ? prev.filter((value) => value !== position)
        : [...prev, position]
    );
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#6F6F6F]">Join Spares List</h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-[#B20000] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#6F6F6F] mb-2">
              Login Required
            </h3>
            <p className="text-[#6F6F6F] mb-6">
              Please log in to join the spares list and make your contact information available to team captains.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => {
                  onClose();
                  window.location.hash = '#/login';
                }}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white"
              >
                Log In
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  window.location.hash = '#/signup';
                }}
                variant="outline"
                className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#6F6F6F] flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join Spares List
              </h2>
              <p className="text-sm text-[#6F6F6F] mt-1">
                Join the spares list to be contacted by team captains who need substitute players.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Privacy Notice</h4>
                <p className="text-sm text-blue-800">
                  By joining the spares list, you consent to share your contact information 
                  (name, phone, email) with team captains in the selected sport. You can 
                  remove yourself from the list at any time in your account settings.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Info Display */}
          {userProfile && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-[#6F6F6F] mb-3">Contact Information to Share:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-[#6F6F6F]" />
                  <span>{userProfile.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-[#6F6F6F]" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-[#6F6F6F]" />
                  <span>{userProfile.phone || 'No phone number provided'}</span>
                </div>
              </div>
              {!userProfile.phone && (
                <p className="text-xs text-[#B20000] mt-2">
                  Consider adding a phone number to your profile for better contact options.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sport Selection - only show if not filtered */}
            {!sportFilter && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#6F6F6F] mb-2" htmlFor="sport-select">Select Sport *</label>
                {loadingSports ? (
                  <div className="h-10 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <select
                    id="sport-select"
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    disabled={loading}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
                  >
                    <option value="">Choose a sport...</option>
                    {sports.map((sport) => (
                      <option 
                        key={sport.id} 
                        value={sport.id}
                        disabled={existingRegistrations.includes(sport.id)}
                      >
                        {sport.name}
                        {existingRegistrations.includes(sport.id) && ' - Already registered'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {selectedSportRecord && sportBranding && (
              <div className={`rounded-lg border ${sportBranding.border} ${sportBranding.background} p-4 flex flex-col gap-3`}>
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-4 w-4 ${sportBranding.accent}`} />
                  <span className={`inline-flex items-center rounded-full border ${sportBranding.border} ${sportBranding.background} ${sportBranding.accent} px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>
                    {selectedSportRecord.name}
                  </span>
                </div>
                <p className={`text-sm ${sportBranding.text}`}>
                  {selectedSportRecord.description || 'Stay ready to jump in when a team needs a spare.'}
                </p>
              </div>
            )}

            {/* Skill Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2" htmlFor="skill-level">Your Skill Level *</label>
              {loadingSkills ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              ) : (
                <select
                  id="skill-level"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  disabled={loading}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
                >
                  <option value="">Select your skill level...</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.name.toLowerCase()}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isVolleyballSelected && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-sm font-medium text-[#6F6F6F]">
                    Volleyball positions *
                  </label>
                  <span className="text-xs text-[#6F6F6F]">Tap all that apply</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VOLLEYBALL_POSITIONS.map((option) => {
                    const isSelected = volleyballPositions.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleVolleyballPosition(option.value)}
                        disabled={loading}
                        className={`rounded-full border px-3 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-400 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-[#6F6F6F] hover:border-orange-300 hover:text-orange-600'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2" htmlFor="gender-identity-modal">
                Gender Identity (Optional)
              </label>
              <select
                id="gender-identity-modal"
                value={genderIdentity}
                onChange={(e) => {
                  const value = e.target.value;
                  setGenderIdentity(value);
                  if (value !== 'self-described') {
                    setGenderIdentityOther('');
                  }
                }}
                disabled={loading}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value || 'unspecified'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {genderIdentity === 'self-described' && (
                <input
                  id="gender-identity-modal-other"
                  value={genderIdentityOther}
                  onChange={(e) => setGenderIdentityOther(e.target.value)}
                  disabled={loading}
                  placeholder="How do you describe your gender?"
                  maxLength={160}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
                />
              )}
            </div>

            {/* Availability Days */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Availability *
              </label>
              <p className="text-xs text-[#6F6F6F] mb-3">
                Select the days you&apos;re typically available to play as a spare
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries({
                  monday: 'Monday',
                  tuesday: 'Tuesday',
                  wednesday: 'Wednesday',
                  thursday: 'Thursday',
                  friday: 'Friday',
                  saturday: 'Saturday',
                  sunday: 'Sunday'
                }).map(([day, label]) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={availability[day as keyof typeof availability]}
                      onChange={(e) => setAvailability(prev => ({
                        ...prev,
                        [day]: e.target.checked
                      }))}
                      disabled={loading}
                      className="h-4 w-4 text-[#B20000] focus:ring-[#B20000] border-gray-300 rounded"
                    />
                    <span className="text-sm text-[#6F6F6F]">{label}</span>
                  </label>
                ))}
              </div>
              {Object.values(availability).every(v => !v) && (
                <p className="text-xs text-orange-600 mt-2">
                  Please select at least one day when you&apos;re available
                </p>
              )}
            </div>

            {/* Phone Number Sharing */}
            <div className="space-y-2">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="share-phone"
                    checked={sharePhone}
                    onChange={(e) => setSharePhone(e.target.checked)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 text-[#B20000] focus:ring-[#B20000] border-gray-300 rounded"
                  />
                  <div>
                    <label htmlFor="share-phone" className="block text-sm font-medium text-orange-900 mb-1">
                      Share my phone number with team captains
                    </label>
                    <p className="text-xs text-orange-800">
                      {sharePhone 
                        ? "✓ Your phone number will be visible to team captains in this sport so they can contact you directly."
                        : "Your phone number will not be shared. Team captains can still contact you via email."
                      }
                    </p>
                    {!userProfile?.phone && (
                      <p className="text-xs text-orange-700 mt-1">
                        Note: You don&apos;t have a phone number in your profile. Add one in your account settings to enable this option.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !selectedSport ||
                  !skillLevel ||
                  Object.values(availability).every(v => !v) ||
                  (isVolleyballSelected && volleyballPositions.length === 0) ||
                  (genderIdentity === 'self-described' && !genderIdentityOther.trim())
                }
                className="flex-1 bg-[#B20000] hover:bg-[#8A0000] text-white"
              >
                {loading ? 'Joining...' : 'Join Spares List'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
