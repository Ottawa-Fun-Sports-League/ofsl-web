import { useState, FormEvent, useRef, useCallback, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input"; 
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { analyticsEvents } from "../../hooks/useGoogleAnalytics";
import { TurnstileWidget, TurnstileHandle } from "../../components/ui/turnstile";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [expiredLinkMessage, setExpiredLinkMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, setIsNewUser } = useAuth();
  const turnstileRef = useRef<TurnstileHandle>(null);

  // Check for error messages from navigation state or localStorage
  useEffect(() => {
    // Check location state for error messages
    if (location.state?.fromError) {
      setExpiredLinkMessage(location.state.errorMessage || 'Your confirmation link has expired');
    }
    
    // Check localStorage for auth error messages
    const authErrorMessage = localStorage.getItem('auth_error_message');
    const authErrorAction = localStorage.getItem('auth_error_action');
    
    if (authErrorMessage) {
      setExpiredLinkMessage(authErrorMessage);
      // Clear the messages from localStorage
      localStorage.removeItem('auth_error_message');
      localStorage.removeItem('auth_error_action');
    }
  }, [location]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }
    
    if (emailError) {
      setError(emailError);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    // Comprehensive password validation
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }
    
    if (!/\d/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }
    
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      setError("Password must contain at least one special character");
      return;
    }
    
    // Check for Turnstile token only if Turnstile is configured
    const turnstileConfigured = !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (turnstileConfigured && !turnstileToken) {
      setError("Please complete the security verification");
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Create user account with basic info only
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          },
          emailRedirectTo: `${window.location.origin}/#/complete-profile`,
          captchaToken: turnstileToken || undefined
        }
      });
      
      if (authError) {
        if (authError.message.includes('rate limit') || authError.message.includes('Email rate limit exceeded')) {
          setError("Too many signup attempts. Please wait a few minutes before trying again, or contact support if this persists.");
          // Reset CAPTCHA on error
          turnstileRef.current?.reset();
          setTurnstileToken(null);
          return;
        }
        
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          setError("An account with this email already exists. Please try logging in instead.");
          // Reset CAPTCHA on error
          turnstileRef.current?.reset();
          setTurnstileToken(null);
          return;
        }
        
        setError(authError.message);
        // Reset CAPTCHA on error
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }
      
      if (!authData.user || !authData.user.id) {
        setError("Failed to create user account");
        return;
      }

      // Create basic user profile record if it doesn't exist
      try {
        // Generate a unique ID for the user profile using timestamp + random string
        const timestamp = Date.now() / 1000; // Unix timestamp in seconds
        const randomStr = Math.random().toString(36).substring(2, 10);
        const profileId = `${timestamp}_${randomStr}`;
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: profileId,
            auth_id: authData.user.id,
            name: name,
            email: email,
            email_verified: false,
            profile_completed: false,
            date_created: new Date().toISOString(),
            date_modified: new Date().toISOString()
          });
          
        if (profileError && !profileError.message.includes('duplicate key')) {
          logger.error('Error creating user profile', profileError);
        } else if (!profileError) {
          // Profile created successfully, now process any pending team invites
          try {
            logger.info('Processing team invites for new user', {
              profileId,
              email: email.toLowerCase(),
              authId: authData.user.id
            });
            
            // Get the session for the Edge Function call
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              // Call the Edge Function to process signup invites
              const response = await fetch('https://api.ofsl.ca/functions/v1/process-signup-invites', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              logger.info('Edge Function response status', { status: response.status });
              
              if (response.ok) {
                const result = await response.json();
                logger.info('Edge Function result', result);
                
                if (result.processedCount > 0) {
                  // Store a flag to show notification later
                  sessionStorage.setItem('signup_teams_added', JSON.stringify(result.teams));
                }
              } else {
                const errorText = await response.text();
                logger.error('Edge Function error response', undefined, { response: errorText });
              }
            } else {
              logger.warn('No session available for processing invites');
            }
          } catch (inviteError) {
            logger.error('Error processing team invites', inviteError);
            // Don't fail signup if invite processing fails
          }
        }
      } catch (profileError) {
        logger.error('Error creating user profile', profileError);
        // Continue anyway, profile creation can be handled later
      }
      
      // Mark user as new for profile completion flow
      setIsNewUser(true);
      
      // Track successful signup
      analyticsEvents.signUp();
      
      // Navigate to confirmation page
      navigate('/signup-confirmation', {
        state: { 
          email: email
        } 
      });
      
    } catch (err) {
      logger.error("Unexpected error during signup", err);
      setError("An unexpected error occurred. Please try again later.");
      // Reset CAPTCHA on error
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    
    try {
      // Mark user as new for Google sign-ups
      setIsNewUser(true);
      
      const { error } = await signInWithGoogle();
      
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
      // The redirect will happen automatically via the Google OAuth flow
    } catch (err) {
      setError("An unexpected error occurred");
      logger.error('Error during Google sign up', err);
      setGoogleLoading(false);
    }
  };

  // Check if email already exists
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    try {
      setEmailChecking(true);
      setEmailError(null);
      
      // Check public.users table for existing email
      const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);
        
      if (publicError) {
        logger.error('Error checking public users', publicError);
      }
      
      if (publicUsers && publicUsers.length > 0) {
        setEmailError('An account with this email already exists');
      }
      
    } catch (error) {
      logger.error('Error checking email', error);
    } finally {
      setEmailChecking(false);
    }
  };

  // Stable callbacks for Turnstile
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setError("Security verification failed. Please try again.");
    setTurnstileToken(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  return (
    <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[560px] bg-white rounded-lg shadow-lg">
        <CardContent className="p-8">
          <h1 className="text-[32px] font-bold text-center mb-8 text-[#6F6F6F]">
            Create Account
          </h1>
          
          {expiredLinkMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-800 font-medium">{expiredLinkMessage}</p>
                  <p className="text-amber-700 text-sm mt-1">
                    Please sign up again to receive a new confirmation email.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Google Sign Up Button */}
          <Button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-[#6F6F6F] border border-[#D4D4D4] rounded-[10px] font-medium text-base mb-6 flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              "Signing up with Google..."
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D4D4D4]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#6F6F6F]">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#6F6F6F]"
              >
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={`w-full h-12 px-4 rounded-lg border ${
                    emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]'
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => checkEmailExists(email)}
                  required
                />
                {emailChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#6F6F6F]"
              >
                Password (minimum 12 characters)
              </label>
              
              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• At least 12 characters long</li>
                  <li>• Contains at least one uppercase letter (A-Z)</li>
                  <li>• Contains at least one lowercase letter (a-z)</li>
                  <li>• Contains at least one number (0-9)</li>
                  <li>• Contains at least one special character (!@#$%^&*)</li>
                </ul>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 12 characters)"
                  className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#6F6F6F]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Turnstile widget */}
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center my-4">
                <TurnstileWidget 
                  ref={turnstileRef}
                  onVerify={handleTurnstileVerify}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileExpire}
                />
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
              disabled={loading || googleLoading || (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <span className="text-[#6F6F6F]">Already have an account? </span>
            <Link to="/login" className="text-[#B20000] hover:underline font-bold">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}