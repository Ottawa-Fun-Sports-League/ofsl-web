import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { createLeaguePayment } from '../../../lib/payments';
import { getDayName, formatLeagueDates, getPrimaryLocation } from '../../../lib/leagues';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';

interface Skill {
  id: number;
  name: string;
  description: string | null;
}

interface TeamRegistrationModalProps {
  showModal: boolean;
  closeModal: () => void;
  leagueId: number;
  leagueName: string;
  league?: any; // Add league prop to get additional details
}

export function TeamRegistrationModal({ 
  showModal, 
  closeModal, 
  leagueId, 
  leagueName,
  league
}: TeamRegistrationModalProps) {
  const [teamName, setTeamName] = useState('');
  const [skillLevelId, setSkillLevelId] = useState<number | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Registration success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredTeamName, setRegisteredTeamName] = useState('');

  useEffect(() => {
    if (showModal) {
      loadSkills();
      setError(null);
    }
  }, [showModal]);

  const loadSkills = async () => {
    try {
      setSkillsLoading(true);
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error loading skills:', error);
      showToast('Failed to load skill levels', 'error');
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    if (!teamName.trim()) {
      showToast('Please enter a team name', 'error');
      return;
    }

    if (!skillLevelId) {
      showToast('Please select a skill level', 'error');
      return;
    }

    // Check if the selected skill level is "Beginner"
    const selectedSkill = skills.find(skill => skill.id === skillLevelId);
    if (selectedSkill && selectedSkill.name === 'Beginner') {
      setError(
        "Thank you for your interest!\n" +
        "We appreciate your enthusiasm for joining our volleyball league. At this time, " +
        "our programs are designed for intermediate to elite level players with advanced " +
        "skills and a strong understanding of the game. Unfortunately, we're not able " +
        "to accept beginner level registrations."
      );
      return;
    }

    if (!userProfile) {
      showToast('User profile not found', 'error');
      return;
    }

    setLoading(true);

    try {
      // Get league information for payment calculation
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('cost')
        .eq('id', leagueId)
        .single();

      if (leagueError) throw leagueError;

      // Create the team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          league_id: leagueId,
          captain_id: userProfile.id,
          skill_level_id: skillLevelId,
          roster: [userProfile.id], // Captain is automatically added to roster
          active: true
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Update user's team_ids array
      const currentTeamIds = userProfile.team_ids || [];
      const updatedTeamIds = [...currentTeamIds, teamData.id];

      const { error: userError } = await supabase
        .from('users')
        .update({ team_ids: updatedTeamIds })
        .eq('id', userProfile.id);

      if (userError) throw userError;

      // Send registration confirmation email
      try {
        const response = await supabase.functions.invoke('send-registration-confirmation', {
          body: {
            email: userProfile.email,
            userName: userProfile.name || 'Team Captain',
            teamName: teamName.trim(),
            leagueName: leagueName
          }
        });

        if (response.error) {
          console.error('Failed to send confirmation email:', response.error);
          // Don't throw error - email failure shouldn't block registration
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Continue with registration flow even if email fails
      }

      // Payment record will be automatically created by database trigger
      if (leagueData?.cost && leagueData.cost > 0) {
        // Show success modal instead of toast
        setRegisteredTeamName(teamName);
        setShowSuccessModal(true);
      } else {
        // Show success modal even for free leagues
        setRegisteredTeamName(teamName);
        setShowSuccessModal(true);
      }

      closeModal();

    } catch (error: any) {
      console.error('Error registering team:', error);
      showToast(error.message || 'Failed to register team', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTeamName('');
    setSkillLevelId(null);
    setError(null);
    closeModal();
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate to My Teams tab with proper routing
    navigate('/my-account/teams');
  };

  if (!showModal && !showSuccessModal) return null;

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Error message */}
              {error && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#6F6F6F]">Unable to Register</h2>
                    <button 
                      onClick={handleClose}
                      className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
                    {error.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                    ))}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleClose}
                      className="bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            
              {!error && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#6F6F6F]">Register Team</h2>
                    <button 
                      onClick={handleClose}
                      className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-[#6F6F6F]">
                      <span className="font-medium">League:</span> {leagueName}
                    </p>
                    {league && (
                      <>
                        {league.day_of_week !== null && (
                          <p className="text-sm text-[#6F6F6F] mt-1">
                            <span className="font-medium">Day:</span> {getDayName(league.day_of_week)}
                          </p>
                        )}
                        {league.gyms && league.gyms.length > 0 && (
                          <p className="text-sm text-[#6F6F6F] mt-1">
                            <span className="font-medium">School:</span> {getPrimaryLocation(league.gyms)}
                          </p>
                        )}
                        {(league.start_date || league.end_date) && (
                          <p className="text-sm text-[#6F6F6F] mt-1">
                            <span className="font-medium">Season:</span> {formatLeagueDates(league.start_date, league.end_date, league.hide_day)}
                          </p>
                        )}
                        {league.cost && (
                          <p className="text-sm text-[#6F6F6F] mt-1">
                            <span className="font-medium">Cost:</span> ${league.cost.toFixed(2)}
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-sm text-[#6F6F6F] mt-1">
                      <span className="font-medium">Captain:</span> {userProfile?.name || 'Current User'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Team Name *
                      </label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter your team name"
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                        Team Skill Level *
                      </label>
                      {skillsLoading ? (
                        <div className="text-sm text-[#6F6F6F]">Loading skill levels...</div>
                      ) : (
                        <select
                          value={skillLevelId || ''}
                          onChange={(e) => setSkillLevelId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                          required
                        >
                          <option value="">Select skill level...</option>
                          {skills.map(skill => (
                            <option 
                              key={skill.id} 
                              value={skill.id} 
                            >
                              {skill.name}
                              {skill.description && ` - ${skill.description}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {league && league.cost && league.cost > 0 && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 font-medium">Registration Information</p>
                          <p className="text-sm text-amber-700 mt-1">
                            To secure your spot in this league, a deposit of $200 or full payment of ${league.cost.toFixed(2)} +HST will be required after registration.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> You will be automatically added as the team captain and first player. 
                        After registration, you can add more players to your team from the "My Teams\" page.
                        Registration fees will be tracked and due within 30 days.
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={loading || skillsLoading}
                        className="flex-1 border-[#B20000] bg-white hover:bg-[#B20000] text-[#B20000] hover:text-white rounded-[10px] px-6 py-2"
                      >
                        {loading ? 'Registering...' : 'Register Team'}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Success Modal */}
      <RegistrationSuccessModal
        showModal={showSuccessModal}
        closeModal={handleSuccessModalClose}
        teamName={registeredTeamName}
        leagueName={leagueName}
        leagueCost={league?.cost || null}
      />
    </>
  );
}