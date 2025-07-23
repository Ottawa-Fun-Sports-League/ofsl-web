import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { supabase } from '../../../lib/supabase';
import { Trash2, Plus } from 'lucide-react';

interface SportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

interface Sport {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
  description?: string;
}

export function CompleteProfilePage() {
  const { userProfile, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [userSportsSkills, setUserSportsSkills] = useState<SportSkill[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load sports and skills data
  useEffect(() => {
    const loadSportsAndSkills = async () => {
      try {
        setLoading(true);
        
        // Load sports and skills in parallel
        const [sportsResponse, skillsResponse] = await Promise.all([
          supabase.from('sports').select('id, name').eq('active', true).order('name'),
          supabase.from('skills').select('id, name, description').order('order_index')
        ]);
        
        if (sportsResponse.error) throw sportsResponse.error;
        if (skillsResponse.error) throw skillsResponse.error;
        
        setSports(sportsResponse.data || []);
        setSkills(skillsResponse.data || []);
        
        // Initialize with existing user sports skills or empty array
        const existingSportsSkills = userProfile?.user_sports_skills || [];
        if (existingSportsSkills.length > 0) {
          const enrichedSportsSkills = existingSportsSkills.map((item: SportSkill) => {
            const sport = sportsResponse.data?.find(s => s.id === item.sport_id);
            const skill = skillsResponse.data?.find(s => s.id === item.skill_id);
            
            return {
              ...item,
              sport_name: sport?.name,
              skill_name: skill?.name
            };
          });
          setUserSportsSkills(enrichedSportsSkills);
        } else {
          // Start with one empty entry if no existing data
          if (sportsResponse.data && sportsResponse.data.length > 0 && 
              skillsResponse.data && skillsResponse.data.length > 0) {
            setUserSportsSkills([{
              sport_id: sportsResponse.data[0].id,
              skill_id: skillsResponse.data[0].id,
              sport_name: sportsResponse.data[0].name,
              skill_name: skillsResponse.data[0].name
            }]);
          }
        }
      } catch (error) {
        console.error('Error loading sports and skills:', error);
        showToast('Failed to load sports and skills data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadSportsAndSkills();
  }, [userProfile, showToast]);

  const handleAddSport = () => {
    // Find first available sport not already selected
    const selectedSportIds = userSportsSkills.map(item => item.sport_id);
    const availableSport = sports.find(sport => !selectedSportIds.includes(sport.id));
    
    if (availableSport && skills.length > 0) {
      const newEntry: SportSkill = {
        sport_id: availableSport.id,
        skill_id: skills[0].id,
        sport_name: availableSport.name,
        skill_name: skills[0].name
      };
      setUserSportsSkills([...userSportsSkills, newEntry]);
    }
  };

  const handleRemoveSport = (index: number) => {
    const newSportsSkills = [...userSportsSkills];
    newSportsSkills.splice(index, 1);
    setUserSportsSkills(newSportsSkills);
  };

  const handleSportChange = (index: number, sportId: number) => {
    const sport = sports.find(s => s.id === sportId);
    const newSportsSkills = [...userSportsSkills];
    newSportsSkills[index] = {
      ...newSportsSkills[index],
      sport_id: sportId,
      sport_name: sport?.name
    };
    setUserSportsSkills(newSportsSkills);
  };

  const handleSkillChange = (index: number, skillId: number) => {
    const skill = skills.find(s => s.id === skillId);
    const newSportsSkills = [...userSportsSkills];
    newSportsSkills[index] = {
      ...newSportsSkills[index],
      skill_id: skillId,
      skill_name: skill?.name
    };
    setUserSportsSkills(newSportsSkills);
  };

  const handleSave = async () => {
    if (!userProfile) {
      showToast('User profile not found', 'error');
      return;
    }

    if (userSportsSkills.length === 0) {
      showToast('Please add at least one sport and skill level', 'error');
      return;
    }

    setSaving(true);
    try {
      // Remove sport_name and skill_name before saving (they're not stored in DB)
      const sportsSkillsToSave = userSportsSkills.map((item) => {
        const { sport_name: _sport_name, skill_name: _skill_name, ...rest } = item;
        return rest;
      });
      
      const { error } = await supabase
        .from('users')
        .update({
          user_sports_skills: sportsSkillsToSave,
          date_modified: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      await refreshUserProfile();
      showToast('Sports and skill levels saved successfully!', 'success');
      
      // Redirect based on the complete parameter or go to teams page
      const isCompletion = searchParams.get('complete') === 'true';
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      
      if (redirectPath && redirectPath !== '/my-account/profile') {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else if (isCompletion) {
        navigate('/my-account/teams');
      } else {
        navigate('/my-account/profile');
      }
    } catch (error) {
      console.error('Error saving sports and skills:', error);
      showToast('Failed to save sports and skill levels', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipForNow = () => {
    // Allow users to skip this step and go to their account
    const redirectPath = localStorage.getItem('redirectAfterLogin');
    
    if (redirectPath && redirectPath !== '/my-account/profile') {
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } else {
      navigate('/my-account/teams');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
          <p className="text-[#6F6F6F]">Loading sports and skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#6F6F6F] mb-2">
              Complete Your Sports Profile
            </h1>
            <p className="text-[#6F6F6F] max-w-2xl mx-auto">
              Help us understand your sports interests and skill levels to find the best leagues and teams for you.
            </p>
          </div>

          {/* Sports and Skills Form */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#6F6F6F]">
                Sports & Skill Levels
              </h2>
              <Button
                onClick={handleAddSport}
                disabled={userSportsSkills.length >= sports.length}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Sport
              </Button>
            </div>

            {userSportsSkills.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#6F6F6F] mb-4">No sports added yet.</p>
                <Button
                  onClick={handleAddSport}
                  className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-6 py-2"
                >
                  Add Your First Sport
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userSportsSkills.map((sportSkill, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-[#6F6F6F]">
                        Sport {index + 1}
                      </h3>
                      {userSportsSkills.length > 1 && (
                        <Button
                          onClick={() => handleRemoveSport(index)}
                          className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-2 h-8 w-8 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                          Sport
                        </label>
                        <select
                          value={sportSkill.sport_id}
                          onChange={(e) => handleSportChange(index, parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000] focus:outline-none"
                        >
                          {sports.map(sport => (
                            <option 
                              key={sport.id} 
                              value={sport.id}
                              disabled={userSportsSkills.some((item, i) => 
                                i !== index && item.sport_id === sport.id
                              )}
                            >
                              {sport.name}
                              {userSportsSkills.some((item, i) => 
                                i !== index && item.sport_id === sport.id
                              ) ? ' (Already selected)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                          Skill Level
                        </label>
                        <select
                          value={sportSkill.skill_id}
                          onChange={(e) => handleSkillChange(index, parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000] focus:outline-none"
                        >
                          {skills.map(skill => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name}
                              {skill.description ? ` - ${skill.description}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <Button
                onClick={handleSave}
                disabled={saving || userSportsSkills.length === 0}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-8 py-3 flex-1 sm:flex-none"
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
              
              <Button
                onClick={handleSkipForNow}
                className="bg-gray-200 hover:bg-gray-300 text-[#6F6F6F] rounded-lg px-8 py-3 flex-1 sm:flex-none"
              >
                Skip for Now
              </Button>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> You can add multiple sports and update your skill levels anytime from your profile page. 
                    This information helps us match you with appropriate leagues and teams.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

