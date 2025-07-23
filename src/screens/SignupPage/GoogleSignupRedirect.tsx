import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { SportSkillSelector } from './SportSkillSelector';
import { useToast } from '../../components/ui/toast';

interface SportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

export function GoogleSignupRedirect() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Form steps
  const [currentStep, setCurrentStep] = useState(1);
  const [formCompleted, setFormCompleted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_position: '',
    sports_skills: [] as SportSkill[]
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportSkillError, setSportSkillError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Populate form with user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
        phone: userProfile?.phone || '',
        preferred_position: userProfile?.preferred_position || '',
        sports_skills: userProfile?.user_sports_skills || []
      });
      setInitialLoading(false);
    } else if (!loading) {
      // If no user and not loading, redirect to login
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, loading]);

  // If user already has a complete profile, redirect to teams page
  useEffect(() => {
    if (userProfile && !loading && !initialLoading) {
      // Check if profile is complete - both basic info and sports/skills
      const hasBasicInfo = userProfile.name && userProfile.phone && 
                          userProfile.name.trim() !== '' && userProfile.phone.trim() !== '';
      const hasSportsSkills = userProfile.user_sports_skills && 
                             Array.isArray(userProfile.user_sports_skills) && 
                             userProfile.user_sports_skills.length > 0;
      
      const isComplete = hasBasicInfo && hasSportsSkills;
      
      if (isComplete) {
        setFormCompleted(true);
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/my-account/teams';
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, loading, initialLoading]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      setError('Please fill out all required fields');
      return;
    }
    
    // Validate phone number format
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    
    setError(null);
    setCurrentStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one sport and skill level is selected
    if (!formData.sports_skills || formData.sports_skills.length === 0) {
      setSportSkillError("Please select at least one sport and skill level");
      return;
    }
    
    setSportSkillError(null);
    setError(null);
    setSubmitting(true);
    
    try {
      // First update the basic user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          preferred_position: formData.preferred_position,
          date_modified: new Date().toISOString(),
          user_sports_skills: formData.sports_skills
        })
        .eq('auth_id', user?.id);
      
      if (profileError) throw profileError;
      
      // Refresh the user profile
      await refreshUserProfile();
      setFormCompleted(true);
      showToast('Profile completed successfully!', 'success');
      
      // Redirect based on the complete parameter or go to teams page
      const isCompletion = searchParams.get('complete') === 'true';
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      
      if (redirectPath && redirectPath !== '/my-account/profile' && 
          redirectPath !== '/google-signup-redirect' && redirectPath !== '/complete-profile') {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else if (isCompletion) {
        navigate('/my-account/profile');
      } else {
        navigate('/my-account/teams');
      }
      
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSportSkillChange = (newSportSkills: SportSkill[]) => {
    setFormData({...formData, sports_skills: newSportSkills});
    if (sportSkillError && newSportSkills.length > 0) {
      setSportSkillError(null);
    }
  };

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as ###-###-####
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Handle phone number input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setFormData({...formData, phone: formattedPhone});
  };

  if (loading || initialLoading || !user || formCompleted) {
    return (
      <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
        <p className="text-[#6F6F6F]">{formCompleted ? "Redirecting to your account..." : "Loading your account information..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[560px] bg-white rounded-lg shadow-lg">
        <CardContent className="p-8">
          <h1 className="text-[32px] font-bold text-center mb-8 text-[#6F6F6F]">
            {currentStep === 1 ? "Complete Your Profile" : "Select Your Sports"}
          </h1>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 1 ? 'bg-[#B20000] text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              1
            </div>
            <div className={`h-1 w-16 ${
              currentStep === 2 ? 'bg-[#B20000]' : 'bg-gray-200'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 2 ? 'bg-[#B20000] text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              2
            </div>
          </div>
          
          {currentStep === 1 ? (
            <>
              <div className="mb-6 text-center">
                <p className="text-[#6F6F6F] mb-2">
                  <span className="font-medium">Welcome to Ottawa Fun Sports League!</span>
                </p>
                <p className="text-[#6F6F6F] mb-2">
                  Thanks for signing in with Google! To complete your registration, we need a few more details.
                </p>
                <p className="text-[#6F6F6F]">
                  This information helps us contact you about games, schedule changes, and league updates.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleStep1Submit}>
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[#6F6F6F]"
                  >
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#6F6F6F]"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your email address"
                    className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000] bg-gray-100"
                    value={formData.email}
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Email address is provided by Google and cannot be changed.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-[#6F6F6F]"
                  >
                    Phone Number *
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="###-###-####"
                    className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    maxLength={12} // Limit to formatted length
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We use your phone number for important league communications and emergency contact.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label
                    htmlFor="preferred_position"
                    className="block text-sm font-medium text-[#6F6F6F]"
                  >
                    Preferred Position (Optional)
                  </label>
                  <select
                    id="preferred_position"
                    className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                    value={formData.preferred_position}
                    onChange={(e) => setFormData({...formData, preferred_position: e.target.value})}
                  >
                    <option value="">Select position (optional)</option>
                    <option value="Guard">Guard</option>
                    <option value="Forward">Forward</option>
                    <option value="Center">Center</option>
                  </select>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
                >
                  Continue to Step 2
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <p className="text-[#6F6F6F] mb-2">
                  <span className="font-medium">Tell us about your sports interests</span>
                </p>
                <p className="text-[#6F6F6F]">
                  Select the sports you&apos;re interested in playing and your skill level for each one.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleStep2Submit}>
                <SportSkillSelector 
                  value={formData.sports_skills}
                  onChange={handleSportSkillChange}
                  error={sportSkillError}
                />
                
                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] font-medium text-base"
                  >
                    Back
                  </Button>
                  
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-center text-gray-500 mt-4">
                  By completing your registration, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}