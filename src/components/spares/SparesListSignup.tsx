import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../ui/toast';
import { AlertCircle, Users, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface Sport {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

interface SparesListSignupProps {
  className?: string;
  sportFilter?: string; // Optional filter to show only specific sport
  onSuccess?: () => void;
}

export const SparesListSignup: React.FC<SparesListSignupProps> = ({ 
  className = '', 
  sportFilter,
  onSuccess 
}) => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [availabilityNotes, setAvailabilityNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [existingRegistrations, setExistingRegistrations] = useState<number[]>([]);

  // Fetch active sports on component mount
  useEffect(() => {
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
  }, [showToast, sportFilter]);

  // Fetch existing spare registrations for this user
  useEffect(() => {
    const fetchExistingRegistrations = async () => {
      if (!user) return;

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
  }, [user]);

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

    // Check if user already registered for this sport
    if (existingRegistrations.includes(sportId)) {
      showToast('You are already registered as a spare for this sport', 'error');
      return;
    }

    setLoading(true);

    try {
      // Use the helper function from the migration
      const { error } = await supabase.rpc('register_spare', {
        p_user_id: user.id,
        p_sport_id: sportId,
        p_skill_level: skillLevel,
        p_availability_notes: availabilityNotes.trim() || null
      });

      if (error) {
        logger.error('Error registering as spare', error);
        showToast('Failed to join spares list. Please try again.', 'error');
        return;
      }

      // Update existing registrations
      setExistingRegistrations(prev => [...prev, sportId]);
      
      // Reset form
      if (!sportFilter) {
        setSelectedSport('');
      }
      setSkillLevel('');
      setAvailabilityNotes('');

      const selectedSportName = sports.find(s => s.id === sportId)?.name || 'this sport';
      showToast(`Successfully joined the ${selectedSportName} spares list! Team captains can now contact you.`, 'success');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Error in handleSubmit', error);
      showToast('Failed to join spares list. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join Spares List
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                onClick={() => window.location.hash = '#/login'}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white"
              >
                Log In
              </Button>
              <Button
                onClick={() => window.location.hash = '#/signup'}
                variant="outline"
                className="border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Join Spares List
        </CardTitle>
        <p className="text-sm text-[#6F6F6F]">
          Join the spares list to be contacted by team captains who need substitute players.
          Your name, phone number, and email will be shared with captains in your selected sport.
        </p>
      </CardHeader>
      <CardContent>
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

          {/* Skill Level */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#6F6F6F] mb-2" htmlFor="skill-level">Your Skill Level *</label>
            <select
              id="skill-level"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              disabled={loading}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
            >
              <option value="">Select your skill level...</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
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

          <Button
            type="submit"
            disabled={loading || !selectedSport || !skillLevel}
            className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white"
          >
            {loading ? 'Joining Spares List...' : 'Join Spares List'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};