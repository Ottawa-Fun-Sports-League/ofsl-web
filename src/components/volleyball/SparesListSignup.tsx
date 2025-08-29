import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../ui/toast';
import { AlertCircle, Users, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface League {
  id: string;
  name: string;
  sport: string;
  level: string;
}

interface SparesListSignupProps {
  className?: string;
  onSuccess?: () => void;
}

export const SparesListSignup: React.FC<SparesListSignupProps> = ({ 
  className = '', 
  onSuccess 
}) => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [availabilityNotes, setAvailabilityNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [existingRegistrations, setExistingRegistrations] = useState<string[]>([]);

  // Fetch volleyball leagues on component mount
  useEffect(() => {
    const fetchVolleyballLeagues = async () => {
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('id, name, sport, level')
          .eq('sport', 'Volleyball')
          .eq('is_active', true)
          .order('name');

        if (error) {
          logger.error('Error fetching volleyball leagues', error);
          showToast('Failed to load leagues. Please try again.', 'error');
          return;
        }

        setLeagues(data || []);
      } catch (error) {
        logger.error('Error in fetchVolleyballLeagues', error);
        showToast('Failed to load leagues. Please try again.', 'error');
      } finally {
        setLoadingLeagues(false);
      }
    };

    fetchVolleyballLeagues();
  }, [showToast]);

  // Fetch existing spare registrations for this user
  useEffect(() => {
    const fetchExistingRegistrations = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('volleyball_spares')
          .select('league_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) {
          logger.error('Error fetching existing registrations', error);
          return;
        }

        setExistingRegistrations(data?.map(reg => reg.league_id) || []);
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

    if (!selectedLeague) {
      showToast('Please select a league', 'error');
      return;
    }

    if (!skillLevel) {
      showToast('Please select your skill level', 'error');
      return;
    }

    // Check if user already registered for this league
    if (existingRegistrations.includes(selectedLeague)) {
      showToast('You are already registered as a spare for this league', 'error');
      return;
    }

    setLoading(true);

    try {
      // Use the helper function from the migration
      const { error } = await supabase.rpc('register_volleyball_spare', {
        p_user_id: user.id,
        p_league_id: selectedLeague,
        p_skill_level: skillLevel,
        p_availability_notes: availabilityNotes.trim() || null
      });

      if (error) {
        logger.error('Error registering as spare', error);
        showToast('Failed to join spares list. Please try again.', 'error');
        return;
      }

      // Update existing registrations
      setExistingRegistrations(prev => [...prev, selectedLeague]);
      
      // Reset form
      setSelectedLeague('');
      setSkillLevel('');
      setAvailabilityNotes('');

      showToast('Successfully joined the spares list! Team captains can now contact you.', 'success');
      
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
            Join Volleyball Spares List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-[#B20000] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#6F6F6F] mb-2">
              Login Required
            </h3>
            <p className="text-[#6F6F6F] mb-6">
              Please log in to join the volleyball spares list and make your contact information available to team captains.
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
          Join Volleyball Spares List
        </CardTitle>
        <p className="text-sm text-[#6F6F6F]">
          Join the spares list to be contacted by team captains who need substitute players.
          Your name, phone number, and email will be shared with captains in your selected league.
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
                (name, phone, email) with team captains in the selected league. You can 
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
          {/* League Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#6F6F6F] mb-2" htmlFor="league-select">Select League *</label>
            {loadingLeagues ? (
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            ) : (
              <select
                id="league-select"
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                disabled={loading}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent"
              >
                <option value="">Choose a volleyball league...</option>
                {leagues.map((league) => (
                  <option 
                    key={league.id} 
                    value={league.id}
                    disabled={existingRegistrations.includes(league.id)}
                  >
                    {league.name} {league.level && `(${league.level})`}
                    {existingRegistrations.includes(league.id) && ' - Already registered'}
                  </option>
                ))}
              </select>
            )}
          </div>

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
              <option value="competitive">Competitive</option>
              <option value="elite">Elite</option>
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
            disabled={loading || !selectedLeague || !skillLevel}
            className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white"
          >
            {loading ? 'Joining Spares List...' : 'Join Spares List'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};