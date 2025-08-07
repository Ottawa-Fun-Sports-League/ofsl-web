import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { getUserIpAddress } from "../../lib/ipUtils";
import { Loader2, CheckCircle, FileText } from "lucide-react";
import { SportsSkillsSelector, SportSkill } from "../../components/SportsSkillsSelector";
import { useToast } from "../../components/ui/toast";
import { logger } from "../../lib/logger";

// SportSkill is now imported from SportsSkillsSelector

export function ProfileCompletionPage() {
  // Use auth hook but manage loading states more carefully
  const { user, userProfile, loading, refreshUserProfile, setIsNewUser } =
    useAuth();
  const [_searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    sports_skills: [] as SportSkill[],
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportSkillError, setSportSkillError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [activeWaiver, setActiveWaiver] = useState<{
    id: number;
    title: string;
    content: string;
    version: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string | null;
  } | null>(null);
  const [_waiverLoading, setWaiverLoading] = useState(true);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [waiverError, setWaiverError] = useState<string | null>(null);

  // Check if user is logged in
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/#/login";
      return;
    }

    if (user) {
      // Check email verification status
      const isEmailVerified = user.email_confirmed_at != null;
      setEmailVerified(isEmailVerified);

      // For Google users, we'll be more lenient with email verification
      // since Google emails are typically pre-verified
      const isGoogleUser = user.app_metadata?.provider === "google";

      if (!isEmailVerified && !isGoogleUser) {
        // Email not verified for non-Google users, redirect to confirmation page
        window.location.href = "/#/signup-confirmation";
        return;
      }

      // Populate form with existing user data
      setFormData({
        name:
          userProfile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "",
        phone: userProfile?.phone || "",
        sports_skills: userProfile?.user_sports_skills || [],
      });
      setInitialLoading(false);
    }
  }, [user, userProfile, loading, navigate]);

  // Load active waiver
  useEffect(() => {
    const loadActiveWaiver = async () => {
      try {
        setWaiverLoading(true);
        const { data, error } = await supabase
          .from('waivers')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error) {
          logger.error('Error loading active waiver', error);
          // If no active waiver, that's okay - just continue without it
        } else {
          setActiveWaiver(data);
        }
      } catch (err) {
        logger.error('Error loading waiver', err);
      } finally {
        setWaiverLoading(false);
      }
    };

    loadActiveWaiver();
  }, []);

  // Check if profile is already complete - but be more lenient
  useEffect(() => {
    if (userProfile && !loading && !initialLoading) {
      const hasBasicInfo =
        userProfile.name &&
        userProfile.phone &&
        userProfile.name.trim() !== "" &&
        userProfile.phone.trim() !== "";
      const hasSportsSkills =
        userProfile.user_sports_skills &&
        Array.isArray(userProfile.user_sports_skills) &&
        userProfile.user_sports_skills.length > 0;

      // Only redirect if profile is truly complete AND marked as completed
      if (
        hasBasicInfo &&
        hasSportsSkills &&
        userProfile.profile_completed === true
      ) {
        const redirectPath =
          localStorage.getItem("redirectAfterLogin") || "/my-account/teams";
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = "#" + redirectPath;
      }
    }
  }, [userProfile, loading, initialLoading, navigate]);

  // Removed unused _processPendingInvites function

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.phone) {
      setError("Please fill out all required fields");
      return;
    }

    // Validate phone number format
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate that at least one sport and skill level is selected
    if (!formData.sports_skills || formData.sports_skills.length === 0) {
      setSportSkillError("Please select at least one sport and skill level");
      return;
    }

    // Validate waiver acceptance if there's an active waiver
    if (activeWaiver && !waiverAccepted) {
      setWaiverError("Please accept the waiver to continue");
      return;
    }

    setSportSkillError(null);
    setWaiverError(null);
    setError(null);
    setSubmitting(true);

    try {
      // Update user profile with complete information
      const { error: profileError } = await supabase
        .from("users")
        .update({
          name: formData.name,
          phone: formData.phone,
          user_sports_skills: formData.sports_skills,
          profile_completed: true,
          email_verified: true,
          waiver_accepted: activeWaiver ? true : false,
          date_modified: new Date().toISOString(),
        })
        .eq("auth_id", user?.id);

      if (profileError) {
        // Check if it's a duplicate phone number error
        if (profileError.code === '23505' && profileError.message.includes('phone')) {
          throw new Error('The phone number you are trying to use has already been used by another user, please enter another phone number');
        }
        throw profileError;
      }

      // Record waiver acceptance if there's an active waiver
      if (activeWaiver && waiverAccepted && user?.id) {
        // Get the user's database ID using their auth_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (userError) {
          console.error('Error getting user ID:', userError);
        } else if (userData) {
          const userIp = await getUserIpAddress();
          const { error: acceptanceError } = await supabase
            .from('waiver_acceptances')
            .insert({
              user_id: userData.id,
              waiver_id: activeWaiver.id,
              accepted_at: new Date().toISOString(),
              ip_address: userIp,
              user_agent: navigator.userAgent,
            });

          if (acceptanceError) {
            console.error('Error recording waiver acceptance:', acceptanceError);
            // Don't fail the whole process if waiver recording fails
          }
        }
      }

      // Refresh the user profile
      await refreshUserProfile();
      
      // Small delay to ensure auth state is fully propagated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Process any pending team invites for this user
      try {
        // Get the user's database ID first
        const { data: currentUserData, error: userDataError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user?.id)
          .single();
        
        if (userDataError || !currentUserData) {
          console.error('Error getting user data for invites:', userDataError);
          showToast("Profile completed successfully!", "success");
          return;
        }
        
        // Processing invites for user
        
        // First try using the database function
        const { data: inviteResult, error: inviteError } = await supabase
          .rpc('process_user_team_invites', { p_user_id: currentUserData.id });
        
        // Database function result processed
        
        if (!inviteError && inviteResult?.success && inviteResult.processed_count > 0) {
          const teams = inviteResult.teams.join(', ');
          showToast(`Profile completed! You've been added to: ${teams}`, "success");
          // Store for welcome message
          sessionStorage.setItem('signup_teams_added', JSON.stringify(inviteResult.teams));
        } else {
          // Fallback: Try the Edge Function as well
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              const response = await fetch('https://api.ofsl.ca/functions/v1/process-signup-invites', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              if (response.ok) {
                const result = await response.json();
                if (result.processedCount > 0) {
                  sessionStorage.setItem('signup_teams_added', JSON.stringify(result.teams));
                  showToast(`Profile completed! You've been added to: ${result.teams.join(', ')}`, "success");
                } else {
                  showToast("Profile completed successfully!", "success");
                }
              } else {
                showToast("Profile completed successfully!", "success");
              }
            } else {
              showToast("Profile completed successfully!", "success");
            }
          } catch (edgeFuncError) {
            console.error('Error calling Edge Function:', edgeFuncError);
            showToast("Profile completed successfully!", "success");
          }
        }
      } catch (error) {
        // If invite processing fails, still show success for profile completion
        console.error('Error processing team invites:', error);
        showToast("Profile completed successfully!", "success");
      }

      // Clear the new user flag since profile is now complete
      setIsNewUser(false);

      // Redirect to intended page or teams page
      const redirectPath =
        localStorage.getItem("redirectAfterLogin") || "/my-account/teams";
      localStorage.removeItem("redirectAfterLogin");
      window.location.href = "#" + redirectPath;
    } catch (err) {
      console.error("Error completing profile:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to complete profile";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSportSkillChange = (newSportSkills: SportSkill[]) => {
    setFormData({ ...formData, sports_skills: newSportSkills });
    if (sportSkillError && newSportSkills.length > 0) {
      setSportSkillError(null);
    }
  };

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, "");

    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formattedPhone });
  };

  // Add loading state management to prevent infinite loader
  const [componentLoading, setComponentLoading] = useState(true);

  // Handle component initialization
  useEffect(() => {
    // Set a timeout to prevent infinite loader
    const timer = setTimeout(() => {
      setComponentLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading if still initializing component
  if (componentLoading) {
    return (
      <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
        <p className="text-[#6F6F6F]">Loading profile completion...</p>
      </div>
    );
  }

  // Show loading if still loading or no user
  if (loading || initialLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
        <p className="text-[#6F6F6F]">Loading your account information...</p>
      </div>
    );
  }

  // For Google users, don't require email verification to show the page
  const isGoogleUser = user.app_metadata?.provider === "google";
  if (!emailVerified && !isGoogleUser) {
    return (
      <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
        <p className="text-[#6F6F6F]">Verifying your email...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[560px] bg-white rounded-lg shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-[32px] font-bold text-[#6F6F6F] mb-2">
              Complete Your Profile
            </h1>
            <p className="text-lg text-[#6F6F6F] mb-2">
              Welcome to Ottawa Fun Sports League!
            </p>
            <p className="text-[#6F6F6F]">
              Please complete your profile to finish setting up your account.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
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
                maxLength={12}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                We use your phone number for important league communications and
                emergency contact.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>NOTE:</strong> Only one phone number per account
              </p>
            </div>

            <div className="space-y-2">
              <SportsSkillsSelector
                value={formData.sports_skills}
                onChange={handleSportSkillChange}
                error={sportSkillError}
                showTitle={false}
              />
            </div>

            {/* Waiver Section */}
            {activeWaiver && (
              <div className="space-y-4">
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-[#B20000]" />
                    <h3 className="text-lg font-semibold text-[#6F6F6F]">
                      {activeWaiver.title}
                    </h3>
                  </div>
                  
                  <div className="bg-gray-50 border rounded-lg p-4 max-h-60 overflow-y-auto mb-4">
                    <div 
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: activeWaiver.content }}
                    />
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="waiver-acceptance"
                      checked={waiverAccepted}
                      onChange={(e) => {
                        setWaiverAccepted(e.target.checked);
                        if (e.target.checked && waiverError) {
                          setWaiverError(null);
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
                    />
                    <label htmlFor="waiver-acceptance" className="text-sm text-[#6F6F6F] cursor-pointer">
                      I have read and agree to the terms and conditions outlined in this waiver *
                    </label>
                  </div>
                  
                  {waiverError && (
                    <div className="mt-2 text-sm text-red-600">
                      {waiverError}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 mt-4">
              By completing your profile, you agree to our Terms of Service and
              Privacy Policy.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

