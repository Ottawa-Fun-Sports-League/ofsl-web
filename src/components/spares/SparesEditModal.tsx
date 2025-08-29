import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';
import { AlertCircle, Users, Phone, Mail, X, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface Skill {
  id: number;
  name: string;
  description: string;
}

interface SparesRegistration {
  id: string;
  user_id: string;
  sport_id: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'competitive' | 'elite';
  availability_notes: string | null;
  share_phone: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sports: {
    id: number;
    name: string;
    description: string;
    active: boolean;
  };
}

interface SparesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: SparesRegistration | null;
  onSuccess?: () => void;
}

export const SparesEditModal: React.FC<SparesEditModalProps> = ({ 
  isOpen,
  onClose,
  registration,
  onSuccess 
}) => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [availabilityNotes, setAvailabilityNotes] = useState<string>('');
  const [sharePhone, setSharePhone] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(true);

  // Initialize form with registration data
  useEffect(() => {
    if (isOpen && registration) {
      setSkillLevel(registration.skill_level);
      setAvailabilityNotes(registration.availability_notes || '');
      setSharePhone(registration.share_phone);
    } else if (!isOpen) {
      // Reset form when modal closes
      setSkillLevel('');
      setAvailabilityNotes('');
      setSharePhone(false);
      setLoading(false);
    }
  }, [isOpen, registration]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !registration) {
      showToast('Registration not found', 'error');
      return;
    }

    if (!skillLevel) {
      showToast('Please select your skill level', 'error');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Updating registration:', {
        id: registration.id,
        skill_level: skillLevel,
        availability_notes: availabilityNotes.trim() || null,
        share_phone: sharePhone
      });

      // Update the registration directly - let RLS handle user verification
      const { data, error } = await supabase
        .from('spares')
        .update({
          skill_level: skillLevel,
          availability_notes: availabilityNotes.trim() || null,
          share_phone: sharePhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', registration.id)
        .select();

      console.log('📝 Update registration result:', { data, error });

      if (error) {
        logger.error('Error updating spare registration', error);
        showToast('Failed to update registration. Please try again.', 'error');
        return;
      }

      showToast(`Successfully updated your ${registration.sports.name} spares registration!`, 'success');
      
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
      showToast('Failed to update registration. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !registration) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#6F6F6F]">Edit Spares Registration</h2>
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
              Please log in to edit your spares registration.
            </p>
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
                <Edit className="h-5 w-5" />
                Edit {registration.sports.name} Registration
              </h2>
              <p className="text-sm text-[#6F6F6F] mt-1">
                Update your spares list registration preferences.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact Info Display */}
          {userProfile && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-[#6F6F6F] mb-3">Your Contact Information:</h4>
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
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sport Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-1">Sport</h4>
              <p className="text-blue-800">{registration.sports.name}</p>
              <p className="text-xs text-blue-700 mt-1">Sport cannot be changed. Create a new registration for other sports.</p>
            </div>

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

            {/* Availability Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2" htmlFor="availability-notes">
                Availability Notes (Optional)
              </label>
              <textarea
                id="availability-notes"
                placeholder="e.g., Available Tuesday evenings and weekends, prefer competitive level games..."
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                disabled={loading}
                rows={3}
                maxLength={500}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent resize-y"
              />
              <p className="text-xs text-[#6F6F6F]">
                {availabilityNotes.length}/500 characters
              </p>
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
                        Note: You don't have a phone number in your profile. Add one in your account settings to enable this option.
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
                disabled={loading || !skillLevel}
                className="flex-1 bg-[#B20000] hover:bg-[#8A0000] text-white"
              >
                {loading ? 'Updating...' : 'Update Registration'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};